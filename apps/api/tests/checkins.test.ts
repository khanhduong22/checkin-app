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

describe("Checkin Routes", () => {
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
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
  });
});
