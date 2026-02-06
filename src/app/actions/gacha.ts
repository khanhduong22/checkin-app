'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";



export async function rollGacha(userId: string) {
  /* 
     ALLOW ADMIN TO BYPASS CHECKS 
     Fetching user role to determine if restrictions apply.
  */
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, message: 'Không tìm thấy người dùng' };

  if (user.role !== 'ADMIN') {
    // 1. Check if check-in today?
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkin = await prisma.checkIn.findFirst({
      where: {
        userId,
        timestamp: { gte: today },
        type: 'checkin'
      }
    });

    if (!checkin) return { success: false, message: 'Chấm công trước đã bạn êii!' };

    // 2. Check if already rolled today?
    const existingRoll = await prisma.payrollAdjustment.findFirst({
      where: {
        userId,
        date: { gte: today },
        reason: { contains: '[Gacha]' }
      }
    });

    if (existingRoll) return { success: false, message: 'Mỗi ngày 1 lượt thôi tham thế! 🌚' };
  }

  // 3. Roll Logic (Database Driven)
  const prizes = await prisma.luckyWheelPrize.findMany({
    where: { active: true, remaining: { gt: 0 } }
  });

  if (prizes.length === 0) {
    return { success: false, message: 'Kho quà tạm thời hết sạch rồi! Quay lại sau nhé.' };
  }

  // Weighted Random Algorithm
  const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);
  let random = Math.random() * totalProbability;

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
    // Fallback (should rarely happen if math is right)
    selectedPrize = prizes[0];
  }

  // 4. Process Prize & Save
  try {
    // Decrement Quantity
    await prisma.luckyWheelPrize.update({
      where: { id: selectedPrize.id },
      data: { remaining: { decrement: 1 } }
    });

    // Create History (Unified with Lucky Wheel)
    await prisma.luckyWheelHistory.create({
      data: {
        userId,
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name
      }
    });

    // Handle Prize Types for User State
    let logMessage = selectedPrize.name;

    if (selectedPrize.type === 'TITLE') {
      // Try to give title
      const existingAch = await prisma.userAchievement.findUnique({
        where: { userId_code: { userId, code: selectedPrize.name } }
      });

      if (!existingAch) {
        await prisma.userAchievement.create({
          data: {
            userId,
            code: selectedPrize.name,
            title: selectedPrize.name,
            description: selectedPrize.description || "Nhận được từ Gacha",
            icon: "🎰"
          }
        });
        logMessage = `[Title] ${selectedPrize.name}`;
      } else {
        logMessage = `[Duplicate Title] ${selectedPrize.name}`;
      }
    }

    // Money Handling & "Rolled Today" Locking
    // We use PayrollAdjustment to RECORD the transaction (if money) AND/OR Lock the day (via reason tag)
    // The original code used `reason: { contains: '[Gacha]' }` to check lock.
    // So we MUST include '[Gacha]' in the reason.

    const moneyValue = (selectedPrize.type === 'MONEY' && selectedPrize.value) ? selectedPrize.value : 0;

    await prisma.payrollAdjustment.create({
      data: {
        userId,
        amount: moneyValue,
        reason: `[Gacha] ${logMessage}`
      }
    });

    revalidatePath('/');
    revalidatePath('/lucky-wheel');

    return {
      success: true,
      reward: {
        type: selectedPrize.type,
        value: moneyValue,
        message: selectedPrize.name,
        // Frontend uses these keys. 
        // 'code' was used for title but frontend GachaButton doesn't seem to use it explicitly other than icon logic?
        // The frontend checks `reward.type === 'MONEY' | 'TITLE'`.
      }
    };

  } catch (error) {
    console.error("Gacha Error:", error);
    return { success: false, message: 'Có lỗi xảy ra khi nhận quà. Vui lòng thử lại.' };
  }
}
