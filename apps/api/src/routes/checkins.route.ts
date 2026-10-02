import { Hono } from "hono";
import { prisma } from "@checkin/db";
import {
  CheckinRequestSchema,
  isIPMatch,
  isInsideGeofence,
} from "@checkin/shared";
import { authMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getClientIP } from "../lib/ip-utils";
import { getVietnamDayRange } from "../lib/date-utils";

export const checkinsRoute = new Hono<AppEnv>();

// GET /api/checkins/today
checkinsRoute.get("/today", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const { startOfDay, endOfDay } = getVietnamDayRange();
    const isAll = c.req.query("all") === "true" || user.role === "ADMIN";

    const whereClause: any = {
      timestamp: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };
    if (!isAll) {
      whereClause.userId = user.sub;
    }

    const checkins = await prisma.checkIn.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    return c.json({
      success: true,
      data: checkins,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch checkins" },
      500
    );
  }
});

// POST /api/checkins
checkinsRoute.post("/", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const parseResult = CheckinRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parseResult.error.flatten(),
        },
        400
      );
    }

    const { type, note, latitude, longitude } = parseResult.data;
    const clientIP = getClientIP(c);

    // 1. IP Whitelist Validation
    const allowedIps = await prisma.allowedIP.findMany();
    const prefixes = allowedIps.map((r: { prefix: string }) => r.prefix);

    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    const isAllowedIP =
      isDev && prefixes.length === 0 ? true : isIPMatch(clientIP, prefixes);

    // Optional GPS Geofence Check (if coordinates provided & enabled)
    let isAllowedLocation = isAllowedIP;
    let distanceInfo = null;

    if (latitude !== undefined && longitude !== undefined) {
      // Default Saigon office reference coordinate
      const officeCoords = { lat: 10.7769, lon: 106.7009 };
      const geoResult = isInsideGeofence(
        { lat: latitude, lon: longitude },
        officeCoords,
        150 // 150m radius
      );
      distanceInfo = geoResult;
      // Allow check-in if either IP is valid OR Geofence is valid
      if (geoResult.isInside) {
        isAllowedLocation = true;
      }
    }

    if (!isAllowedLocation) {
      return c.json(
        {
          success: false,
          error: `IP không hợp lệ: ${clientIP}. Vui lòng kết nối Wi-Fi văn phòng hoặc mở GPS tại cửa hàng.`,
        },
        403
      );
    }

    // 2. Validate Sequence (Checkin -> Checkout -> Checkin)
    const lastCheckin = await prisma.checkIn.findFirst({
      where: { userId: user.sub },
      orderBy: { timestamp: "desc" },
    });

    if (type === "checkin") {
      if (lastCheckin && lastCheckin.type === "checkin") {
        return c.json(
          {
            success: false,
            error: "Bạn chưa Check-out lượt trước đó! Vui lòng Check-out trước.",
          },
          400
        );
      }
    } else {
      // type === "checkout"
      if (!lastCheckin || lastCheckin.type === "checkout") {
        return c.json(
          {
            success: false,
            error: "Bạn chưa Check-in, không thể Check-out!",
          },
          400
        );
      }
    }

    // 3. Create checkin record
    const newCheckin = await prisma.checkIn.create({
      data: {
        userId: user.sub,
        type,
        timestamp: new Date(),
        ipAddress: clientIP,
        note: note || undefined,
      },
    });

    // Record Session Audit Log for Checkin / Checkout
    const userAgent = c.req.header("user-agent") || "unknown";
    await prisma.sessionAuditLog.create({
      data: {
        userId: user.sub,
        action: type === "checkin" ? "CHECKIN" : "CHECKOUT",
        status: "SUCCESS",
        ipAddress: clientIP,
        userAgent: userAgent,
        device: /Mobile|Android|iPhone/i.test(userAgent) ? "Mobile" : "Desktop",
        details: {
          checkinId: newCheckin.id,
          isAllowedIP,
          distanceInfo: distanceInfo as any,
        },
      },
    }).catch((e) => console.warn("[Audit Warning] Failed to log checkin:", e));

    return c.json(
      {
        success: true,
        message:
          type === "checkin"
            ? "Chấm công vào ca thành công! Chúc bạn làm việc hiệu quả."
            : "Chấm công tan ca thành công! Cảm ơn bạn.",
        data: newCheckin,
        clientIP,
        distanceInfo,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Checkin failed" },
      500
    );
  }
});
