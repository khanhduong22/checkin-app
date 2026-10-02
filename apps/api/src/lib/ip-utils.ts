import { Context } from "hono";
import { prisma } from "@checkin/db";
import { isIPMatch } from "@checkin/shared";

export function getClientIP(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = c.req.header("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export async function getIPStatus(c: Context): Promise<{
  ip: string;
  isAllowed: boolean;
  locationName: string;
}> {
  const clientIP = getClientIP(c);
  const allowedIps = await prisma.allowedIP.findMany();
  const prefixes = allowedIps.map((r: { prefix: string }) => r.prefix);

  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const isAllowed = isDev && prefixes.length === 0 ? true : isIPMatch(clientIP, prefixes);

  const matched = isAllowed
    ? allowedIps.find((ip: { prefix: string }) => isIPMatch(clientIP, [ip.prefix]))
    : null;

  return {
    ip: clientIP,
    isAllowed,
    locationName: isAllowed ? (matched?.label || "Văn phòng") : "Ngoài vùng phủ sóng",
  };
}
