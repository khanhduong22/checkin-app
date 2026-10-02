import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || process.env.VALKEY_URL;
  if (!redisUrl) return null;

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on("error", (err) => {
      console.warn("[Cache Client Warning]", err?.message || err);
    });

    return redisClient;
  } catch (err) {
    console.warn("[Cache Client Init Error]", err);
    return null;
  }
}

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const client = getRedisClient();

  if (client) {
    try {
      const cached = await client.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Fallback directly to DB
    }
  }

  const data = await fetcher();

  if (client && data !== undefined && data !== null) {
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(data));
    } catch {
      // Ignore cache write error
    }
  }

  return data;
}

export async function checkCacheHealth(): Promise<"connected" | "disconnected"> {
  const client = getRedisClient();
  if (!client) return "disconnected";
  try {
    const pong = await client.ping();
    return pong === "PONG" ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}
