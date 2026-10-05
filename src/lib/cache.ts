import Redis from "ioredis";

// Global singleton to prevent connection leaks during Next.js hot reload
const globalForRedis = global as unknown as {
  redisClient: Redis | null;
};

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL || process.env.VALKEY_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      enableOfflineQueue: true,
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      },
    });

    client.on("error", (err) => {
      // Graceful error logging - prevent unhandled error event crash
      console.warn("[Cache Client Error]", err?.message || err);
    });

    return client;
  } catch (err) {
    console.warn("[Cache Warning] Failed to initialize Redis client:", err);
    return null;
  }
}

export function getRedisClient(): Redis | null {
  const client = globalForRedis.redisClient;
  if (!client || client.status === "end") {
    globalForRedis.redisClient = createRedisClient();
  }
  return globalForRedis.redisClient;
}

export const redis = getRedisClient();

/**
 * Graceful cache wrapper with fallback to direct DB fetcher.
 * Zero-crash invariant: if Redis fails or is unreachable, silently fallback to DB fetcher.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // In unit test environment, bypass cache unless explicitly enabled to avoid mock pollution
  if (process.env.NODE_ENV === "test" && !process.env.ENABLE_CACHE_IN_TEST) {
    return await fetcher();
  }

  let client: Redis | null = null;
  try {
    client = getRedisClient();
    if (client) {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    }
  } catch (err) {
    console.warn(`[Cache Warning] Key ${key} failed, falling back to DB:`, err);
  }

  // Fallback to real DB query
  const data = await fetcher();

  try {
    if (client && data !== undefined && data !== null) {
      await client.setex(key, ttlSeconds, JSON.stringify(data));
    }
  } catch (err) {
    /* silent fail */
  }

  return data;
}

/**
 * Invalidate a single cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (client) {
      await client.del(key);
    }
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete cache key ${key}:`, err);
  }
}

/**
 * Invalidate cache keys matching a pattern (e.g. "shift-duties:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (client) {
      const keys = await client.keys(pattern);
      if (keys && keys.length > 0) {
        await client.del(...keys);
      }
    }
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete cache pattern ${pattern}:`, err);
  }
}
