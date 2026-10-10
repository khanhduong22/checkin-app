import { sign, verify } from "hono/jwt";

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "checkin-app-jwt-secret-monorepo-safe-2026";

export const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface TokenPayload {
  sub: string;
  id?: string;
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
    exp: now + TOKEN_EXPIRY_SECONDS,
  };
  return await sign(fullPayload, JWT_SECRET, "HS256");
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    if (payload) {
      return payload as unknown as TokenPayload;
    }
  } catch {
    // Invalid signature, expired, or malformed token
  }
  return null;
}
