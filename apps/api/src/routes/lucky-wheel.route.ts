import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { authMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getVietnamDayRange } from "../lib/date-utils";

export const luckyWheelRoute = new Hono<AppEnv>();

// GET /api/lucky-wheel
luckyWheelRoute.get("/", authMiddleware, async (c) => {
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
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch lucky wheel status" },
      500
    );
  }
});

// POST /api/lucky-wheel/spin
luckyWheelRoute.post("/spin", authMiddleware, async (c) => {
  try {
    const tokenPayload = c.get("user");
    const userId = tokenPayload.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { achievements: true },
    });

    if (!user) return c.json({ success: false, error: "User not found" }, 404);

    const { startOfDay, endOfDay } = getVietnamDayRange();

    // Permission and daily limits check
    if (user.role !== "ADMIN") {
      if (!user.luckyWheelAllowed) {
        return c.json(
          {
            success: false,
            error: "Rất tiếc! Sự kiện rút thăm hôm nay không dành cho tài khoản của bạn.",
          },
          403
        );
      }

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

    // Get active prizes with remaining > 0
    const prizes = await prisma.luckyWheelPrize.findMany({
      where: { active: true, remaining: { gt: 0 } },
    });

    if (prizes.length === 0) {
      return c.json(
        { success: false, error: "Kho quà đã hết sạch rồi!" },
        400
      );
    }

    const totalRemaining = prizes.reduce((sum, p) => sum + p.remaining, 0);
    const isDrawMode = totalRemaining > 0 && totalRemaining <= 24;

    let selectedPrize = null;

    if (isDrawMode) {
      const randomHit = Math.floor(Math.random() * totalRemaining);
      let accumulatedRemain = 0;

      for (const prize of prizes) {
        accumulatedRemain += prize.remaining;
        if (randomHit < accumulatedRemain) {
          selectedPrize = prize;
          break;
        }
      }
    } else {
      const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
      const random = Math.random() * totalProbability;

      let accumulatedProb = 0;
      for (const prize of prizes) {
        accumulatedProb += prize.probability;
        if (random <= accumulatedProb) {
          selectedPrize = prize;
          break;
        }
      }

      if (!selectedPrize) {
        selectedPrize = prizes.find((p) => p.type === "BETTER_LUCK_NEXT_TIME") || prizes[0];
      }
    }

    if (!selectedPrize) {
      return c.json(
        { success: false, error: "Rất tiếc, bạn không quay trúng gì cả." },
        400
      );
    }

    // Process prize
    await prisma.luckyWheelPrize.update({
      where: { id: selectedPrize.id },
      data: { remaining: { decrement: 1 } },
    });

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

    if (selectedPrize.type === "MONEY" && selectedPrize.value > 0) {
      await prisma.payrollAdjustment.create({
        data: {
          userId: user.id,
          amount: Math.round(selectedPrize.value),
          reason: `Vòng Quay: ${selectedPrize.name}`,
          date: new Date(),
        },
      });
    }

    return c.json({
      success: true,
      prize: selectedPrize,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Internal error spinning wheel" },
      500
    );
  }
});
