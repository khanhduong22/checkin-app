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

  // Get available prizes (active and remaining > 0)
  const prizes = await prisma.luckyWheelPrize.findMany({
    where: { active: true, remaining: { gt: 0 } }
  });

  if (prizes.length === 0) {
    return { success: false, message: 'Kho quà đã hết sạch rồi!' };
  }

  // Weighted Random Algorithm
  const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
  let random = Math.random() * 100; // 0 - 100

  // Adjust random range if total prob is less than 100 (optional, or just treat > total as "Miss")
  // If we want "Miss" to be explicit, ensure there's a "Miss" prize or handle logic here.
  // Based on user's seed, there is a "Better luck next time" prize with high probability.

  // However, if the configured probabilities don't sum to exactly 100, we should normalize or handle the gap.
  // Approach: If random > totalProbability, it's a "Miss" (or pick a default fallback if configured).
  // Let's assume the user configured prizes cover the range or we have a default "Miss".
  // If nothing matches, we'll return a generic "Chúc may mắn lần sau" without DB record implies no prize.
  // OR we pick the "Better Luck Next Time" prize if it exists in the fetched list.

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
    // Fallback if random > all probabilities (and probabilities < 100)
    // Check if there's a "Better Luck Next Time" or similar default
    selectedPrize = prizes.find(p => p.type === 'BETTER_LUCK_NEXT_TIME');
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
