import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockSessionAuditLogCreate } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockSessionAuditLogCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: vi.fn(),
    },
    sessionAuditLog: {
      create: mockSessionAuditLogCreate,
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Auth Extended Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/logout", () => {
    it("clears cookie and records SessionAuditLog", async () => {
      const token = await signAccessToken({
        sub: "u-123",
        email: "user@example.com",
        role: "USER",
      });

      mockSessionAuditLogCreate.mockResolvedValue({ id: "audit-logout" });

      const res = await app.request("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockSessionAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "LOGOUT",
            status: "SUCCESS",
            userId: "u-123",
          }),
        })
      );
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("access_token=");
    });
  });

  describe("POST /api/auth/login with googleToken", () => {
    it("logs in user when googleToken contains valid encoded email", async () => {
      // Mock a simple 3-part JWT format token with email in payload
      const payloadBase64 = Buffer.from(
        JSON.stringify({ email: "google-user@example.com" })
      ).toString("base64");
      const fakeGoogleToken = `header.${payloadBase64}.signature`;

      mockUserFindUnique.mockResolvedValue({
        id: "u-google-1",
        name: "Google User",
        email: "google-user@example.com",
        role: "USER",
        isActive: true,
        employmentType: "PART_TIME",
        hourlyRate: 30000,
      });
      mockSessionAuditLogCreate.mockResolvedValue({ id: "audit-login" });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleToken: fakeGoogleToken }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe("google-user@example.com");
      expect(typeof data.accessToken).toBe("string");
    });
  });

  describe("GET /api/me with achievements", () => {
    it("returns user profile including achievements", async () => {
      const token = await signAccessToken({
        sub: "u-ach-1",
        email: "ach@example.com",
        role: "USER",
      });

      mockUserFindUnique.mockResolvedValue({
        id: "u-ach-1",
        name: "Achieve User",
        email: "ach@example.com",
        role: "USER",
        isActive: true,
        employmentType: "PART_TIME",
        hourlyRate: 30000,
        monthlySalary: 6000000,
        birthday: null,
        startDate: null,
        achievements: [
          { id: "a-1", code: "LUCKY_STAR", title: "Ngôi sao may mắn" },
        ],
      });

      const res = await app.request("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.achievements).toHaveLength(1);
    });
  });
});
