"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin role required");
  }
  return session;
}

export async function getWeekBounds(date: Date) {
  const vnNow = new Date(date.getTime() + VN_OFFSET_MS);
  const currentDay = vnNow.getUTCDay(); // 0 = Sun, 1 = Mon... 6 = Sat
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const weekStartLocal = new Date(vnNow);
  weekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
  weekStartLocal.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(weekStartLocal.getTime() - VN_OFFSET_MS);

  const weekEndLocal = new Date(weekStartLocal);
  weekEndLocal.setUTCDate(weekStartLocal.getUTCDate() + 6);
  weekEndLocal.setUTCHours(23, 59, 59, 999);
  const weekEnd = new Date(weekEndLocal.getTime() - VN_OFFSET_MS);

  return { weekStart, weekEnd };
}

export async function getManagerWeeklyTasks(userId: string, dateStr: string) {
  try {
    await requireAdmin();
    const currentDate = new Date(dateStr + "T00:00:00+07:00");
    const { weekStart } = await getWeekBounds(currentDate);

    const tasks = await prisma.managerWeeklyTask.findMany({
      where: {
        assigneeId: userId,
        weekStart: weekStart,
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: tasks };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createManagerWeeklyTask(
  title: string,
  description: string | null,
  assigneeId: string,
  dateStr: string
) {
  try {
    await requireAdmin();
    const currentDate = new Date(dateStr + "T00:00:00+07:00");
    const { weekStart, weekEnd } = await getWeekBounds(currentDate);

    const task = await prisma.managerWeeklyTask.create({
      data: {
        title,
        description,
        assigneeId,
        weekStart,
        weekEnd,
        completed: false,
      },
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateManagerWeeklyTask(
  id: string,
  title: string,
  description: string | null
) {
  try {
    await requireAdmin();

    const task = await prisma.managerWeeklyTask.update({
      where: { id },
      data: {
        title,
        description,
      },
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteManagerWeeklyTask(id: string) {
  try {
    await requireAdmin();

    await prisma.managerWeeklyTask.delete({
      where: { id },
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleManagerWeeklyTask(id: string, completed: boolean) {
  try {
    await requireAdmin();

    const task = await prisma.managerWeeklyTask.update({
      where: { id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    revalidatePath("/admin/manager-tasks");
    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/${task.assigneeId}`);
    revalidatePath("/payroll");

    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function reportAndCarryOverWeeklyTask(taskId: string, explanation: string) {
  try {
    await requireAdmin();

    const task = await prisma.managerWeeklyTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, error: "Nhiệm vụ không tồn tại" };
    }

    // 1. Update current task with explanation
    const updatedTask = await prisma.managerWeeklyTask.update({
      where: { id: taskId },
      data: { explanation },
    });

    // 2. Create copy for next week
    const nextWeekStart = new Date(task.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(task.weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const carriedOverTask = await prisma.managerWeeklyTask.create({
      data: {
        title: task.title,
        description: task.description ? `${task.description} (Chuyển tiếp)` : "(Chuyển tiếp từ tuần trước)",
        assigneeId: task.assigneeId,
        weekStart: nextWeekStart,
        weekEnd: nextWeekEnd,
        completed: false,
        isCarriedOver: true,
      },
    });

    // 3. Create Request of type WEEKLY_TASK
    await prisma.request.create({
      data: {
        userId: task.assigneeId,
        date: new Date(),
        type: "WEEKLY_TASK",
        reason: `[Giải trình việc tuần: ${task.title}] Lý do: ${explanation}. Đã chuyển tiếp sang tuần sau.`,
        status: "PENDING",
      },
    });

    revalidatePath("/admin/manager-tasks");
    revalidatePath("/requests");

    return { success: true, data: { updatedTask, carriedOverTask } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function verifyWeeklyChecklistComplete(userId: string, dateStr: string) {
  try {
    const currentDate = new Date(dateStr + "T00:00:00+07:00");
    const { weekStart, weekEnd } = await getWeekBounds(currentDate);

    // Find future shifts in the same week
    const tomorrowStart = new Date(currentDate);
    tomorrowStart.setDate(currentDate.getDate() + 1);
    const tomorrowStartUTC = new Date(tomorrowStart.getTime() - VN_OFFSET_MS);
    const weekEndUTC = new Date(weekEnd.getTime());

    const futureShift = await prisma.workShift.findFirst({
      where: {
        userId,
        start: {
          gte: tomorrowStartUTC,
          lte: weekEndUTC,
        },
        status: "APPROVED",
      },
    });

    // If there is a future shift this week, today is not the last working day of the week
    if (futureShift) {
      return { success: true };
    }

    // Today is the last working day of the week, check weekly tasks
    const weeklyTasks = await prisma.managerWeeklyTask.findMany({
      where: {
        assigneeId: userId,
        weekStart: weekStart,
      },
    });

    // Filter for incomplete weekly tasks without explanation
    const incompleteTasks = weeklyTasks.filter(
      (t) => !t.completed && (!t.explanation || t.explanation.trim() === "")
    );

    if (incompleteTasks.length > 0) {
      return {
        success: false,
        message: `⚠️ Không thể Check-out! Bạn còn ${incompleteTasks.length} nhiệm vụ tuần chưa hoàn thành. Vui lòng hoàn thành hoặc báo cáo giải trình lý do và chuyển việc sang tuần sau để được Check-out.`,
      };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
