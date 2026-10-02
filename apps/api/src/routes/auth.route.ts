import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { prisma } from "@checkin/db";
import { LoginRequestSchema } from "@checkin/shared";
import { signAccessToken, verifyAccessToken } from "../lib/auth";
import { authMiddleware, adminMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getClientIP } from "../lib/ip-utils";

export const authRoute = new Hono<AppEnv>();

// POST /api/auth/login
authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parseResult = LoginRequestSchema.safeParse(body);

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

    const { email, googleToken } = parseResult.data;

    if (!email && !googleToken) {
      return c.json(
        { success: false, error: "Either email or googleToken is required" },
        400
      );
    }

    let lookupEmail = email ? email.toLowerCase().trim() : null;

    // Handle googleToken: decode JWT payload if email was not directly provided
    if (!lookupEmail && googleToken) {
      try {
        const parts = googleToken.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            lookupEmail = payload.email.toLowerCase().trim();
          }
        }
      } catch {
        // Fallback: lookupEmail remains null
      }
    }

    const clientIp = getClientIP(c);
    const userAgent = c.req.header("user-agent") || "unknown";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    // Lookup user in DB
    let user = null;
    if (lookupEmail) {
      user = await prisma.user.findUnique({
        where: { email: lookupEmail },
      });
    }

    if (!user) {
      // Record failed audit log
      await prisma.sessionAuditLog.create({
        data: {
          action: "LOGIN",
          status: "FAILED",
          ipAddress: clientIp,
          userAgent: userAgent,
          device: isMobile ? "Mobile" : "Desktop",
          details: { reason: "User not found or invalid credentials", attemptedEmail: lookupEmail },
        },
      }).catch((e) => console.warn("[Audit Warning] Failed to write audit log:", e));

      return c.json(
        { success: false, error: "Tài khoản không tồn tại hoặc thông tin đăng nhập không đúng" },
        401
      );
    }

    if (!user.isActive) {
      await prisma.sessionAuditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          status: "FAILED",
          ipAddress: clientIp,
          userAgent: userAgent,
          device: isMobile ? "Mobile" : "Desktop",
          details: { reason: "Account inactive" },
        },
      }).catch((e) => console.warn("[Audit Warning] Failed to write audit log:", e));

      return c.json(
        { success: false, error: "Tài khoản của bạn đã bị vô hiệu hóa" },
        403
      );
    }

    // Auto-promote system admin if matches khanhdev4@gmail.com
    if (user.email === "khanhdev4@gmail.com" && user.role !== "ADMIN") {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      });
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);

    // Record successful login audit log
    await prisma.sessionAuditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        status: "SUCCESS",
        ipAddress: clientIp,
        userAgent: userAgent,
        device: isMobile ? "Mobile" : "Desktop",
      },
    }).catch((e) => console.warn("[Audit Warning] Failed to write audit log:", e));

    // Set HttpOnly cookie for Web/PWA clients
    setCookie(c, "access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return c.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        employmentType: user.employmentType,
        hourlyRate: user.hourlyRate,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Internal server error" },
      500
    );
  }
});

// POST /api/auth/logout
authRoute.post("/logout", async (c) => {
  let userId: string | null = null;
  const authHeader = c.req.header("Authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    token = getCookie(c, "access_token") || null;
  }

  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) userId = payload.sub;
  }

  const clientIp = getClientIP(c);
  const userAgent = c.req.header("user-agent") || "unknown";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

  await prisma.sessionAuditLog.create({
    data: {
      userId,
      action: "LOGOUT",
      status: "SUCCESS",
      ipAddress: clientIp,
      userAgent,
      device: isMobile ? "Mobile" : "Desktop",
    },
  }).catch((e) => console.warn("[Audit Warning] Failed to log logout:", e));

  // Clear access_token cookie
  setCookie(c, "access_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return c.json({
    success: true,
    message: "Đăng xuất thành công",
  });
});

// GET /api/auth/audit-logs (Admin Only, supports pagination and filters)
authRoute.get("/audit-logs", authMiddleware, adminMiddleware, async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10)), 200);
  const action = c.req.query("action");
  const status = c.req.query("status");
  const userId = c.req.query("userId");

  const where: any = {};
  if (action) where.action = action;
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [total, logs] = await Promise.all([
    prisma.sessionAuditLog.count({ where }),
    prisma.sessionAuditLog.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return c.json({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    logs,
  });
});

// GET /api/auth/me (also mounted at /api/me)
authRoute.get("/me", authMiddleware, async (c) => {
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

// GET /api/auth/staff-accounts (Public list of active accounts for quick switch / login selection)
authRoute.get("/staff-accounts", async (c) => {
  try {
    const staff = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        employmentType: true,
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    return c.json({
      success: true,
      staff,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff accounts" },
      500
    );
  }
});
