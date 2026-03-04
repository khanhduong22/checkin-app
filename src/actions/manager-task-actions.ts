"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type ManagerTaskInput = {
  title: string;
  description?: string;
  isUrgent?: boolean;
  isImportant?: boolean;
  status?: string;
  assigneeId?: string | null;
  parentId?: string | null;
  deadline?: Date | null;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function getManagerTasks() {
  try {
    await requireAdmin();
    const tasks = await prisma.managerTask.findMany({
      where: { parentId: null }, // top-level only, subtasks via relation
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: tasks };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createManagerTask(data: ManagerTaskInput) {
  try {
    const session = await requireAdmin();
    const task = await prisma.managerTask.create({
      data: {
        ...data,
        createdById: (session.user as any).id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: { include: { assignee: { select: { id: true, name: true, email: true, image: true } } } },
      },
    });
    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateManagerTask(id: string, data: Partial<ManagerTaskInput>) {
  try {
    await requireAdmin();
    const task = await prisma.managerTask.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: { include: { assignee: { select: { id: true, name: true, email: true, image: true } } } },
      },
    });
    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteManagerTask(id: string) {
  try {
    await requireAdmin();
    await prisma.managerTask.deleteMany({ where: { parentId: id } }); // delete subtasks first
    await prisma.managerTask.delete({ where: { id } });
    revalidatePath("/admin/manager-tasks");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
