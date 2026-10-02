import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { calculateStreak } from "@checkin/shared";
import { authMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getIPStatus } from "../lib/ip-utils";
import { getSpecialDays } from "../lib/special-days";
import {
  getVietnamDayRange,
  getVietnamMonthRange,
  VN_OFFSET_MS,
} from "../lib/date-utils";
import {
  calculateMonthlyPayrollSummary,
  calculateUserMonthlyStats,
} from "../lib/payroll-calculator";

export const staffRoute = new Hono<AppEnv>();

// GET /api/staff/home-data
staffRoute.get("/home-data", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const { startOfDay, endOfDay } = getVietnamDayRange();

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    const [todayShifts, todayCheckins, announcements, specialDays, recentCheckins, recentLeaves, ipStatus] =
      await Promise.all([
        prisma.workShift.findMany({
          where: {
            userId,
            start: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { start: "asc" },
        }),
        prisma.checkIn.findMany({
          where: {
            userId,
            timestamp: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { timestamp: "desc" },
        }),
        prisma.announcement.findMany({
          where: { active: true },
          orderBy: { createdAt: "desc" },
        }),
        getSpecialDays(),
        prisma.checkIn.findMany({
          where: { userId, type: "checkin" },
          orderBy: { timestamp: "desc" },
          take: 60,
        }),
        prisma.request.findMany({
          where: { userId, type: "LEAVE", status: "APPROVED" },
          orderBy: { date: "desc" },
          take: 40,
        }),
        getIPStatus(c),
      ]);

    const streak = calculateStreak(recentCheckins, recentLeaves);

    return c.json({
      success: true,
      data: {
        user,
        todayShifts,
        todayCheckins,
        announcements,
        specialDays,
        streak,
        ipStatus,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff home data" },
      500
    );
  }
});

// GET /api/staff/schedule
staffRoute.get("/schedule", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const currentUserId = tokenPayload.sub;

    const monthQuery = c.req.query("month");
    const yearQuery = c.req.query("year");

    const { startDate, endDate } = getVietnamMonthRange(
      monthQuery ? parseInt(monthQuery, 10) : undefined,
      yearQuery ? parseInt(yearQuery, 10) : undefined
    );

    const shifts = await prisma.workShift.findMany({
      where: {
        start: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: { start: "asc" },
    });

    return c.json({
      success: true,
      data: shifts,
      currentUserId,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff schedule" },
      500
    );
  }
});

// POST /api/staff/schedule/register
staffRoute.post("/schedule/register", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const body = await c.req.json().catch(() => ({}));
    const { dateStr, shift } = body;

    if (!dateStr || !shift) {
      return c.json({ success: false, error: "Thiếu ngày hoặc ca làm việc" }, 400);
    }

    if (!["MORNING", "AFTERNOON", "FULL"].includes(shift)) {
      return c.json({ success: false, error: "Ca làm việc không hợp lệ" }, 400);
    }

    const vnTime = new Date(new Date(dateStr).getTime() + VN_OFFSET_MS);
    const y = vnTime.getUTCFullYear();
    const m = vnTime.getUTCMonth();
    const d = vnTime.getUTCDate();

    let startHour = 8;
    let startMinute = 30;
    let endHour = 17;
    let endMinute = 30;

    if (shift === "MORNING") {
      startHour = 8;
      startMinute = 30;
      endHour = 12;
      endMinute = 0;
    } else if (shift === "AFTERNOON") {
      startHour = 13;
      startMinute = 30;
      endHour = 17;
      endMinute = 30;
    } else if (shift === "FULL") {
      startHour = 8;
      startMinute = 30;
      endHour = 17;
      endMinute = 30;
    }

    const shiftStart = new Date(Date.UTC(y, m, d, startHour, startMinute, 0, 0) - VN_OFFSET_MS);
    const shiftEnd = new Date(Date.UTC(y, m, d, endHour, endMinute, 0, 0) - VN_OFFSET_MS);

    const newShift = await prisma.workShift.create({
      data: {
        userId,
        start: shiftStart,
        end: shiftEnd,
        shiftType: shift,
        status: "APPROVED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      message: "Đăng ký ca làm việc thành công!",
      data: newShift,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to register shift" },
      500
    );
  }
});

// POST /api/staff/schedule/cancel
staffRoute.post("/schedule/cancel", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;
    const userRole = tokenPayload.role;

    const body = await c.req.json().catch(() => ({}));
    const shiftId = Number(body.shiftId);

    if (!shiftId || isNaN(shiftId)) {
      return c.json({ success: false, error: "Mã ca làm không hợp lệ" }, 400);
    }

    const shift = await prisma.workShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return c.json({ success: false, error: "Ca làm việc không tồn tại" }, 404);
    }

    if (shift.userId !== userId && userRole !== "ADMIN") {
      return c.json({ success: false, error: "Bạn không có quyền hủy ca làm này" }, 403);
    }

    await prisma.workShift.delete({
      where: { id: shiftId },
    });

    return c.json({
      success: true,
      message: "Đã hủy ca làm việc thành công!",
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to cancel shift" },
      500
    );
  }
});

// GET /api/staff/payroll
staffRoute.get("/payroll", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const monthQuery = c.req.query("month");
    const yearQuery = c.req.query("year");

    const now = new Date();
    const month = monthQuery ? parseInt(monthQuery, 10) : now.getMonth() + 1;
    const year = yearQuery ? parseInt(yearQuery, 10) : now.getFullYear();

    const targetDate = new Date(year, month - 1, 15);
    const [stats, period] = await Promise.all([
      calculateUserMonthlyStats(userId, targetDate),
      prisma.payrollPeriod.findUnique({
        where: { month_year: { month, year } },
      }),
    ]);

    const isClosed = period?.status === "CLOSED" || period?.status === "LOCKED";

    return c.json({
      success: true,
      data: {
        stats: stats || {
          totalHours: 0,
          totalSalary: 0,
          daysWorked: 0,
          baseSalary: 0,
          totalAdjustments: 0,
          lateCount: 0,
          latePenaltyHours: 0,
          latePenaltyAmount: 0,
          dailyDetails: [],
        },
        isClosed,
        month,
        year,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff payroll" },
      500
    );
  }
});

// GET /api/staff/history
staffRoute.get("/history", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const history = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return c.json({
      success: true,
      data: history,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff history" },
      500
    );
  }
});

// GET /api/staff/requests
staffRoute.get("/requests", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const requests = await prisma.request.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: requests,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch staff requests" },
      500
    );
  }
});

// POST /api/staff/requests
staffRoute.post("/requests", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const body = await c.req.json().catch(() => ({}));
    const { type, date, reason } = body;

    if (!type || !date || !reason) {
      return c.json({ success: false, error: "Thiếu thông tin đơn từ" }, 400);
    }

    const validTypes = ["LEAVE", "WFH", "EXPLANATION", "SHIFT_SWAP", "EARLY_LEAVE"];
    if (!validTypes.includes(type)) {
      return c.json({ success: false, error: "Loại đơn không hợp lệ" }, 400);
    }

    const newRequest = await prisma.request.create({
      data: {
        userId,
        type,
        date: new Date(date),
        reason: String(reason).trim(),
        status: "PENDING",
      },
    });

    return c.json(
      {
        success: true,
        message: "Đã gửi yêu cầu thành công!",
        data: newRequest,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to create staff request" },
      500
    );
  }
});

// GET /api/staff/lucky-wheel
staffRoute.get("/lucky-wheel", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;
    const { startOfDay, endOfDay } = getVietnamDayRange();

    const [user, prizes, checkinToday, spunToday, recentWinners] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, luckyWheelAllowed: true },
      }),
      prisma.luckyWheelPrize.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.checkIn.findFirst({
        where: {
          userId,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.luckyWheelHistory.findFirst({
        where: {
          userId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.luckyWheelHistory.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }),
    ]);

    const isAllowed = user?.role === "ADMIN" || Boolean(user?.luckyWheelAllowed);
    const hasCheckedInToday = Boolean(checkinToday);
    const hasSpunToday = Boolean(spunToday);
    const canSpin = user?.role === "ADMIN" || (isAllowed && hasCheckedInToday && !hasSpunToday);

    return c.json({
      success: true,
      allowed: isAllowed,
      hasCheckedInToday,
      hasSpunToday,
      canSpin,
      prizes,
      recentWinners,
      data: {
        allowed: isAllowed,
        hasCheckedInToday,
        hasSpunToday,
        canSpin,
        prizes,
        recentWinners,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch lucky wheel status" },
      500
    );
  }
});

// POST /api/staff/gacha
staffRoute.post("/gacha", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const userId = tokenPayload?.sub || body?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { achievements: true },
    });
    if (!user) return c.json({ success: false, error: "User not found" }, 404);

    const { startOfDay, endOfDay } = getVietnamDayRange();

    if (user.role !== "ADMIN") {
      const hasCheckIn = await prisma.checkIn.findFirst({
        where: {
          userId: user.id,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (!hasCheckIn) {
        return c.json(
          {
            success: false,
            error: "⛔️ Bạn chưa điểm danh hôm nay! Hãy Check-in trước khi quay nhé.",
          },
          400
        );
      }

      const hasSpun = await prisma.luckyWheelHistory.findFirst({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (hasSpun) {
        return c.json(
          {
            success: false,
            error: "⏳ Mỗi ngày chỉ được quay 1 lần. Hẹn bạn ngày mai nhé!",
          },
          400
        );
      }
    }

    const prizes = await prisma.luckyWheelPrize.findMany({
      where: { active: true, remaining: { gt: 0 } },
    });

    if (prizes.length === 0) {
      return c.json(
        { success: false, error: "Kho quà đã hết sạch rồi!" },
        400
      );
    }

    // Weighted Random Algorithm
    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    const random = Math.random() * totalProbability;

    let selectedPrize = null;
    let accumulatedProb = 0;

    for (const prize of prizes) {
      accumulatedProb += prize.probability;
      if (random <= accumulatedProb) {
        selectedPrize = prize;
        break;
      }
    }

    if (!selectedPrize) {
      selectedPrize = prizes[0];
    }

    // Decrement remaining
    await prisma.luckyWheelPrize.update({
      where: { id: selectedPrize.id },
      data: { remaining: { decrement: 1 } },
    });

    // Create history
    await prisma.luckyWheelHistory.create({
      data: {
        userId: user.id,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
      },
    });

    if (selectedPrize.type === "TITLE") {
      const existingAch = user.achievements?.find((a: any) => a.code === selectedPrize!.name);
      if (!existingAch) {
        await prisma.userAchievement.create({
          data: {
            userId: user.id,
            code: selectedPrize.name,
            title: selectedPrize.name,
            description: selectedPrize.description || "Nhận được từ Vòng Quay May Mắn",
            icon: "🎰",
          },
        });
      }
    }

    const moneyValue =
      selectedPrize.type === "MONEY" && selectedPrize.value > 0
        ? Math.round(selectedPrize.value)
        : 0;

    if (moneyValue > 0) {
      await prisma.payrollAdjustment.create({
        data: {
          userId: user.id,
          amount: moneyValue,
          reason: `[Gacha] ${selectedPrize.name}`,
          date: new Date(),
        },
      });
    }

    return c.json({
      success: true,
      prize: selectedPrize,
      reward: {
        type: selectedPrize.type,
        value: moneyValue,
        message: selectedPrize.name,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Internal error spinning wheel" },
      500
    );
  }
});

// POST /api/staff/duties/:id/toggle
staffRoute.post("/duties/:id/toggle", authMiddleware, async (c) => {
  try {
    const dutyId = c.req.param("id");
    const duty = await prisma.shiftDuty.findUnique({ where: { id: dutyId } });
    if (!duty) {
      return c.json({ success: false, error: "Nhiệm vụ không tồn tại" }, 404);
    }
    const updated = await prisma.shiftDuty.update({
      where: { id: dutyId },
      data: {
        isCompleted: !duty.isCompleted,
        completedAt: !duty.isCompleted ? new Date() : null,
      },
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Lỗi khi cập nhật nhiệm vụ" },
      500
    );
  }
});

// POST /api/staff/tasks/submit
staffRoute.post("/tasks/submit", authMiddleware, async (c) => {
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

// GET /api/staff/reports
staffRoute.get("/reports", authMiddleware, async (c) => {
  try {
    const now = new Date();
    const month = parseInt(c.req.query("month") || "", 10) || now.getMonth() + 1;
    const year = parseInt(c.req.query("year") || "", 10) || now.getFullYear();
    const { startDate, endDate } = getVietnamMonthRange(month, year);

    const [users, checkins, pointTasks, carryingTasks] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true, image: true, employmentType: true },
      }),
      prisma.checkIn.findMany({
        where: { timestamp: { gte: startDate, lte: endDate } },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
      prisma.userTask.findMany({
        where: {
          status: "APPROVED",
          submittedAt: { gte: startDate, lte: endDate },
          taskDefinition: { unit: "điểm" },
        },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
      prisma.userTask.findMany({
        where: {
          status: "APPROVED",
          submittedAt: { gte: startDate, lte: endDate },
          taskDefinition: { unit: "điểm-bưng" },
        },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
    ]);

    const userLateStats: Record<string, { user: any; lateCount: number; totalLateMinutes: number }> = {};
    for (const ch of checkins) {
      if (ch.note?.includes("Trễ") || ch.note?.includes("Đi muộn")) {
        if (!userLateStats[ch.userId]) {
          userLateStats[ch.userId] = { user: ch.user, lateCount: 0, totalLateMinutes: 0 };
        }
        userLateStats[ch.userId].lateCount += 1;
        const match = ch.note.match(/(\d+)p/);
        if (match) userLateStats[ch.userId].totalLateMinutes += parseInt(match[1], 10);
      }
    }
    const topLate = Object.values(userLateStats).sort((a, b) => b.lateCount - a.lateCount);

    const payrollSummary = await calculateMonthlyPayrollSummary(new Date(year, month - 1, 1)).catch(() => ({
      totalPayroll: 0,
      totalProjected: 0,
      details: [],
    }));

    const topHardworking =
      Array.isArray(payrollSummary?.details) && payrollSummary.details.length > 0
        ? payrollSummary.details
            .slice()
            .sort((a: any, b: any) => (b.actualHours || 0) - (a.actualHours || 0))
            .slice(0, 5)
            .map((d: any) => ({
              id: d.userId,
              name: d.userName,
              totalHours: d.actualHours || 0,
              daysWorked: Math.round((d.actualHours || 0) / 8),
            }))
        : [];

    const topDiscipline =
      users.length > 0
        ? users.slice(0, 5).map((u) => ({
            user: u,
            totalScheduledCheckins: 0,
            punctualityRate: 100,
          }))
        : [];

    const topOvertime =
      Array.isArray(payrollSummary?.details) && payrollSummary.details.length > 0
        ? payrollSummary.details
            .filter((d: any) => (d.overtimeHours || 0) > 0)
            .sort((a: any, b: any) => (b.overtimeHours || 0) - (a.overtimeHours || 0))
            .slice(0, 5)
            .map((d: any) => ({
              id: d.userId,
              name: d.userName,
              avgOvertime: Math.round(((d.overtimeHours || 0) / 20) * 10) / 10,
              displayOvertimeHours: d.overtimeHours || 0,
              daysWorked: Math.round((d.actualHours || 0) / 8),
            }))
        : [];

    // Top Packing
    const userPointsMap: Record<string, { id: string; name: string; image: string | null; points: number }> = {};
    for (const pt of pointTasks) {
      if (!userPointsMap[pt.userId]) {
        userPointsMap[pt.userId] = { id: pt.user.id, name: pt.user.name || "Nhân viên", image: pt.user.image, points: 0 };
      }
      userPointsMap[pt.userId].points += (pt.finalAmount || pt.quantity || 0);
    }
    const topPacking = Object.values(userPointsMap).sort((a, b) => b.points - a.points).slice(0, 5);

    // Top Carrying
    const userCarryingMap: Record<string, { id: string; name: string; image: string | null; points: number }> = {};
    for (const ct of carryingTasks) {
      if (!userCarryingMap[ct.userId]) {
        userCarryingMap[ct.userId] = { id: ct.user.id, name: ct.user.name || "Nhân viên", image: ct.user.image, points: 0 };
      }
      userCarryingMap[ct.userId].points += (ct.finalAmount || ct.quantity || 0);
    }
    const topCarrying = Object.values(userCarryingMap).sort((a, b) => b.points - a.points).slice(0, 5);

    return c.json({
      success: true,
      data: {
        totalPayrollCost: payrollSummary?.totalPayroll || 0,
        totalHoursAll: 0,
        totalEmployeeCount: users.length,
        topHardworking,
        topDiscipline,
        topOvertime,
        topPacking,
        topCarrying,
        topLate,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to load reports" }, 500);
  }
});
