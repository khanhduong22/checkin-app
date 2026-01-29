'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(title: string, content: string, type: string) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  await prisma.announcement.create({
    data: { title, content, type, active: true }
  });
  revalidatePath('/');
  return { success: true, message: "Đã đăng thông báo!" };
}

export async function toggleAnnouncement(id: string, active: boolean) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') return { success: false, message: "Forbidden" };

  await prisma.announcement.update({
    where: { id },
    data: { active }
  });
  revalidatePath('/');
  return { success: true, message: "Đã cập nhật!" };
}
