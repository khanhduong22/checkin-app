import { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { AppEnv } from "./auth.middleware";
import { getClientIP } from "../lib/ip-utils";
import { verifyAccessToken } from "../lib/auth";
import { getRedisClient } from "../lib/cache";

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local clearBefore = now - windowMs

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, windowMs)
    local remaining = limit - currentCount - 1
    local retryAfter = math.ceil(windowMs / 1000)
    return { 1, remaining, retryAfter }
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = 1
    if oldest and #oldest >= 2 then
        local oldestScore = tonumber(oldest[2])
        retryAfter = math.ceil((oldestScore + windowMs - now) / 1000)
        if retryAfter < 1 then retryAfter = 1 end
    else
        retryAfter = math.ceil(windowMs / 1000)
    end
    return { 0, 0, retryAfter }
end
`;

interface MemoryRateLimitEntry {
  timestamps: number[];
}

const memoryRateLimitStore = new Map<string, MemoryRateLimitEntry>();

export function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const clearBefore = now - windowMs;

  let entry = memoryRateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryRateLimitStore.set(key, entry);
  }

  // Filter out timestamps outside sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > clearBefore);

  if (entry.timestamps.length < limit) {
    entry.timestamps.push(now);
    const remaining = limit - entry.timestamps.length;
    const retryAfter = Math.ceil(windowMs / 1000);
    return { allowed: true, remaining, retryAfter };
  } else {
    const oldest = entry.timestamps[0] || now;
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }
}

/**
 * Periodically purge stale entries from memory store
 */
function cleanupMemoryStoreIfNeeded(): void {
  if (memoryRateLimitStore.size > 2000) {
    const now = Date.now();
    for (const [k, v] of memoryRateLimitStore.entries()) {
      v.timestamps = v.timestamps.filter((ts) => ts > now - 120_000);
      if (v.timestamps.length === 0) {
        memoryRateLimitStore.delete(k);
      }
    }
  }
}

/**
 * Evaluate rate limit using Valkey sliding window with memory fallback.
 */
export async function evaluateRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const client = getRedisClient();

  if (client) {
    try {
      const now = Date.now();
      const member = `${now}:${Math.random().toString(36).substring(2, 9)}`;
      const res = (await client.eval(
        LUA_SLIDING_WINDOW,
        1,
        key,
        now.toString(),
        windowMs.toString(),
        limit.toString(),
        member
      )) as [number, number, number];

      if (Array.isArray(res) && res.length >= 3) {
        return {
          allowed: res[0] === 1,
          remaining: Math.max(0, Number(res[1])),
          retryAfter: Math.max(1, Number(res[2])),
        };
      }
    } catch (err) {
      console.warn(`[RateLimit Valkey Error, falling back to memory] Key ${key}:`, err);
    }
  }

  cleanupMemoryStoreIfNeeded();
  return checkMemoryRateLimit(key, limit, windowMs);
}

export interface RateLimiterOptions {
  limit: number;
  windowMs?: number; // default: 60,000 (1 minute)
  prefix?: string;
  keyGenerator?: (c: Context<AppEnv>) => string | Promise<string>;
  message?: string;
}

/**
 * Reusable Rate Limiting Middleware Factory.
 */
export function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler<AppEnv> {
  const {
    limit,
    windowMs = 60_000,
    prefix = "rl",
    keyGenerator = (c) => `ip:${getClientIP(c)}`,
    message = "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
  } = options;

  return async (c, next) => {
    const rawKey = await keyGenerator(c);
    const fullKey = `ratelimit:${prefix}:${rawKey}`;

    const { allowed, remaining, retryAfter } = await evaluateRateLimit(
      fullKey,
      limit,
      windowMs
    );

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("Retry-After", String(retryAfter));

    if (!allowed) {
      return c.json(
        {
          success: false,
          error: "TOO_MANY_REQUESTS",
          message,
          retryAfter,
        },
        429
      );
    }

    await next();
  };
}

/**
 * Key generator for User or IP identifier.
 */
export async function getRateLimitUserOrIpKey(c: Context<AppEnv>): Promise<string> {
  try {
    const user = c.get("user");
    if (user?.sub) return `user:${user.sub}`;
  } catch {}

  const authHeader = c.req.header("Authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && candidate !== "cookie_session") {
      token = candidate;
    }
  }
  if (!token) {
    token = getCookie(c, "access_token") || null;
  }

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        return `user:${payload.sub}`;
      }
    } catch {}
  }

  return `ip:${getClientIP(c)}`;
}

/**
 * Key generator for User-specific identifier.
 */
export async function getRateLimitUserKey(c: Context<AppEnv>): Promise<string> {
  try {
    const user = c.get("user");
    if (user?.sub) return `user:${user.sub}`;
  } catch {}

  const authHeader = c.req.header("Authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && candidate !== "cookie_session") {
      token = candidate;
    }
  }
  if (!token) {
    token = getCookie(c, "access_token") || null;
  }

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      if (payload?.sub) {
        return `user:${payload.sub}`;
      }
    } catch {}
  }

  return `user:${getClientIP(c)}`;
}

// 1. Auth routes (/api/auth/*): max 15 requests per minute per IP
export const authRateLimiter = createRateLimiter({
  limit: 15,
  windowMs: 60_000,
  prefix: "auth",
  keyGenerator: (c) => `ip:${getClientIP(c)}`,
  message: "Quá nhiều yêu cầu xác thực từ IP này. Vui lòng thử lại sau 1 phút.",
});

// 2. Check-in routes (/api/checkins): max 20 requests per minute per user/IP
export const checkinRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60_000,
  prefix: "checkin",
  keyGenerator: getRateLimitUserOrIpKey,
  message: "Quá nhiều thao tác chấm công. Vui lòng thử lại sau 1 phút.",
});

// 3. Lucky wheel spin (/api/lucky-wheel/spin): max 5 requests per minute per user
export const luckyWheelRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60_000,
  prefix: "lucky-wheel",
  keyGenerator: getRateLimitUserKey,
  message: "Quá giới hạn quay thưởng (tối đa 5 lượt/phút). Vui lòng thử lại sau.",
});

/**
 * Reset memory store (test helper)
 */
export function _resetRateLimits(): void {
  memoryRateLimitStore.clear();
}
