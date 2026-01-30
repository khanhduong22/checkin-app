'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerShift(start: Date, end: Date) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (duration < 4) return { success: false, error: 'Thời gian làm việc tối thiểu 4 tiếng!' };

  // Get user id from session or db
  const email = session.user.email;
  if (!email) return { success: false, error: 'No email' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: 'User not found' };

  // Check overlap? For now, trust user or UI to prevent crazy overlaps.
  // Or simple check:
  const overlap = await prisma.workShift.count({
    where: {
      userId: user.id,
      OR: [
        { start: { lte: start }, end: { gt: start } }, // New start is inside existing
        { start: { lt: end }, end: { gte: end } },     // New end is inside existing
        { start: { gte: start }, end: { lte: end } }   // New covers existing
      ]
    }
  });

  if (overlap > 0) return { success: false, error: 'Bạn đã có lịch đăng ký trùng giờ này!' };

  try {
    await prisma.workShift.create({
      data: {
        userId: user.id,
        start: start,
        end: end,
        status: 'APPROVED'
      }
    });
    revalidatePath('/schedule');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Lỗi khi lưu lịch làm' };
  }
}

export async function deleteShift(shiftId: number) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email: email! } });
  if (!user) return { success: false };

  await prisma.workShift.deleteMany({
    where: {
      id: shiftId,
      userId: user.role === 'ADMIN' ? undefined : user.id
    }
  });
  revalidatePath('/schedule');
  return { success: true };
}
