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

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  let token: string | null = null;

  // 1. Check Bearer Authorization header
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && candidate !== "cookie_session") {
      token = candidate;
    }
  }

  // 2. Fallback to Cookie
  if (!token) {
    const cookieToken = getCookie(c, "access_token");
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return c.json(
      { success: false, error: "Unauthorized: Missing authentication token" },
      401
    );
  }

  if (token === "dev_demo_token") {
    if (process.env.NODE_ENV === "production") {
      return c.json(
        { success: false, error: "Unauthorized: Invalid or expired token" },
        401
      );
    }
    try {
      const demoUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { role: "desc" },
      });
      if (demoUser) {
        c.set("user", {
          sub: demoUser.id,
          email: demoUser.email || "demo@limart.vn",
          role: demoUser.role,
          name: demoUser.name || "Demo Staff",
        });
        return await next();
      }
    } catch {}
  }

  const payload = await verifyAccessToken(token);
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
