import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Cache Module (Valkey / Redis)", () => {
  beforeEach(() => {
    vi.resetModules();
    (global as any).redisClient = null;
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.ENABLE_CACHE_IN_TEST = "true";
  });

  it("calls fetcher and returns data when Redis has no cached key", async () => {
    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          get = vi.fn().mockResolvedValue(null);
          setex = vi.fn().mockResolvedValue("OK");
          on = vi.fn();
        },
      };
    });

    const { getOrSetCache } = await import("@/lib/cache");
    const fetcher = vi.fn().mockResolvedValue({ id: 1, name: "Test Shift" });

    const result = await getOrSetCache("test:key", 60, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 1, name: "Test Shift" });
  });

  it("returns cached value from Redis when available without calling fetcher", async () => {
    const cachedData = { id: 2, name: "Cached Shift" };
    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          get = vi.fn().mockResolvedValue(JSON.stringify(cachedData));
          setex = vi.fn();
          on = vi.fn();
        },
      };
    });

    const { getOrSetCache } = await import("@/lib/cache");
    const fetcher = vi.fn().mockResolvedValue({ id: 99, name: "Fresh" });

    const result = await getOrSetCache("test:cached", 60, fetcher);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  it("gracefully falls back to fetcher when Redis.get throws an error (zero-crash invariant)", async () => {
    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          get = vi.fn().mockRejectedValue(new Error("Connection timeout"));
          setex = vi.fn().mockRejectedValue(new Error("Cannot write"));
          on = vi.fn();
        },
      };
    });

    const { getOrSetCache } = await import("@/lib/cache");
    const fetcher = vi.fn().mockResolvedValue({ id: 3, name: "Fallback Shift" });

    const result = await getOrSetCache("test:error", 60, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 3, name: "Fallback Shift" });
  });

  it("gracefully invalidates cache keys and patterns without crashing", async () => {
    const delMock = vi.fn().mockResolvedValue(1);
    const keysMock = vi.fn().mockResolvedValue(["key:1", "key:2"]);

    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          get = vi.fn();
          setex = vi.fn();
          del = delMock;
          keys = keysMock;
          on = vi.fn();
        },
      };
    });

    const { invalidateCache, invalidateCachePattern } = await import("@/lib/cache");

    await expect(invalidateCache("key:1")).resolves.not.toThrow();
    expect(delMock).toHaveBeenCalledWith("key:1");

    await expect(invalidateCachePattern("key:*")).resolves.not.toThrow();
    expect(keysMock).toHaveBeenCalledWith("key:*");
    expect(delMock).toHaveBeenCalledWith("key:1", "key:2");
  });
});
