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

  it("gracefully invalidates cache keys and patterns using scanStream and pipeline without crashing", async () => {
    const delMock = vi.fn().mockResolvedValue(1);
    const pipelineExecMock = vi.fn().mockResolvedValue([]);
    const pipelineDelMock = vi.fn();
    const pipelineMock = vi.fn().mockReturnValue({
      del: pipelineDelMock,
      exec: pipelineExecMock,
    });

    const scanStreamMock = vi.fn().mockImplementation(() => {
      const { EventEmitter } = require("events");
      const emitter = new EventEmitter();
      setTimeout(() => {
        emitter.emit("data", ["key:1", "key:2"]);
        emitter.emit("end");
      }, 10);
      return emitter;
    });

    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          get = vi.fn();
          setex = vi.fn();
          del = delMock;
          scanStream = scanStreamMock;
          pipeline = pipelineMock;
          on = vi.fn();
        },
      };
    });

    const { invalidateCache, invalidateCachePattern } = await import("@/lib/cache");

    await expect(invalidateCache("key:1")).resolves.not.toThrow();
    expect(delMock).toHaveBeenCalledWith("key:1");

    await expect(invalidateCachePattern("key:*")).resolves.not.toThrow();
    expect(scanStreamMock).toHaveBeenCalledWith({ match: "key:*", count: 100 });
    expect(pipelineMock).toHaveBeenCalled();
    expect(pipelineDelMock).toHaveBeenCalledWith("key:1", "key:2");
    expect(pipelineExecMock).toHaveBeenCalled();
  });

  it("recreates Redis client if existing client status is 'end'", async () => {
    let instanceCount = 0;
    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          status = "ready";
          constructor() {
            instanceCount++;
          }
          on = vi.fn();
        },
      };
    });

    const { getRedisClient } = await import("@/lib/cache");
    const client1 = getRedisClient();
    expect(instanceCount).toBe(1);

    // Same client reused while alive
    const client2 = getRedisClient();
    expect(client2).toBe(client1);
    expect(instanceCount).toBe(1);

    // Simulate connection ended/killed
    if (client1) {
      (client1 as any).status = "end";
    }

    // Must recreate client
    const client3 = getRedisClient();
    expect(client3).not.toBe(client1);
    expect(instanceCount).toBe(2);
  });

  it("initializes Redis with enableOfflineQueue: true and resilient retryStrategy", async () => {
    let capturedOptions: any = null;
    vi.doMock("ioredis", () => {
      return {
        default: class MockRedis {
          status = "ready";
          constructor(_url: string, options: any) {
            capturedOptions = options;
          }
          on = vi.fn();
        },
      };
    });

    const { getRedisClient } = await import("@/lib/cache");
    getRedisClient();

    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.enableOfflineQueue).toBe(true);
    expect(typeof capturedOptions.retryStrategy).toBe("function");

    // Test retryStrategy never returns null (even past 3 tries)
    expect(capturedOptions.retryStrategy(1)).toBe(200);
    expect(capturedOptions.retryStrategy(3)).toBe(600);
    expect(capturedOptions.retryStrategy(5)).toBe(1000);
    expect(capturedOptions.retryStrategy(20)).toBe(2000); // capped at 2000ms
  });
});
