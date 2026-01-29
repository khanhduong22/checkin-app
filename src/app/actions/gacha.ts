'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const REWARDS = [
  { type: 'MONEY', value: 1000, message: '🧧 Lì xì 1k ăn kẹo!' },
  { type: 'MONEY', value: 2000, message: '💰 Lụm được 2k!' },
  { type: 'MONEY', value: 5000, message: '🤑 Nổ hũ 5k!' },
  { type: 'TITLE', value: 0, code: 'LUCKY_STAR', message: '🌟 Danh hiệu: Ngôi Sao May Mắn!' },
  { type: 'TITLE', value: 0, code: 'GACHA_KING', message: '👑 Danh hiệu: Vua Nhân Phẩm!' },
  { type: 'LUCK', value: 0, message: '🍀 Chúc bạn một ngày tốt lành!' },
  { type: 'LUCK', value: 0, message: '🌟 Hôm nay bạn tỏa sáng lắm!' },
  { type: 'JOKE', value: 0, message: '🤡 Đừng ngủ gật nhé!' },
];

export async function rollGacha(userId: string) {
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

  // 3. Roll
  const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)];

  // 4. Save Logic
  if (reward.type === 'TITLE' && reward.code) {
    // Save Title
    try {
      await prisma.userAchievement.create({
        data: {
          userId,
          code: reward.code
        }
      });
    } catch (e) {
      // Already owns title -> Fallback to money lol
      reward.message = "Bạn đã có danh hiệu này, nhận tạm 1k nhé!";
      reward.value = 1000;
    }
  }

  // Always log to Adjustment to mark as "Rolled Today" (even if amount is 0)
  await prisma.payrollAdjustment.create({
    data: {
      userId,
      amount: reward.value,
      reason: `[Gacha] ${reward.message}`
    }
  });

  revalidatePath('/');
  return { success: true, reward };
}
