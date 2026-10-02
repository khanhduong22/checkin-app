import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { authMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getVietnamMonthRange } from "../lib/date-utils";

export const scheduleRoute = new Hono<AppEnv>();

// GET /api/schedule/my-shifts
scheduleRoute.get("/my-shifts", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const startQuery = c.req.query("start");
    const endQuery = c.req.query("end");
    const monthQuery = c.req.query("month");
    const yearQuery = c.req.query("year");

    let startDate: Date;
    let endDate: Date;

    if (startQuery && endQuery) {
      startDate = new Date(startQuery);
      endDate = new Date(endQuery);
    } else if (monthQuery || yearQuery) {
      const month = monthQuery ? parseInt(monthQuery, 10) : undefined;
      const year = yearQuery ? parseInt(yearQuery, 10) : undefined;
      const range = getVietnamMonthRange(month, year);
      startDate = range.startDate;
      endDate = range.endDate;
    } else {
      const range = getVietnamMonthRange();
      startDate = range.startDate;
      endDate = range.endDate;
    }

    const shifts = await prisma.workShift.findMany({
      where: {
        userId,
        start: { gte: startDate, lte: endDate },
      },
      include: {
        duties: {
          select: {
            id: true,
            title: true,
            description: true,
            isCompleted: true,
            date: true,
          },
        },
      },
      orderBy: { start: "asc" },
    });

    return c.json({
      success: true,
      data: shifts,
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch user shifts" },
      500
    );
  }
});
