'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const REWARDS = [
  { type: 'MONEY', value: 1000, message: '🧧 Lì xì 1k ăn kẹo!' },
  { type: 'MONEY', value: 2000, message: '💰 Lụm được 2k!' },
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
  // Optimization: Save roll history. For now, we trust the client state or check adjustments logic?
  // Let's create a special adjustment for "Gacha" to track history.

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

  // 4. Save
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
