import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";
import {
  _resetRateLimits,
  checkMemoryRateLimit,
  evaluateRateLimit,
} from "../src/middleware/rate-limiter";
import * as cacheModule from "../src/lib/cache";

// Mock DB for auth and checkin endpoints
vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    checkIn: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 1, type: "checkin", timestamp: new Date() }),
    },
    allowedIP: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    luckyWheelPrize: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    luckyWheelHistory: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    sessionAuditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (cb) => cb({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      checkIn: { findFirst: vi.fn().mockResolvedValue(null) },
      luckyWheelPrize: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
      luckyWheelHistory: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
    })),
  },
}));

describe("Rate Limiting Middleware", () => {
  let userToken: string;

  beforeEach(async () => {
    _resetRateLimits();
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-ratelimit-1",
      email: "ratelimit@example.com",
      role: "USER",
    });
  });

  describe("Standard Headers and Basic Behavior", () => {
    it("returns standard rate limit headers on successful request", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.1",
        },
        body: JSON.stringify({}),
      });

      expect(res.headers.get("X-RateLimit-Limit")).toBe("15");
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("14");
      expect(res.headers.get("Retry-After")).toBeDefined();
    });

    it("decrements X-RateLimit-Remaining with each request", async () => {
      const ip = "10.0.0.2";

      const res1 = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({}),
      });
      expect(res1.headers.get("X-RateLimit-Remaining")).toBe("14");

      const res2 = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({}),
      });
      expect(res2.headers.get("X-RateLimit-Remaining")).toBe("13");
    });
  });

  describe("Auth Routes Rate Limit (/api/auth/*: max 15 req/min per IP)", () => {
    it("enforces max 15 requests per minute per IP and returns 429 on 16th request", async () => {
      const testIp = "192.168.10.50";

      // Fire 15 requests (allowed)
      for (let i = 0; i < 15; i++) {
        const res = await app.request("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": testIp,
          },
          body: JSON.stringify({}),
        });
        expect(res.status).not.toBe(429);
      }

      // 16th request must be rejected with 429 Too Many Requests
      const res16 = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({}),
      });

      expect(res16.status).toBe(429);
      expect(res16.headers.get("X-RateLimit-Limit")).toBe("15");
      expect(res16.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(Number(res16.headers.get("Retry-After"))).toBeGreaterThan(0);

      const body = await res16.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("TOO_MANY_REQUESTS");
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it("isolates rate limits by IP address", async () => {
      const ipA = "10.1.1.1";
      const ipB = "10.1.1.2";

      // Max out ipA (15 requests)
      for (let i = 0; i < 15; i++) {
        await app.request("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ipA },
          body: JSON.stringify({}),
        });
      }

      // 16th request from ipA is blocked
      const blockedRes = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ipA },
        body: JSON.stringify({}),
      });
      expect(blockedRes.status).toBe(429);

      // Request from ipB is allowed!
      const allowedRes = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ipB },
        body: JSON.stringify({}),
      });
      expect(allowedRes.status).not.toBe(429);
      expect(allowedRes.headers.get("X-RateLimit-Remaining")).toBe("14");
    });
  });

  describe("Checkin Routes Rate Limit (/api/checkins: max 20 req/min per user/IP)", () => {
    it("enforces max 20 requests per minute per user and returns 429 on 21st request", async () => {
      // Fire 20 requests
      for (let i = 0; i < 20; i++) {
        const res = await app.request("/api/checkins/today", {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });
        expect(res.status).not.toBe(429);
      }

      // 21st request must return 429
      const res21 = await app.request("/api/checkins/today", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(res21.status).toBe(429);
      expect(res21.headers.get("X-RateLimit-Limit")).toBe("20");
      expect(res21.headers.get("X-RateLimit-Remaining")).toBe("0");

      const body = await res21.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("TOO_MANY_REQUESTS");
    });
  });

  describe("Lucky Wheel Spin Rate Limit (/api/lucky-wheel/spin: max 5 req/min per user)", () => {
    it("enforces max 5 requests per minute per user on /spin and returns 429 on 6th request", async () => {
      // Make 5 spin requests
      for (let i = 0; i < 5; i++) {
        const res = await app.request("/api/lucky-wheel/spin", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });
        expect(res.status).not.toBe(429);
      }

      // 6th spin request must return 429
      const res6 = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(res6.status).toBe(429);
      expect(res6.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(res6.headers.get("X-RateLimit-Remaining")).toBe("0");

      const body = await res6.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("TOO_MANY_REQUESTS");
    });
  });

  describe("In-Memory Sliding Window Algorithm", () => {
    it("resets limit as timestamps expire beyond sliding window", () => {
      const key = "test:window";
      const limit = 2;
      const windowMs = 1000;

      const r1 = checkMemoryRateLimit(key, limit, windowMs);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = checkMemoryRateLimit(key, limit, windowMs);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      // Third request within window is blocked
      const r3 = checkMemoryRateLimit(key, limit, windowMs);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.retryAfter).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Valkey Sliding Window with Lua Script & Fallback", () => {
    it("uses Valkey eval when redis client is available and falls back gracefully", async () => {
      const mockEval = vi.fn().mockResolvedValue([1, 4, 60]);
      vi.spyOn(cacheModule, "getRedisClient").mockReturnValue({
        eval: mockEval,
      } as any);

      const result = await evaluateRateLimit("ratelimit:test:1", 5, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfter).toBe(60);
      expect(mockEval).toHaveBeenCalled();

      // Test fallback when eval throws an error
      mockEval.mockRejectedValue(new Error("Valkey connection timeout"));
      const fallbackResult = await evaluateRateLimit("ratelimit:test:fallback", 3, 60000);
      expect(fallbackResult.allowed).toBe(true);
      expect(fallbackResult.remaining).toBe(2);
    });
  });
});
