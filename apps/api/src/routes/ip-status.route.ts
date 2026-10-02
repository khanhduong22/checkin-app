import { Hono } from "hono";
import { getIPStatus } from "../lib/ip-utils";

export const ipStatusRoute = new Hono();

// GET /api/ip-status
ipStatusRoute.get("/", async (c) => {
  const result = await getIPStatus(c);
  return c.json({
    success: true,
    ...result,
  });
});
