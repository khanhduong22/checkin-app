import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
    sessionAuditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-123" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 when body is empty", async () => {
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("returns 401 when user is not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "notfound@example.com" }),
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("returns 403 when user is inactive", async () => {
      mockFindUnique.mockResolvedValue({
        id: "u-inactive",
        email: "inactive@example.com",
        isActive: false,
      });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "inactive@example.com" }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("returns 200 with JWT accessToken when credentials are valid", async () => {
      mockFindUnique.mockResolvedValue({
        id: "u-active",
        email: "user@example.com",
        name: "Test User",
        role: "USER",
        isActive: true,
        employmentType: "PART_TIME",
        hourlyRate: 30000,
      });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.accessToken).toBe("string");
      expect(data.user.email).toBe("user@example.com");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("access_token");
    });
  });

  describe("GET /api/me", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await app.request("/api/me");
      expect(res.status).toBe(401);
    });

    it("returns 200 and user profile when valid Bearer token provided", async () => {
      const token = await signAccessToken({
        sub: "u-123",
        email: "user@example.com",
        role: "USER",
      });

      mockFindUnique.mockResolvedValue({
        id: "u-123",
        name: "Valid User",
        email: "user@example.com",
        role: "USER",
        isActive: true,
      });

      const res = await app.request("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toBe("Valid User");
    });
  });
});
