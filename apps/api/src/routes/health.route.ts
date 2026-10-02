import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { checkCacheHealth } from "../lib/cache";
import { checkMeiliHealth } from "../lib/meilisearch";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  let dbStatus: "connected" | "disconnected" = "disconnected";

  try {
    // Quick probe to check DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "disconnected";
  }

  const [valkeyStatus, meiliStatus] = await Promise.all([
    checkCacheHealth(),
    checkMeiliHealth(),
  ]);

  const isOk = dbStatus === "connected";

  return c.json({
    status: isOk ? "ok" : "degraded",
    time: new Date().toISOString(),
    db: dbStatus,
    valkey: valkeyStatus,
    meilisearch: meiliStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    version: "1.0.0",
  });
});
