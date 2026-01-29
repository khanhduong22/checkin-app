'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- IP Management ---

export async function addAllowedIP(prefix: string, label: string) {
  try {
    await prisma.allowedIP.create({
      data: { prefix, label }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã thêm IP thành công' };
  } catch (e) {
    return { success: false, message: 'Lỗi: IP này có thể đã tồn tại' };
  }
}

export async function deleteAllowedIP(id: number) {
  try {
    await prisma.allowedIP.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true, message: 'Đã xóa IP' };
  } catch (e) {
    return { success: false, message: 'Lỗi khi xóa IP' };
  }
}

// --- User Management ---

export async function updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật quyền hạn' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

export async function updateUserRate(userId: string, hourlyRate: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hourlyRate }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật lương' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

export async function updateUserName(userId: string, name: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { name }
        });
        revalidatePath('/admin');
        return { success: true, message: 'Đã cập nhật tên' };
    } catch (e) {
        return { success: false, message: 'Lỗi cập nhật tên' };
    }
}
