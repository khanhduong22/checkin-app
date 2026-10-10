import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindFirst, mockFindMany, mockCreate, mockAllowedIPFindMany } =
  vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
    mockAllowedIPFindMany: vi.fn(),
  }));

vi.mock("@checkin/db", () => ({
  prisma: {
    checkIn: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
    },
    allowedIP: {
      findMany: mockAllowedIPFindMany,
    },
    sessionAuditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-checkin-123" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";
import { _resetLocks } from "../src/lib/lock";
import { _resetRateLimits } from "../src/middleware/rate-limiter";

describe("Checkin Routes", () => {
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetLocks();
    _resetRateLimits();
    authToken = await signAccessToken({
      sub: "u-staff-1",
      email: "staff@example.com",
      role: "USER",
    });
  });

  describe("GET /api/checkins/today", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/checkins/today");
      expect(res.status).toBe(401);
    });

    it("returns list of today checkins with auth", async () => {
      const mockRecords = [
        {
          id: "c-1",
          userId: "u-staff-1",
          type: "checkin",
          timestamp: new Date().toISOString(),
        },
      ];
      mockFindMany.mockResolvedValue(mockRecords);

      const res = await app.request("/api/checkins/today", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });
  });

  describe("POST /api/checkins", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "checkin" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "invalid_type" }),
      });
      expect(res.status).toBe(400);
    });

    it("creates a checkin record when sequence is valid", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "c-new",
        userId: "u-staff-1",
        type: "checkin",
        timestamp: new Date().toISOString(),
      });

      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkin", note: "Starting morning shift" }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("checkin");
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("prevents double checkin without checking out first", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue({
        id: "c-old",
        userId: "u-staff-1",
        type: "checkin",
        timestamp: new Date().toISOString(),
      });

      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkin" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("chưa Check-out");
    });

    it("respects client timestamp if provided within valid bounds", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);
      const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
      mockCreate.mockResolvedValue({
        id: "c-client-time",
        userId: "u-staff-1",
        type: "checkin",
        timestamp: new Date(pastTime),
      });

      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          type: "checkin",
          timestamp: pastTime,
        }),
      });

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            timestamp: new Date(pastTime),
          }),
        })
      );
    });

    it("rejects rapid consecutive check-in attempts from the same user within 30 seconds", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      // Last checkin was 10 seconds ago
      const recentTime = new Date(Date.now() - 10 * 1000);
      mockFindFirst.mockResolvedValue({
        id: "c-recent",
        userId: "u-staff-1",
        type: "checkin",
        timestamp: recentTime,
      });

      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkout" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe("CHECKIN_TOO_FAST");
      expect(data.error).toContain("Thao tác quá nhanh");
      expect(data.retryAfter).toBeGreaterThan(0);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("allows check-in / checkout after 30 seconds have elapsed", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      // Last checkin was 45 seconds ago (> 30s threshold)
      const olderTime = new Date(Date.now() - 45 * 1000);
      mockFindFirst.mockResolvedValue({
        id: "c-old",
        userId: "u-staff-1",
        type: "checkin",
        timestamp: olderTime,
      });
      mockCreate.mockResolvedValue({
        id: "c-checkout",
        userId: "u-staff-1",
        type: "checkout",
        timestamp: new Date(),
      });

      const res = await app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkout" }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("rejects concurrent in-flight checkin requests from the same user", async () => {
      mockAllowedIPFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);

      let finishFirstCall: () => void = () => {};
      const delayPromise = new Promise<void>((resolve) => {
        finishFirstCall = resolve;
      });

      let first = true;
      mockCreate.mockImplementation(async () => {
        if (first) {
          first = false;
          await delayPromise;
        }
        return {
          id: "c-concurrent",
          userId: "u-staff-1",
          type: "checkin",
          timestamp: new Date(),
        };
      });

      // Request 1 acquires lock and pauses in mockCreate
      const promise1 = app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkin" }),
      });

      // Brief tick to ensure promise1 acquired lock
      await new Promise((r) => setTimeout(r, 20));

      // Request 2 tries to run concurrently
      const promise2 = app.request("/api/checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type: "checkin" }),
      });

      const res2 = await promise2;
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.success).toBe(false);
      expect(data2.code).toBe("CHECKIN_IN_PROGRESS");

      // Finish first call
      finishFirstCall();
      const res1 = await promise1;
      expect(res1.status).toBe(201);
    });
  });

  describe("POST /api/checkins/sync-offline", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/checkins/sync-offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(401);
    });

    it("successfully syncs offline checkin and checkout items respecting client timestamps", async () => {
      const clientTime1 = Date.now() - 7200 * 1000;
      const clientTime2 = Date.now() - 3600 * 1000;

      // Mock duplicate check & sequence check
      mockFindFirst
        .mockResolvedValueOnce(null) // off-1 dup check
        .mockResolvedValueOnce(null) // off-1 seq check (no prior checkin)
        .mockResolvedValueOnce(null) // off-2 dup check
        .mockResolvedValueOnce({ id: "checkin-sync-1", type: "checkin" }); // off-2 seq check (prior checkin found)
      mockCreate
        .mockResolvedValueOnce({ id: "checkin-sync-1", type: "checkin", timestamp: new Date(clientTime1) })
        .mockResolvedValueOnce({ id: "checkout-sync-2", type: "checkout", timestamp: new Date(clientTime2) });

      const res = await app.request("/api/checkins/sync-offline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: [
            { id: "off-1", type: "checkin", timestamp: clientTime1, note: "Offline 1" },
            { id: "off-2", type: "checkout", timestamp: clientTime2, note: "Offline 2" },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.synced).toBe(2);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(true);
      expect(data.results[1].success).toBe(true);
    });

    it("skips duplicate checkin item if already recorded", async () => {
      const clientTime = Date.now() - 1000;
      mockFindFirst.mockResolvedValueOnce({ id: "existing-c-1", type: "checkin" });

      const res = await app.request("/api/checkins/sync-offline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: [{ id: "off-dup", type: "checkin", timestamp: clientTime }],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.synced).toBe(1);
      expect(data.results[0].duplicated).toBe(true);
    });
  });
});
