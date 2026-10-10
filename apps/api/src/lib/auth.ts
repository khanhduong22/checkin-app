import { sign, verify } from "hono/jwt";

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "checkin-app-jwt-secret-2026-safe";

export const ALL_JWT_SECRETS = Array.from(
  new Set(
    [
      process.env.JWT_SECRET,
      process.env.NEXTAUTH_SECRET,
      "checkin-app-jwt-secret-monorepo-safe-2026",
      "checkin-app-jwt-secret-2026-safe",
    ].filter(Boolean)
  )
) as string[];

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
    exp: now + 7 * 24 * 60 * 60, // 7 days
  };
  return await sign(fullPayload, JWT_SECRET, "HS256");
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  // Dynamically include runtime process.env values in case they were set/changed
  const secrets = Array.from(
    new Set([
      process.env.JWT_SECRET,
      process.env.NEXTAUTH_SECRET,
      ...ALL_JWT_SECRETS,
    ].filter(Boolean))
  ) as string[];

  for (const secret of secrets) {
    try {
      const payload = await verify(token, secret, "HS256");
      if (payload) {
        return payload as unknown as TokenPayload;
      }
    } catch {
      // Continue to next fallback secret
    }
  }
  return null;
}

