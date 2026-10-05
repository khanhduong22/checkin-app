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
 * Invalidate cache keys matching a pattern (e.g. "shift-duties:*") using non-blocking scanStream
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    if (typeof client.scanStream !== "function") {
      // Fallback if scanStream is not available
      if (typeof client.keys === "function") {
        const keys = await client.keys(pattern);
        if (keys && keys.length > 0) {
          await client.del(...keys);
        }
      }
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const stream = client.scanStream({ match: pattern, count: 100 });
      const pipelinePromises: Promise<unknown>[] = [];

      stream.on("data", (keys: string[]) => {
        if (keys && keys.length > 0) {
          const pipeline = client.pipeline();
          pipeline.del(...keys);
          pipelinePromises.push(pipeline.exec());
        }
      });

      stream.on("end", async () => {
        try {
          await Promise.all(pipelinePromises);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete cache pattern ${pattern}:`, err);
  }
}

/**
 * Invalidate shift duties and upcoming shifts cache
 */
export async function invalidateShiftDutyCache(userId?: string, shiftId?: number): Promise<void> {
  try {
    await invalidateCachePattern("shift-duties:*");
    await invalidateCachePattern("shifts:*");
  } catch (e) {
    console.warn("[Cache Warning] Failed to invalidate shift duty cache:", e);
  }
}
