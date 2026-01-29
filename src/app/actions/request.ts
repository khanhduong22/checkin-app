'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
    revalidatePath('/requests');
    return { success: true, message: "Đã gửi yêu cầu!" };
  } catch (e) {
    return { success: false, message: "Lỗi hệ thống." };
  }
}

export async function approveRequest(id: number) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  await prisma.request.update({
    where: { id },
    data: { status: 'APPROVED' }
  });
  revalidatePath('/admin/requests');
  return { success: true, message: "Đã duyệt." };
}

export async function rejectRequest(id: number) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  await prisma.request.update({
    where: { id },
    data: { status: 'REJECTED' }
  });
  revalidatePath('/admin/requests');
  return { success: true, message: "Đã từ chối." };
}
