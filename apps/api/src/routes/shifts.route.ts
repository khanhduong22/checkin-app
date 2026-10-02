import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { WeeklyShiftQuerySchema } from "@checkin/shared";
import { getOrSetCache } from "../lib/cache";
import { authMiddleware } from "../middleware/auth.middleware";

export const shiftsRoute = new Hono();

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// GET /api/shift-duties/weekly
shiftsRoute.get("/weekly", authMiddleware, async (c) => {
  try {
    const query = c.req.query();
    const parseResult = WeeklyShiftQuerySchema.safeParse(query);
    const dateInput = parseResult.success && parseResult.data.date
      ? new Date(parseResult.data.date)
      : new Date();

    const date = isNaN(dateInput.getTime()) ? new Date() : dateInput;

    const vnDate = new Date(date.getTime() + VN_OFFSET_MS);
    const dayOfWeek = vnDate.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayVN = new Date(vnDate);
    mondayVN.setUTCDate(vnDate.getUTCDate() + diffToMonday);

    const weekStart = new Date(
      Date.UTC(
        mondayVN.getUTCFullYear(),
        mondayVN.getUTCMonth(),
        mondayVN.getUTCDate(),
        0,
        0,
        0,
        0
      ) - VN_OFFSET_MS
    );
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const weekKey = weekStart.toISOString().slice(0, 10);
    const cacheKey = `shift-duties:weekly:${weekKey}`;

    const duties = await getOrSetCache(cacheKey, 180, async () => {
      return await prisma.shiftDuty.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
          shift: true,
        },
        orderBy: { date: "asc" },
      });
    });

    return c.json({
      success: true,
      data: duties,
      weekRange: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch shift duties" },
      500
    );
  }
});
