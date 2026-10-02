import { sign, verify } from "hono/jwt";

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "checkin-app-jwt-secret-2026-safe";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  name?: string;
  exp?: number;
  iat?: number;
}

export async function signAccessToken(payload: Omit<TokenPayload, "exp" | "iat">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  };
  return await sign(fullPayload, JWT_SECRET, "HS256");
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
