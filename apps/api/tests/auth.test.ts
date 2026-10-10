import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindMany, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
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
import { _resetRateLimits } from "../src/middleware/rate-limiter";

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimits();
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

    it("returns 200 with JWT accessToken when credentials are valid for regular staff", async () => {
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
      expect(data.user.role).toBe("USER");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("access_token");
    });

    it("returns 403 Forbidden when admin user attempts login without PIN or credential", async () => {
      mockFindUnique.mockResolvedValue({
        id: "u-admin",
        email: "admin@limart.vn",
        name: "Admin User",
        role: "ADMIN",
        isActive: true,
      });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@limart.vn" }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("mã PIN bảo mật Admin");
    });

    it("returns 403 when admin logs in with incorrect PIN", async () => {
      mockFindUnique.mockResolvedValue({
        id: "u-admin",
        email: "admin@limart.vn",
        name: "Admin User",
        role: "ADMIN",
        isActive: true,
      });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@limart.vn", adminPin: "9999" }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("mã PIN bảo mật Admin");
    });

    it("returns 200 and access token when admin logs in with correct PIN", async () => {
      mockFindUnique.mockResolvedValue({
        id: "u-admin",
        email: "admin@limart.vn",
        name: "Admin User",
        role: "ADMIN",
        isActive: true,
      });

      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@limart.vn", adminPin: "2202" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.accessToken).toBe("string");
      expect(data.user.role).toBe("ADMIN");
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

  describe("Google OAuth Endpoints", () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
      process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
    });

    function createFakeIdToken(email: string) {
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64");
      const payload = Buffer.from(
        JSON.stringify({ email, sub: "google-sub-123", iss: "https://accounts.google.com" })
      ).toString("base64");
      return `${header}.${payload}.fakesig`;
    }

    describe("GET /api/auth/google", () => {
      it("redirects (302) to Google OAuth authorization URL with correct parameters", async () => {
        const res = await app.request("/api/auth/google", {
          headers: {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "limart.khanhdp.com",
          },
        });

        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toBeDefined();
        expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
        expect(location).toContain("client_id=");
        expect(location).toContain("redirect_uri=https%3A%2F%2Flimart.khanhdp.com%2Fapi%2Fauth%2Fcallback%2Fgoogle");
        expect(location).toContain("response_type=code");
        expect(location).toContain("scope=openid%20email%20profile");
      });
    });

    describe("GET /api/auth/callback/google", () => {
      it("redirects to /login?error=cancelled if error parameter is present", async () => {
        const res = await app.request("/api/auth/callback/google?error=access_denied");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=cancelled");
      });

      it("redirects to /login?error=cancelled if code is missing", async () => {
        const res = await app.request("/api/auth/callback/google");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=cancelled");
      });

      it("redirects to /login?error=exchange_failed if token exchange fails", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
        );

        const res = await app.request("/api/auth/callback/google?code=invalid_auth_code");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=exchange_failed");
      });

      it("redirects to /login?error=not_registered when email is not found in database", async () => {
        const fakeToken = createFakeIdToken("unknown_staff@gmail.com");
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ id_token: fakeToken }), { status: 200 })
        );
        mockFindUnique.mockResolvedValue(null);

        const res = await app.request("/api/auth/callback/google?code=valid_code");
        expect(res.status).toBe(302);
        const location = res.headers.get("location");
        expect(location).toContain("/login?error=not_registered");
        expect(location).toContain("email=unknown_staff%40gmail.com");
      });

      it("redirects to /login?error=inactive when user is inactive", async () => {
        const fakeToken = createFakeIdToken("inactive_staff@gmail.com");
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ id_token: fakeToken }), { status: 200 })
        );
        mockFindUnique.mockResolvedValue({
          id: "u-inactive",
          email: "inactive_staff@gmail.com",
          isActive: false,
          role: "USER",
        });

        const res = await app.request("/api/auth/callback/google?code=valid_code");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=inactive");
      });

      it("successfully logs in staff user: sets HttpOnly cookie and redirects to /", async () => {
        const fakeToken = createFakeIdToken("trang@limart.vn");
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ id_token: fakeToken }), { status: 200 })
        );
        mockFindUnique.mockResolvedValue({
          id: "u-trang",
          email: "trang@limart.vn",
          name: "Thu Trang",
          role: "USER",
          isActive: true,
        });

        const res = await app.request("/api/auth/callback/google?code=valid_code");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/");
        const setCookie = res.headers.get("set-cookie");
        expect(setCookie).toContain("access_token");
      });

      it("redirects admin user to /admin upon successful login", async () => {
        const fakeToken = createFakeIdToken("dung_manager@limart.vn");
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ id_token: fakeToken }), { status: 200 })
        );
        mockFindUnique.mockResolvedValue({
          id: "u-dung",
          email: "dung_manager@limart.vn",
          name: "Manager Dung",
          role: "ADMIN",
          isActive: true,
        });

        const res = await app.request("/api/auth/callback/google?code=valid_code");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/admin");
      });

      it("auto-promotes khanhdev4@gmail.com to ADMIN and redirects to /admin", async () => {
        const fakeToken = createFakeIdToken("khanhdev4@gmail.com");
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
          new Response(JSON.stringify({ id_token: fakeToken }), { status: 200 })
        );
        mockFindUnique.mockResolvedValue({
          id: "u-khanh",
          email: "khanhdev4@gmail.com",
          name: "Khanh Dev",
          role: "USER",
          isActive: true,
        });
        mockUpdate.mockResolvedValue({
          id: "u-khanh",
          email: "khanhdev4@gmail.com",
          name: "Khanh Dev",
          role: "ADMIN",
          isActive: true,
        });

        const res = await app.request("/api/auth/callback/google?code=valid_code");
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/admin");
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "u-khanh" },
            data: { role: "ADMIN" },
          })
        );
      });
    });
  });
});
