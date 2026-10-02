import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { authMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getVietnamDayRange } from "../lib/date-utils";

export const gachaRoute = new Hono<AppEnv>();

// GET /api/gacha
gachaRoute.get("/", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;
    const { startOfDay } = getVietnamDayRange();

    const [user, checkinToday, existingRoll, history, activePrizesCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      }),
      prisma.checkIn.findFirst({
        where: {
          userId,
          timestamp: { gte: startOfDay },
          type: "checkin",
        },
      }),
      prisma.payrollAdjustment.findFirst({
        where: {
          userId,
          date: { gte: startOfDay },
          reason: { contains: "[Gacha]" },
        },
      }),
      prisma.luckyWheelHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.luckyWheelPrize.count({
        where: { active: true, remaining: { gt: 0 } },
      }),
    ]);

    const hasCheckedIn = Boolean(checkinToday);
    const hasRolled = Boolean(existingRoll);
    const canRoll = user?.role === "ADMIN" || (hasCheckedIn && !hasRolled && activePrizesCount > 0);

    return c.json({
      success: true,
      hasCheckedIn,
      hasRolled,
      canRoll,
      remainingPrizes: activePrizesCount,
      history,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch gacha status" },
      500
    );
  }
});

// POST /api/gacha/spin
gachaRoute.post("/spin", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return c.json({ success: false, error: "User not found" }, 404);

    const { startOfDay } = getVietnamDayRange();

    if (user.role !== "ADMIN") {
      // 1. Attendance check
      const checkin = await prisma.checkIn.findFirst({
        where: {
          userId,
          timestamp: { gte: startOfDay },
          type: "checkin",
        },
      });

      if (!checkin) {
        return c.json(
          { success: false, error: "Chấm công trước đã bạn êii!" },
          400
        );
      }

      // 2. Daily limit check
      const existingRoll = await prisma.payrollAdjustment.findFirst({
        where: {
          userId,
          date: { gte: startOfDay },
          reason: { contains: "[Gacha]" },
        },
      });

      if (existingRoll) {
        return c.json(
          { success: false, error: "Mỗi ngày 1 lượt thôi tham thế! 🌚" },
          400
        );
      }
    }

    // 3. Roll Logic (Database Driven)
    const prizes = await prisma.luckyWheelPrize.findMany({
      where: { active: true, remaining: { gt: 0 } },
    });

    if (prizes.length === 0) {
      return c.json(
        { success: false, error: "Kho quà tạm thời hết sạch rồi! Quay lại sau nhé." },
        400
      );
    }

    // Weighted Random Algorithm
    const totalProbability = prizes.reduce((sum: number, p: any) => sum + p.probability, 0);
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

    // Decrement Remaining
    await prisma.luckyWheelPrize.update({
      where: { id: selectedPrize.id },
      data: { remaining: { decrement: 1 } },
    });

    // Record History
    await prisma.luckyWheelHistory.create({
      data: {
        userId,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
      },
    });

    let logMessage = selectedPrize.name;

    // Handle Title
    if (selectedPrize.type === "TITLE") {
      const existingAch = await prisma.userAchievement.findUnique({
        where: { userId_code: { userId, code: selectedPrize.name } },
      });

      if (!existingAch) {
        await prisma.userAchievement.create({
          data: {
            userId,
            code: selectedPrize.name,
            title: selectedPrize.name,
            description: selectedPrize.description || "Nhận được từ Gacha",
            icon: "🎰",
          },
        });
        logMessage = `[Title] ${selectedPrize.name}`;
      } else {
        logMessage = `[Duplicate Title] ${selectedPrize.name}`;
      }
    }

    const moneyValue =
      selectedPrize.type === "MONEY" && selectedPrize.value ? Math.round(selectedPrize.value) : 0;

    // Record transaction and lock day for Gacha
    await prisma.payrollAdjustment.create({
      data: {
        userId,
        amount: moneyValue,
        reason: `[Gacha] ${logMessage}`,
      },
    });

    return c.json({
      success: true,
      reward: {
        type: selectedPrize.type,
        value: moneyValue,
        message: selectedPrize.name,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Internal error rolling gacha" },
      500
    );
  }
});
