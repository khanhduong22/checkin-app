'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function spinWheel() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { success: false, message: 'Bạn cần đăng nhập để quay!' };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { achievements: true }
  });

  if (!user) return { success: false, message: 'Không tìm thấy thông tin người dùng.' };

  // --- 🛡️ PERMISSION CHECK (Bypass for ADMIN) ---
  if (user.role !== 'ADMIN') {
    // --- BẬT / TẮT QUYỀN VÒNG QUAY CHI TIẾT TỪ ADMIN PANEL ---
    // @ts-ignore (If typescript complains about new column before restart)
    if (!user.luckyWheelAllowed) {
      return { success: false, message: 'Rất tiếc! Sự kiện rút thăm hôm nay không dành cho tài khoản của bạn. Hẹn bạn dịp khác nhé!' };
    }

    const now = new Date();
    // Get VN Day String YYYY-MM-DD to define "Today" in VN Timezone
    const vnDateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

    // Define 00:00:00 to 23:59:59 VN Time
    const startOfDay = new Date(`${vnDateString}T00:00:00+07:00`);
    const endOfDay = new Date(`${vnDateString}T23:59:59.999+07:00`);

    // 1. Check Attendance (Must Check-in first)
    const hasCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId: user.id,
        timestamp: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (!hasCheckIn) {
      return { success: false, message: '⛔️ Bạn chưa điểm danh hôm nay! Hãy Check-in trước khi quay nhé.' };
    }

    // 2. Check Daily Limit (1 Spin/Day)
    const hasSpun = await prisma.luckyWheelHistory.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (hasSpun) {
      return { success: false, message: '⏳ Mỗi ngày chỉ được quay 1 lần. Hẹn bạn ngày mai nhé!' };
    }
  }
  // ---------------------------------------------------

  // Get available prizes (active and remaining > 0)
  const prizes = await prisma.luckyWheelPrize.findMany({
    where: { active: true, remaining: { gt: 0 } }
  });

  if (prizes.length === 0) {
    return { success: false, message: 'Kho quà đã hết sạch rồi!' };
  }

  // Draw Mode vs Probability Mode check
  // If we have <= 24 total remaining items, we enter "Draw Mode" to guarantee X winners out of Y spins.
  const totalRemaining = prizes.reduce((sum, prize) => sum + prize.remaining, 0);
  const isDrawMode = totalRemaining > 0 && totalRemaining <= 24;

  let selectedPrize = null;

  if (isDrawMode) {
      // 🎲 Draw Without Replacement Mode (Bốc thăm)
      // Pick a random ticket out of the `totalRemaining` pool
      let randomHit = Math.floor(Math.random() * totalRemaining);
      let accumulatedRemain = 0;
      
      for (const prize of prizes) {
          accumulatedRemain += prize.remaining;
          if (randomHit < accumulatedRemain) {
              selectedPrize = prize;
              break;
          }
      }
  } else {
      // 📊 Standard Weighted Probability Mode
      const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
      let random = Math.random() * totalProbability;
      
      let accumulatedProb = 0;
      for (const prize of prizes) {
        accumulatedProb += prize.probability;
        if (random <= accumulatedProb) {
          selectedPrize = prize;
          break;
        }
      }

      if (!selectedPrize) {
        selectedPrize = prizes.find(p => p.type === 'BETTER_LUCK_NEXT_TIME');
      }
  }

  if (!selectedPrize) {
    return { success: false, message: 'Rất tiếc, bạn không quay trúng gì cả.' };
  }

  // Process the win
  try {
    // 1. Decrement remaining
    await prisma.luckyWheelPrize.update({
      where: { id: selectedPrize.id },
      data: { remaining: { decrement: 1 } }
    });

    // 2. Add to History
    await prisma.luckyWheelHistory.create({
      data: {
        userId: user.id,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name
      }
    });

    // 3. If Type is TITLE (Danh hiệu), add to UserAchievement
    if (selectedPrize.type === 'TITLE') {
      // Check if user already has this title to avoid duplicates? 
      // Or just give it again with new timestamp.
      // Let's check duplicate prevention for "TITLE" type if generic.
      // Assuming "name" or "description" is the code. Let's use name as code or derive it.
      // Seed said "Danh hiệu: Bàn tay vàng". Code could be "BAN_TAY_VANG".
      // Implementation: Just create a generic achievement or try to parse.
      // For now, let's create an achievement with code = Prize Name.

      const existingAch = user.achievements.find(a => a.code === selectedPrize!.name);
      if (!existingAch) {
        await prisma.userAchievement.create({
          data: {
            userId: user.id,
            code: selectedPrize.name,
            title: selectedPrize.name,
            description: selectedPrize.description || "Nhận được từ Vòng Quay May Mắn",
            icon: "🎰"
          }
        });
      }
    }

    // 4. Money Logic (Auto-Payroll)
    if (selectedPrize.type === 'MONEY' && (selectedPrize as any).value > 0) {
      await prisma.payrollAdjustment.create({
        data: {
          userId: user.id,
          amount: Math.round((selectedPrize as any).value),
          reason: `Vòng Quay: ${selectedPrize.name}`,
          date: new Date()
        }
      });
    }

    revalidatePath('/lucky-wheel');
    revalidatePath('/admin/lucky-wheel');
    revalidatePath('/admin/payroll');

    return {
      success: true,
      prize: selectedPrize
    };

  } catch (e) {
    console.error(e);
    return { success: false, message: 'Lỗi hệ thống khi nhận giải' };
  }
}
