'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerShift(start: Date, end: Date, override: boolean = false) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (duration < 4) return { success: false, error: 'Thời gian làm việc tối thiểu 4 tiếng!' };

  const email = session.user.email;
  if (!email) return { success: false, error: 'No email' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: 'User not found' };

  // Check self overlap
  const overlap = await prisma.workShift.count({
    where: {
      userId: user.id,
      OR: [
        { start: { lte: start }, end: { gt: start } },
        { start: { lt: end }, end: { gte: end } },
        { start: { gte: start }, end: { lte: end } }
      ]
    }
  });

  if (overlap > 0) return { success: false, error: 'Bạn đã có lịch đăng ký trùng giờ này!' };

  // PART_TIME Limit Validation
  // Only check if Current User is PART_TIME (or if enforcing globally, but usually Full Time don't count towards Part Time limit)
  // Assuming limit is "Max 2 Part-time employees working at the same time".
  if (user.employmentType === 'PART_TIME') {
    const overlappingShifts = await prisma.workShift.findMany({
      where: {
        OR: [
          { start: { lte: start }, end: { gt: start } },
          { start: { lt: end }, end: { gte: end } },
          { start: { gte: start }, end: { lte: end } }
        ]
      },
      include: { user: true }
    });

    const partTimeCount = overlappingShifts.reduce((count, s) => {
      // Count only distinct users?
      // Assuming shifts don't overlap for same user (checked above).
      if (s.user.employmentType === 'PART_TIME' || (s.user as any).employmentType === 'PART_TIME') return count + 1;
      return count;
    }, 0);

    if (partTimeCount >= 2) {
      if (override) {
        if (user.role !== 'ADMIN') return { success: false, error: 'Cần quyền Admin để vượt giới hạn nhân sự!' };
        // Allowed
      } else {
        // Return special error code for UI to handle (Show popup if Admin)
        if (user.role === 'ADMIN') {
          return { success: false, error: 'LIMIT_PART_TIME', count: partTimeCount };
        } else {
          return { success: false, error: 'Đã đủ số lượng nhân viên Part-time (2/2) trong khung giờ này.' };
        }
      }
    }
  }

  try {
    const newShift = await prisma.workShift.create({
      data: {
        userId: user.id,
        start: start,
        end: end,
        status: 'APPROVED'
      }
    });
    revalidatePath('/schedule');
    return { success: true, id: newShift.id };
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

export async function updateShift(shiftId: number, start: Date, end: Date) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  const existing = await prisma.workShift.findUnique({ where: { id: shiftId } });

  if (!existing) return { success: false, error: 'Not found' };

  if (user?.role !== 'ADMIN' && existing.userId !== user?.id) {
    return { success: false, error: 'Forbidden' };
  }

  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (duration < 4) return { success: false, error: 'Tối thiểu 4 tiếng!' };

  await prisma.workShift.update({
    where: { id: shiftId },
    data: { start, end }
  });

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
  return { success: true };
}
