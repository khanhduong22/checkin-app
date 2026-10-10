import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrismaDisconnect, mockRedisQuit } = vi.hoisted(() => ({
  mockPrismaDisconnect: vi.fn().mockResolvedValue(undefined),
  mockRedisQuit: vi.fn().mockResolvedValue("OK"),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    $disconnect: mockPrismaDisconnect,
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../src/lib/meilisearch", () => ({
  checkMeiliHealth: vi.fn().mockResolvedValue("connected"),
}));

import { createApp } from "../src/app";
import { getOrSetCache, inFlightPromises, setRedisClient } from "../src/lib/cache";
import { gracefulShutdown, setServer } from "../src/index";

describe("FAANG Hardening: Security Headers & Request Correlation ID", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HTTP Security Headers", () => {
    it("returns expected security headers on HTTP responses", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);

      // Verify hardened security headers
      expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("x-xss-protection")).toBe("1; mode=block");
    });
  });

  describe("Request Correlation ID (X-Request-Id)", () => {
    it("generates a new X-Request-Id header when none is provided", async () => {
      const res = await app.request("/health");
      const requestId = res.headers.get("x-request-id");
      expect(requestId).toBeTruthy();
      // Should match standard UUID pattern
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("preserves incoming X-Request-Id header when supplied by client", async () => {
      const customId = "faang-trace-uuid-12345678";
      const res = await app.request("/health", {
        headers: {
          "X-Request-Id": customId,
        },
      });
      expect(res.headers.get("x-request-id")).toBe(customId);
    });

    it("attaches requestId to global error handler output on 500", async () => {
      const errorApp = createApp();
      errorApp.get("/test-error", () => {
        throw new Error("Simulated critical failure");
      });

      const customId = "error-trace-id-999";
      const res = await errorApp.request("/test-error", {
        headers: {
          "X-Request-Id": customId,
        },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Simulated critical failure");
      expect(data.requestId).toBe(customId);
      expect(res.headers.get("x-request-id")).toBe(customId);
    });
  });

  describe("SingleFlight Cache Stampede Protection", () => {
    beforeEach(() => {
      inFlightPromises.clear();
    });

    it("deduplicates concurrent getOrSetCache calls for the same key (mock fetcher called exactly once for 5 concurrent calls)", async () => {
      let fetcherCallCount = 0;
      const mockData = { id: 101, result: "computed-value" };

      // Slow fetcher to simulate expensive DB query
      const slowFetcher = vi.fn(async () => {
        fetcherCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockData;
      });

      const cacheKey = "stampede:test:key:1";

      // Launch 5 concurrent calls for the same key simultaneously
      const results = await Promise.all([
        getOrSetCache(cacheKey, 60, slowFetcher),
        getOrSetCache(cacheKey, 60, slowFetcher),
        getOrSetCache(cacheKey, 60, slowFetcher),
        getOrSetCache(cacheKey, 60, slowFetcher),
        getOrSetCache(cacheKey, 60, slowFetcher),
      ]);

      // All 5 callers must receive the exact data
      expect(results).toHaveLength(5);
      for (const res of results) {
        expect(res).toEqual(mockData);
      }

      // Fetcher MUST be called exactly once
      expect(fetcherCallCount).toBe(1);
      expect(slowFetcher).toHaveBeenCalledTimes(1);

      // In-flight map should be cleaned up after resolution
      expect(inFlightPromises.has(cacheKey)).toBe(false);
    });

    it("cleans up inFlightPromises even if fetcher throws an error", async () => {
      const cacheKey = "stampede:test:error:key";
      const failingFetcher = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        throw new Error("DB connection failure");
      });

      // 3 concurrent failing calls
      const promises = [
        getOrSetCache(cacheKey, 60, failingFetcher),
        getOrSetCache(cacheKey, 60, failingFetcher),
        getOrSetCache(cacheKey, 60, failingFetcher),
      ];

      await expect(Promise.all(promises)).rejects.toThrow("DB connection failure");

      // Fetcher should still only have been called once
      expect(failingFetcher).toHaveBeenCalledTimes(1);

      // In-flight map must be cleaned up in finally block
      expect(inFlightPromises.has(cacheKey)).toBe(false);
    });
  });

  describe("Graceful Shutdown (SIGTERM/SIGINT Drain)", () => {
    it("drains active server connections, disconnects Prisma and quits Redis on shutdown", async () => {
      const mockClose = vi.fn((cb?: (err?: Error) => void) => {
        if (cb) cb();
      });
      const mockCloseIdleConnections = vi.fn();

      const mockServerInstance: any = {
        close: mockClose,
        closeIdleConnections: mockCloseIdleConnections,
      };

      setServer(mockServerInstance);
      setRedisClient({ quit: mockRedisQuit, status: "ready" } as any);

      const exitMock = vi.fn();
      await gracefulShutdown("SIGTERM", exitMock);

      // Verify server closed and idle connections cleaned
      expect(mockCloseIdleConnections).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();

      // Verify Prisma disconnected
      expect(mockPrismaDisconnect).toHaveBeenCalled();

      // Verify Redis quit
      expect(mockRedisQuit).toHaveBeenCalled();

      // Verify clean exit with code 0
      expect(exitMock).toHaveBeenCalledWith(0);
    });
  });
});
