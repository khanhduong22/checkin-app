"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type StaffTaskInput = {
  title: string;
  description?: string | null;
  status?: string;
  assigneeId: string;
  startDate?: Date | null;
  deadline?: Date | null;
  adminNote?: string | null;
  evidenceLink?: string | null;
  evidenceNote?: string | null;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin role required");
  }
  return session;
}

async function requireUserOrAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized: Login required");
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! }
  });
  if (!user) {
    throw new Error("User not found");
  }
  return { session, user };
}

export async function getStaffTasks(userId?: string) {
  try {
    const { user } = await requireUserOrAdmin();
    const isAdmin = user.role === "ADMIN";

    let targetUserId = userId;
    if (!isAdmin) {
      // Regular users can only access their own tasks
      if (!user.staffTasksAllowed) {
        return { success: false, error: "Bạn không có quyền truy cập Công việc và KPI" };
      }
      targetUserId = user.id;
    }

    const whereClause: any = {};
    if (targetUserId) {
      whereClause.assigneeId = targetUserId;
    }

    const tasks = await prisma.staffTask.findMany({
      where: whereClause,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: tasks };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createStaffTask(data: StaffTaskInput) {
  try {
    const session = await requireAdmin();
    const task = await prisma.staffTask.create({
      data: {
        ...data,
        createdById: (session.user as any).id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    revalidatePath("/staff-tasks");
    revalidatePath("/admin/staff-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateStaffTask(id: string, data: Partial<StaffTaskInput>) {
  try {
    const { user } = await requireUserOrAdmin();
    const isAdmin = user.role === "ADMIN";

    const task = await prisma.staffTask.findUnique({
      where: { id }
    });

    if (!task) {
      return { success: false, error: "Không tìm thấy công việc" };
    }

    if (!isAdmin) {
      if (task.assigneeId !== user.id) {
        return { success: false, error: "Không có quyền chỉnh sửa công việc này" };
      }
      
      // Staff can only update task status (TODO -> DOING -> DONE) and evidence fields
      const allowedKeys = ["status", "evidenceLink", "evidenceNote"];
      const extraKeys = Object.keys(data).filter(k => !allowedKeys.includes(k));
      if (extraKeys.length > 0) {
        return { success: false, error: "Nhân viên chỉ có quyền cập nhật trạng thái công việc" };
      }

      const newStatus = data.status;
      if (newStatus === undefined) {
        return { success: false, error: "Trạng thái công việc không được để trống" };
      }
      if (!["TODO", "DOING", "DONE"].includes(newStatus)) {
        return { success: false, error: "Trạng thái không hợp lệ cho nhân viên" };
      }

      const updateData: any = { status: newStatus };
      if (newStatus === "DONE") {
        updateData.submittedAt = new Date();
        updateData.evidenceLink = data.evidenceLink || null;
        updateData.evidenceNote = data.evidenceNote || null;
      }

      const updated = await prisma.staffTask.update({
        where: { id },
        data: updateData,
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
          createdBy: { select: { id: true, name: true } },
        }
      });
      revalidatePath("/staff-tasks");
      return { success: true, data: updated };
    }

    // Admin can update everything
    const updateData: any = { ...data };
    const isRejecting = data.status === "REJECTED" && task.status !== "REJECTED";

    if (data.status === "APPROVED") {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.staffTask.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
      }
    });

    // Send email notification on rejection
    if (isRejecting && updated.assignee.email) {
      try {
        const { sendTaskRejectionEmail } = await import("@/lib/email");
        const appUrl = process.env.NEXTAUTH_URL || "http://localhost:5000";
        await sendTaskRejectionEmail({
          employeeName: updated.assignee.name || "Nhân viên",
          employeeEmail: updated.assignee.email,
          taskTitle: updated.title,
          adminNote: updated.adminNote || "Không có ghi chú chi tiết.",
          taskUrl: `${appUrl}/staff-tasks`
        });
      } catch (err) {
        console.error("Failed to send rejection email:", err);
      }
    }

    revalidatePath("/staff-tasks");
    revalidatePath("/admin/staff-tasks");
    revalidatePath(`/admin/employees/${task.assigneeId}`);
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteStaffTask(id: string) {
  try {
    await requireAdmin();
    const task = await prisma.staffTask.delete({ where: { id } });
    revalidatePath("/staff-tasks");
    revalidatePath("/admin/staff-tasks");
    revalidatePath(`/admin/employees/${task.assigneeId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleUserStaffTasksAllowed(targetUserId: string, allowed: boolean) {
  try {
    await requireAdmin();
    await prisma.user.update({
      where: { id: targetUserId },
      data: { staffTasksAllowed: allowed }
    });
    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${targetUserId}`);
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getStaffTaskPerformanceStats(userId: string) {
  try {
    // 1. Get Vietnam Time boundaries
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    const vnNow = new Date(now.getTime() + VN_OFFSET_MS);

    // Monthly range
    const vnYear = vnNow.getUTCFullYear();
    const vnMonth = vnNow.getUTCMonth();
    const monthStart = new Date(Date.UTC(vnYear, vnMonth, 1) - VN_OFFSET_MS);
    const monthEnd = new Date(Date.UTC(vnYear, vnMonth + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

    // Weekly range (Mon-Sun in Vietnam time)
    const currentDay = vnNow.getUTCDay(); // 0 = Sun, 1 = Mon... 6 = Sat
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // calculate difference to Monday
    
    const weekStartLocal = new Date(vnNow);
    weekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
    weekStartLocal.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(weekStartLocal.getTime() - VN_OFFSET_MS);

    const weekEndLocal = new Date(weekStartLocal);
    weekEndLocal.setUTCDate(weekStartLocal.getUTCDate() + 6);
    weekEndLocal.setUTCHours(23, 59, 59, 999);
    const weekEnd = new Date(weekEndLocal.getTime() - VN_OFFSET_MS);

    // 2. Fetch tasks for user
    const extendedStartDate = new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const extendedEndDate = new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [monthlyTasksRaw, weeklyTasks] = await Promise.all([
      prisma.staffTask.findMany({
        where: {
          assigneeId: userId,
          OR: [
            { startDate: { gte: extendedStartDate, lte: extendedEndDate } },
            {
              AND: [
                { startDate: null },
                { createdAt: { gte: extendedStartDate, lte: extendedEndDate } }
              ]
            }
          ]
        }
      }),
      prisma.staffTask.findMany({
        where: {
          assigneeId: userId,
          OR: [
            { startDate: { gte: weekStart, lte: weekEnd } },
            {
              AND: [
                { startDate: null },
                { createdAt: { gte: weekStart, lte: weekEnd } }
              ]
            }
          ]
        }
      })
    ]);

    const getWeekThursday = (date: Date): Date => {
      const VN_OFFSET = 7 * 60 * 60 * 1000;
      const local = new Date(date.getTime() + VN_OFFSET);
      const day = local.getUTCDay();
      const diffToThursday = day === 0 ? -3 : 4 - day;
      const thursLocal = new Date(local);
      thursLocal.setUTCDate(local.getUTCDate() + diffToThursday);
      thursLocal.setUTCHours(12, 0, 0, 0);
      return new Date(thursLocal.getTime() - VN_OFFSET);
    };

    const monthlyTasks = monthlyTasksRaw.filter(t => {
      const dateToUse = t.startDate || t.createdAt || new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000);
      const thursday = getWeekThursday(dateToUse);
      return thursday >= monthStart && thursday <= monthEnd;
    });

    // 3. Compute stats
    const computeStats = (tasks: any[]) => {
      const total = tasks.length;
      const doing = tasks.filter(t => t.status === "DOING").length;
      const pendingReview = tasks.filter(t => t.status === "DONE").length;
      const todo = tasks.filter(t => t.status === "TODO").length;
      const rejected = tasks.filter(t => t.status === "REJECTED").length;

      const kpiAchieved = tasks.filter(t => 
        t.status === "APPROVED" || 
        t.status === "DONE" || 
        (t.status === "REJECTED" && (now.getTime() - new Date(t.updatedAt).getTime()) <= 24 * 60 * 60 * 1000)
      ).length;

      const overdue = tasks.filter(t => {
        if (t.status === "APPROVED" || t.status === "DONE") return false;
        if (t.status === "REJECTED") {
          const diffHours = (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
          if (diffHours <= 24) return false;
        }
        return t.deadline && new Date(t.deadline) < now;
      }).length;

      const completionRate = total === 0 ? 1.0 : kpiAchieved / total;

      return { total, approved: kpiAchieved, doing, pendingReview, todo, rejected, overdue, completionRate };
    };

    return {
      success: true,
      data: {
        monthly: computeStats(monthlyTasks),
        weekly: computeStats(weeklyTasks)
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getBatchStaffTaskPerformanceStats(userIds: string[]) {
  try {
    const { user } = await requireUserOrAdmin();
    const isAdmin = user.role === "ADMIN";

    let targetUserIds = userIds;
    if (!isAdmin) {
      if (!user.staffTasksAllowed) {
        return { success: false, error: "Bạn không có quyền truy cập Công việc và KPI" };
      }
      targetUserIds = [user.id];
    }

    if (targetUserIds.length === 0) {
      return { success: true, data: {} };
    }

    // 1. Get Vietnam Time boundaries
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    const vnNow = new Date(now.getTime() + VN_OFFSET_MS);

    // Monthly range
    const vnYear = vnNow.getUTCFullYear();
    const vnMonth = vnNow.getUTCMonth();
    const monthStart = new Date(Date.UTC(vnYear, vnMonth, 1) - VN_OFFSET_MS);
    const monthEnd = new Date(Date.UTC(vnYear, vnMonth + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

    // Weekly range (Mon-Sun in Vietnam time)
    const currentDay = vnNow.getUTCDay(); // 0 = Sun, 1 = Mon... 6 = Sat
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // calculate difference to Monday
    
    const weekStartLocal = new Date(vnNow);
    weekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
    weekStartLocal.setUTCHours(0, 0, 0, 0);
    const weekStart = new Date(weekStartLocal.getTime() - VN_OFFSET_MS);

    const weekEndLocal = new Date(weekStartLocal);
    weekEndLocal.setUTCDate(weekStartLocal.getUTCDate() + 6);
    weekEndLocal.setUTCHours(23, 59, 59, 999);
    const weekEnd = new Date(weekEndLocal.getTime() - VN_OFFSET_MS);

    // 2. Fetch tasks for userIds in one query using extended monthly range
    const extendedStartDate = new Date(monthStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const extendedEndDate = new Date(monthEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const tasksRaw = await prisma.staffTask.findMany({
      where: {
        assigneeId: { in: targetUserIds },
        OR: [
          { startDate: { gte: extendedStartDate, lte: extendedEndDate } },
          {
            AND: [
              { startDate: null },
              { createdAt: { gte: extendedStartDate, lte: extendedEndDate } }
            ]
          }
        ]
      }
    });

    const getWeekThursday = (date: Date): Date => {
      const VN_OFFSET = 7 * 60 * 60 * 1000;
      const local = new Date(date.getTime() + VN_OFFSET);
      const day = local.getUTCDay();
      const diffToThursday = day === 0 ? -3 : 4 - day;
      const thursLocal = new Date(local);
      thursLocal.setUTCDate(local.getUTCDate() + diffToThursday);
      thursLocal.setUTCHours(12, 0, 0, 0);
      return new Date(thursLocal.getTime() - VN_OFFSET);
    };

    const computeStats = (tasks: any[]) => {
      const total = tasks.length;
      const doing = tasks.filter(t => t.status === "DOING").length;
      const pendingReview = tasks.filter(t => t.status === "DONE").length;
      const todo = tasks.filter(t => t.status === "TODO").length;
      const rejected = tasks.filter(t => t.status === "REJECTED").length;

      const kpiAchieved = tasks.filter(t => 
        t.status === "APPROVED" || 
        t.status === "DONE" || 
        (t.status === "REJECTED" && (now.getTime() - new Date(t.updatedAt).getTime()) <= 24 * 60 * 60 * 1000)
      ).length;

      const overdue = tasks.filter(t => {
        if (t.status === "APPROVED" || t.status === "DONE") return false;
        if (t.status === "REJECTED") {
          const diffHours = (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
          if (diffHours <= 24) return false;
        }
        return t.deadline && new Date(t.deadline) < now;
      }).length;

      const completionRate = total === 0 ? 1.0 : kpiAchieved / total;

      return { total, approved: kpiAchieved, doing, pendingReview, todo, rejected, overdue, completionRate };
    };

    // 3. Group and compute stats for each user
    const statsMap: Record<string, { monthly: any, weekly: any }> = {};

    for (const userId of targetUserIds) {
      const userTasks = tasksRaw.filter(t => t.assigneeId === userId);

      const monthlyTasks = userTasks.filter(t => {
        const dateToUse = t.startDate || t.createdAt || new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000);
        const thursday = getWeekThursday(dateToUse);
        return thursday >= monthStart && thursday <= monthEnd;
      });

      const weeklyTasks = userTasks.filter(t => {
        const dateToUse = t.startDate || t.createdAt;
        return dateToUse >= weekStart && dateToUse <= weekEnd;
      });

      statsMap[userId] = {
        monthly: computeStats(monthlyTasks),
        weekly: computeStats(weeklyTasks)
      };
    }

    return { success: true, data: statsMap };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

