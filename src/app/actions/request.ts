'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { invalidatePayrollCache } from "@/lib/payroll";
import { invalidateUserStatsCache } from "@/lib/stats";

export async function submitRequest(dateStr: string, type: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  try {
    await prisma.request.create({
      data: {
        userId: user.id,
        date: new Date(dateStr),
        type,
        reason,
        status: 'PENDING'
      }
    });

    if (type === 'EARLY_LEAVE') {
      await invalidateUserStatsCache(user.id);
    }

    revalidatePath('/requests');
    revalidatePath('/admin/requests');
    revalidatePath('/admin');
    return { success: true, message: "Đã gửi yêu cầu!" };
  } catch (e) {
    return { success: false, message: "Lỗi hệ thống." };
  }
}

export async function approveRequest(id: number) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Không tìm thấy yêu cầu" };

  await prisma.request.update({
    where: { id },
    data: { status: 'APPROVED' }
  });

  await invalidatePayrollCache();
  await invalidateUserStatsCache(existing.userId);

  revalidatePath('/admin/requests');
  revalidatePath('/requests');
  revalidatePath('/');
  revalidatePath('/payroll');
  revalidatePath('/admin/payroll');
  revalidatePath(`/admin/employees/${existing.userId}`);
  return { success: true, message: "Đã duyệt." };
}

export async function rejectRequest(id: number) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Không tìm thấy yêu cầu" };

  await prisma.request.update({
    where: { id },
    data: { status: 'REJECTED' }
  });

  await invalidatePayrollCache();
  await invalidateUserStatsCache(existing.userId);

  revalidatePath('/admin/requests');
  revalidatePath('/requests');
  revalidatePath('/');
  revalidatePath('/payroll');
  revalidatePath('/admin/payroll');
  revalidatePath(`/admin/employees/${existing.userId}`);
  return { success: true, message: "Đã từ chối." };
}

