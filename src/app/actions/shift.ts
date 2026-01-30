'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

    await prisma.workShift.create({
      data: {
        userId: user.id,
        start: start,
        end: end,
        shiftType: shift, // store original type for ref
        status: 'APPROVED'
      }
    });

    revalidatePath('/schedule');
    return { success: true, message: "Đăng ký thành công!" };
  } catch (e) {
    return { success: false, message: "Lỗi hoặc đã đăng ký ca này rồi." };
  }
}

export async function cancelShift(shiftId: number) {
  const session = await getServerSession(authOptions);
  // Validate ownership logic here if needed

  await prisma.workShift.delete({ where: { id: shiftId } });
  revalidatePath('/schedule');
  return { success: true, message: "Đã hủy ca." };
}

export async function assignCustomShift(userId: string, dateStr: string, startTime: string, endTime: string) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

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

    await prisma.workShift.create({
      data: {
        userId,
        start,
        end,
        shiftType: 'CUSTOM', // Type CUSTOM
        status: 'APPROVED'
      }
    });
    revalidatePath('/admin/schedule');
    return { success: true, message: "Đã gán ca thành công!" };
  } catch (e) {
    return { success: false, message: "Lỗi: Có thể nhân viên đã có ca trùng giờ." };
  }
}

export async function toggleShiftSwap(shiftId: number, isOpen: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, message: "Unauthorized" };

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

  try {
    // Transaction: Assign to new user, Close swap status
    await prisma.workShift.update({
      where: { id: shiftId },
      data: {
        userId: user.id,
        isOpenForSwap: false
      }
    });
    revalidatePath('/schedule');
    return { success: true, message: "Đã nhận ca thành công! Đừng quên đi làm nhé." };
  } catch (e) {
    return { success: false, message: "Lỗi: Ca này có thể đã được người khác nhận." };
  }
}
