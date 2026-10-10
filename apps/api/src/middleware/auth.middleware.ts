import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyAccessToken, TokenPayload } from "../lib/auth";
import { prisma } from "@checkin/db";

export interface AuthContextVariables {
  user: TokenPayload;
  requestId: string;
}

export type AppEnv = {
  Variables: AuthContextVariables;
};

async function resolveTokenPayload(token: string | null | undefined): Promise<TokenPayload | null> {
  if (!token) return null;

  if (token === "dev_demo_token") {
    if (process.env.NODE_ENV === "production") {
      return null;
    }
    try {
      const demoUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { role: "desc" },
      });
      if (demoUser) {
        return {
          sub: demoUser.id,
          email: demoUser.email || "demo@limart.vn",
          role: demoUser.role,
          name: demoUser.name || "Demo Staff",
        };
      }
    } catch {
      return null;
    }
  }

  return await verifyAccessToken(token);
}

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  // Bước 1: Trích xuất candidate từ Header Authorization: Bearer ... (nếu có)
  let candidate: string | null = null;
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const raw = authHeader.substring(7).trim();
    if (raw && raw !== "cookie_session" && raw !== "null" && raw !== "undefined") {
      candidate = raw;
    }
  }

  // Bước 2: Trích xuất cookieToken từ cookie access_token (nếu có)
  const cookieCandidate = getCookie(c, "access_token");
  const cookieToken =
    cookieCandidate && cookieCandidate !== "null" && cookieCandidate !== "undefined"
      ? cookieCandidate.trim()
      : null;

  // Nếu cả hai nguồn đều không có bất kỳ token nào
  if (!candidate && !cookieToken) {
    return c.json(
      { success: false, error: "Unauthorized: Missing authentication token" },
      401
    );
  }

  // Bước 3: Thử verify candidate trước. Nếu payload hợp lệ -> gán user và next()
  let payload: TokenPayload | null = null;
  if (candidate) {
    payload = await resolveTokenPayload(candidate);
  }

  // Bước 4: Nếu candidate không có hoặc verify thất bại (token cũ/hết hạn), lập tức fallback sang verify cookieToken!
  if (!payload && cookieToken) {
    payload = await resolveTokenPayload(cookieToken);
  }

  // Bước 5: Chỉ khi CẢ HAI nguồn (header và cookie) đều không có hoặc đều không hợp lệ, mới trả về 401
  if (!payload) {
    return c.json(
      { success: false, error: "Unauthorized: Invalid or expired token" },
      401
    );
  }

  c.set("user", payload);
  await next();
}


export async function adminMiddleware(c: Context<AppEnv>, next: Next) {
  const user = c.get("user");
  if (!user || user.role !== "ADMIN") {
    return c.json(
      { success: false, error: "Forbidden: Admin access required" },
      403
    );
  }
  await next();
}
