import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRequestFindMany, mockRequestCreate } = vi.hoisted(() => ({
  mockRequestFindMany: vi.fn(),
  mockRequestCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    request: {
      findMany: mockRequestFindMany,
      create: mockRequestCreate,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Requests Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-req-1",
      email: "req@example.com",
      role: "USER",
    });
  });

  describe("GET /api/requests/me", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/requests/me");
      expect(res.status).toBe(401);
    });

    it("returns requests for authenticated user", async () => {
      mockRequestFindMany.mockResolvedValue([
        {
          id: 1,
          userId: "u-req-1",
          type: "LEAVE",
          date: new Date().toISOString(),
          reason: "Nghỉ ốm",
          status: "PENDING",
        },
      ]);

      const res = await app.request("/api/requests/me", {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe("LEAVE");
    });
  });

  describe("POST /api/requests", () => {
    it("creates a new request when payload is valid", async () => {
      mockRequestCreate.mockResolvedValue({
        id: 2,
        userId: "u-req-1",
        type: "WFH",
        date: new Date("2026-10-10"),
        reason: "Làm việc tại nhà",
        status: "PENDING",
      });

      const res = await app.request("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          type: "WFH",
          date: "2026-10-10",
          reason: "Làm việc tại nhà",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("WFH");
      expect(mockRequestCreate).toHaveBeenCalled();
    });

    it("returns 400 for invalid request type", async () => {
      const res = await app.request("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          type: "INVALID_TYPE",
          date: "2026-10-10",
          reason: "Test",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });
});
