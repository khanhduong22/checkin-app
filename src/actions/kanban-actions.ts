"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updateTaskItemStatus(id: string, status: string) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    await prisma.taskItem.update({ where: { id }, data: { status } });
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

export async function updateTaskItemAssignee(id: string, assigneeId: string | null) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    await prisma.taskItem.update({ where: { id }, data: { assigneeId } });
    revalidatePath("/admin/tasks");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update assignee" };
  }
}

export async function updateTaskItemFull(
  id: string,
  data: {
    title?: string;
    description?: string;
    deadline?: Date | null;
    assigneeId?: string | null;
    status?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const updated = await prisma.taskItem.update({ where: { id }, data });
    revalidatePath("/admin/tasks");
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update task item" };
  }
}

export async function getUsers() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: users };
  } catch {
    return { success: false, error: "Failed to fetch users" };
  }
}
