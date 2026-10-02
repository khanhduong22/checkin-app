import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health.route";
import { authRoute } from "./routes/auth.route";
import { ipStatusRoute } from "./routes/ip-status.route";
import { staffRoute } from "./routes/staff.route";
import { checkinsRoute } from "./routes/checkins.route";
import { gachaRoute } from "./routes/gacha.route";
import { luckyWheelRoute } from "./routes/lucky-wheel.route";
import { scheduleRoute } from "./routes/schedule.route";
import { shiftsRoute } from "./routes/shifts.route";
import { payrollRoute } from "./routes/payroll.route";
import { requestsRoute } from "./routes/requests.route";
import { adminRoute } from "./routes/admin.route";
import { authMiddleware, AppEnv } from "./middleware/auth.middleware";
import { prisma } from "@checkin/db";

export function createApp() {
  const app = new Hono<AppEnv>();

  // Middleware
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  // Global Error Handler
  app.onError((err, c) => {
    console.error("[API Error]", err);
    return c.json(
      {
        success: false,
        error: err.message || "Internal Server Error",
      },
      500
    );
  });

  // Mount Health & Core Routes
  app.route("/health", healthRoute);
  app.route("/api/auth", authRoute);

  // Route alias: GET /api/me directly
  app.get("/api/me", authMiddleware, async (c) => {
    const tokenPayload = c.get("user");
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        employmentType: true,
        hourlyRate: true,
        monthlySalary: true,
        birthday: true,
        startDate: true,
        luckyWheelAllowed: true,
        achievements: true,
      },
    });

    if (!user || !user.isActive) {
      return c.json({ success: false, error: "User not found or inactive" }, 404);
    }

    return c.json({
      success: true,
      user,
    });
  });

  // Task submit alias: POST /api/packing/submit
  app.post("/api/packing/submit", authMiddleware, async (c) => {
    try {
      const tokenPayload = c.get("user");
      const userId = tokenPayload.sub;
      const body = await c.req.json().catch(() => ({}));
      const { taskDefId, quantity, note, evidenceLink } = body;

      if (!taskDefId) {
        return c.json({ success: false, error: "Thiếu Task ID" }, 400);
      }

      const taskDef = await prisma.taskDefinition.findUnique({
        where: { id: taskDefId },
      });

      if (!taskDef || !taskDef.active) {
        return c.json({ success: false, error: "Task definition not found or inactive" }, 404);
      }

      const userTask = await prisma.userTask.create({
        data: {
          userId,
          taskDefId,
          unitPrice: taskDef.baseReward,
          status: "SUBMITTED",
          submittedAt: new Date(),
          quantity: quantity || 1,
          note: note || "",
          evidenceLink: evidenceLink || "",
        },
      });

      return c.json({ success: true, data: { id: userTask.id } });
    } catch (error: any) {
      return c.json({ success: false, error: error?.message || "Failed to submit task" }, 500);
    }
  });

  // Staff & Functional Routes
  app.route("/api/ip-status", ipStatusRoute);
  app.route("/api/staff", staffRoute);
  app.route("/api/checkins", checkinsRoute);
  app.route("/api/gacha", gachaRoute);
  app.route("/api/lucky-wheel", luckyWheelRoute);
  app.route("/api/schedule", scheduleRoute);
  app.route("/api/shift-duties", shiftsRoute);
  app.route("/api/payroll", payrollRoute);
  app.route("/api/requests", requestsRoute);

  // Admin Routes
  app.route("/api/admin", adminRoute);

  // Fallback 404
  app.notFound((c) => {
    return c.json({ success: false, error: "Route not found" }, 404);
  });

  return app;
}

export const app = createApp();
