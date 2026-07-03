'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isShiftLocked } from "@/lib/schedule-lock";
import { logShiftAction } from "@/lib/audit";

export async function registerShift(dateStr: string, shift: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  try {
    const date = new Date(dateStr);
    // Normalize to midnight UTC or specific timezone handling if needed
    // For simplicity, let's just use the Input Date (YYYY-MM-DD) as UTC midnight
    // Convert old shift types to new time range
    const start = new Date(date);
    const end = new Date(date);

    // Default hours
    if (shift === 'MORNING') {
      start.setHours(8, 0, 0, 0);
      end.setHours(12, 0, 0, 0);
    } else if (shift === 'AFTERNOON') {
      start.setHours(13, 30, 0, 0);
      end.setHours(17, 30, 0, 0);
    } else { // FULL or others
      start.setHours(8, 0, 0, 0);
      end.setHours(17, 0, 0, 0);
    }

    if (user.role !== 'ADMIN' && isShiftLocked(start)) {
      return { success: false, message: "Lịch làm việc của tuần này đã được chốt, không thể thay đổi!" };
    }

    const newShift = await prisma.workShift.create({
      data: {
        userId: user.id,
        start: start,
        end: end,
        shiftType: shift, // store original type for ref
        status: 'APPROVED'
      }
    });

    await logShiftAction({
      shiftId: newShift.id,
      userId: user.id,
      action: 'CREATE',
      changedById: user.id,
      newStart: start,
      newEnd: end
    });

    revalidatePath('/schedule');
    return { success: true, message: "Đăng ký thành công!" };
  } catch (e) {
    return { success: false, message: "Lỗi hoặc đã đăng ký ca này rồi." };
  }
}

export async function cancelShift(shiftId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  const existing = await prisma.workShift.findUnique({ where: { id: shiftId } });
  if (!existing) return { success: false, message: "Ca làm không tồn tại" };

  if (user.role !== 'ADMIN' && isShiftLocked(existing.start)) {
    return { success: false, message: "Lịch làm việc của tuần này đã được chốt, không thể thay đổi!" };
  }

  await logShiftAction({
    shiftId: existing.id,
    userId: existing.userId,
    action: 'DELETE',
    changedById: user.id,
    oldStart: existing.start,
    oldEnd: existing.end
  });

  await prisma.workShift.delete({ where: { id: shiftId } });
  revalidatePath('/schedule');
  return { success: true, message: "Đã hủy ca." };
}

export async function assignCustomShift(userId: string, dateStr: string, startTime: string, endTime: string) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  const admin = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!admin) return { success: false, message: "Admin user not found" };

  try {
    const date = new Date(dateStr);

    // Create Date objects from time strings
    const start = new Date(date);
    const [startH, startM] = startTime.split(':').map(Number);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(date);
    const [endH, endM] = endTime.split(':').map(Number);
    end.setHours(endH, endM, 0, 0);

    // Validate end > start
    if (end <= start) return { success: false, message: "Giờ kết thúc phải sau giờ bắt đầu" };

    const newShift = await prisma.workShift.create({
      data: {
        userId,
        start,
        end,
        shiftType: 'CUSTOM', // Type CUSTOM
        status: 'APPROVED'
      }
    });

    await logShiftAction({
      shiftId: newShift.id,
      userId,
      action: 'CREATE',
      changedById: admin.id,
      newStart: start,
      newEnd: end
    });

    revalidatePath('/admin/schedule');
    return { success: true, message: "Đã gán ca thành công!" };
  } catch (e) {
    return { success: false, message: "Lỗi: Có thể nhân viên đã có ca trùng giờ." };
  }
}

export async function toggleShiftSwap(shiftId: number, isOpen: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  const existing = await prisma.workShift.findUnique({ where: { id: shiftId } });
  if (!existing) return { success: false, message: "Ca làm không tồn tại" };

  if (user.role !== 'ADMIN' && isShiftLocked(existing.start)) {
    return { success: false, message: "Lịch làm việc của tuần này đã được chốt, không thể thay đổi!" };
  }

  try {
    await prisma.workShift.update({
      where: { id: shiftId },
      data: { isOpenForSwap: isOpen }
    });
    revalidatePath('/schedule');
    return { success: true, message: isOpen ? "Đã đăng lên chợ đổi ca!" : "Đã gỡ khỏi chợ." };
  } catch (e) {
    return { success: false, message: "Lỗi hệ thống." };
  }
}

export async function takeShift(shiftId: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  const existing = await prisma.workShift.findUnique({ where: { id: shiftId } });
  if (!existing) return { success: false, message: "Ca làm không tồn tại" };

  if (user.role !== 'ADMIN' && isShiftLocked(existing.start)) {
    return { success: false, message: "Lịch làm việc của tuần này đã được chốt, không thể thay đổi!" };
  }

  // Check self overlap for the user taking the shift
  const overlap = await prisma.workShift.count({
    where: {
      userId: user.id,
      OR: [
        { start: { lte: existing.start }, end: { gt: existing.start } },
        { start: { lt: existing.end }, end: { gte: existing.end } },
        { start: { gte: existing.start }, end: { lte: existing.end } }
      ]
    }
  });

  if (overlap > 0) return { success: false, message: "Bạn đã có lịch làm trùng với khung giờ của ca này!" };

  try {
    // Transaction: Assign to new user, Close swap status
    await prisma.workShift.update({
      where: { id: shiftId },
      data: {
        userId: user.id,
        isOpenForSwap: false
      }
    });

    await logShiftAction({
      shiftId: existing.id,
      userId: user.id,
      action: 'TAKE_SWAP',
      changedById: user.id,
      oldStart: existing.start,
      oldEnd: existing.end,
      newStart: existing.start,
      newEnd: existing.end
    });

    revalidatePath('/schedule');
    return { success: true, message: "Đã nhận ca thành công! Đừng quên đi làm nhé." };
  } catch (e) {
    return { success: false, message: "Lỗi: Ca này có thể đã được người khác nhận." };
  }
}
