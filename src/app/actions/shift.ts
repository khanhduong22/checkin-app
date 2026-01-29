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

    await prisma.workShift.create({
      data: {
        userId: user.id,
        date: date,
        shift: shift,
        status: 'APPROVED' // Auto approve for now
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
