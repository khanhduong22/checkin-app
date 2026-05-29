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
      // Staff can only update task status (TODO -> DOING -> DONE)
      if (data.status === undefined || Object.keys(data).length > 1) {
        return { success: false, error: "Nhân viên chỉ có quyền cập nhật trạng thái công việc" };
      }
      
      const newStatus = data.status;
      if (!["TODO", "DOING", "DONE"].includes(newStatus)) {
        return { success: false, error: "Trạng thái không hợp lệ cho nhân viên" };
      }

      const updateData: any = { status: newStatus };
      if (newStatus === "DONE") {
        updateData.submittedAt = new Date();
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
    const [monthlyTasks, weeklyTasks] = await Promise.all([
      prisma.staffTask.findMany({
        where: {
          assigneeId: userId,
          OR: [
            { createdAt: { gte: monthStart, lte: monthEnd } },
            { deadline: { gte: monthStart, lte: monthEnd } }
          ]
        }
      }),
      prisma.staffTask.findMany({
        where: {
          assigneeId: userId,
          OR: [
            { createdAt: { gte: weekStart, lte: weekEnd } },
            { deadline: { gte: weekStart, lte: weekEnd } }
          ]
        }
      })
    ]);

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
