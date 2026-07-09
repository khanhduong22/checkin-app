"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserMonthlyStats } from "@/lib/stats";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin role required");
  }
  return session;
}

const DEFAULT_TASKS = [
  { title: "🧹 Kiểm tra vệ sinh phía trước và trong shop", description: "Quét dọn trước sân và lau dọn quầy kệ, không gian bên trong shop" },
  { title: "📧 Kiểm tra đơn hàng vào mỗi 9h30 và 12h30", description: "Rà soát các đơn hàng mới phát sinh vào các khung giờ cố định" },
  { title: "⚠️ Kiểm tra sản phẩm vi phạm và hiệu suất cửa hàng", description: "Xem xét các sản phẩm bị cảnh báo hoặc đánh giá xấu trên sàn" },
  { title: "📦 Kiểm tra đơn hàng hoàn hủy", description: "Xử lý và phân loại các đơn hàng khách hoàn hoặc yêu cầu hủy" },
  { title: "📝 Chỉnh sửa hóa đơn", description: "Kiểm tra và sửa đổi các thông tin hóa đơn sai lệch (nếu có)" },
  { title: "💻 Kiểm tra phần chờ đóng gói trên sapo", description: "Rà soát các đơn hàng đang ở trạng thái chờ đóng gói trên hệ thống Sapo" },
  { title: "🔗 Kiểm tra phần liên kết các đơn hàng trên sàn", description: "Đảm bảo đồng bộ và liên kết chính xác giữa sàn thương mại và Sapo" },
  { title: "📊 Đối soát đơn hàng", description: "Đối chiếu mã vận đơn và tiền hàng định kỳ" },
  { title: "🎯 Duyệt KPI và WFH", description: "Phê duyệt các yêu cầu KPI/WFH của nhân sự cấp dưới" },
  { title: "💵 Đếm tiền chốt sổ", description: "Kiểm đếm tiền mặt, đối chiếu doanh thu thực tế và chốt sổ bàn giao ca" },
  { title: "🔒 Khoá cửa và Tắt thiết bị", description: "Kiểm tra tắt hết điều hòa, máy tính, đèn điện và khóa cửa an toàn trước khi về" }
];

async function ensureChecklistTemplatesSeeded(userId: string) {
  const count = await prisma.managerChecklistTask.count({
    where: { assigneeId: userId }
  });

  if (count === 0) {
    await prisma.$transaction(
      DEFAULT_TASKS.map(t =>
        prisma.managerChecklistTask.create({
          data: {
            title: t.title,
            description: t.description,
            assigneeId: userId,
            active: true
          }
        })
      )
    );
  }
}

export async function getManagerDailyChecklist(userId: string, dateStr: string) {
  try {
    await requireAdmin();

    await ensureChecklistTemplatesSeeded(userId);

    // 1. Get checklist templates active/scheduled for this specific date
    const templates = await prisma.managerChecklistTask.findMany({
      where: {
        assigneeId: userId,
        OR: [
          { targetDate: null },
          { targetDate: "" },
          { targetDate: dateStr }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    // 2. Fetch completions for the selected date
    const completions = await prisma.managerChecklistCompletion.findMany({
      where: {
        date: dateStr,
        task: { assigneeId: userId }
      }
    });

    // 3. Map template tasks with completion status
    const checklist = templates.map(task => {
      const comp = completions.find(c => c.taskId === task.id);
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        active: task.active,
        targetDate: task.targetDate,
        createdAt: task.createdAt,
        completed: comp ? comp.completed : false,
        completedAt: comp ? comp.completedAt : null
      };
    });

    return { success: true, data: checklist };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getManagerChecklistTemplates(userId: string) {
  try {
    await requireAdmin();

    await ensureChecklistTemplatesSeeded(userId);

    const templates = await prisma.managerChecklistTask.findMany({
      where: { assigneeId: userId },
      orderBy: { createdAt: "asc" }
    });

    return { success: true, data: templates };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleManagerChecklistItem(taskId: string, dateStr: string, completed: boolean) {
  try {
    await requireAdmin();

    // Find the template task first to make sure it exists
    const task = await prisma.managerChecklistTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return { success: false, error: "Nhiệm vụ không tồn tại" };
    }

    const completion = await prisma.managerChecklistCompletion.upsert({
      where: {
        taskId_date: { taskId, date: dateStr }
      },
      create: {
        taskId,
        date: dateStr,
        completed,
        completedAt: completed ? new Date() : null
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null
      }
    });

    revalidatePath("/admin/manager-tasks");
    // Also revalidate payroll to ensure the deficiency status is updated immediately
    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/${task.assigneeId}`);
    revalidatePath("/payroll");

    return { success: true, data: completion };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createManagerChecklistTask(title: string, description: string | null, assigneeId: string, targetDate: string | null = null) {
  try {
    await requireAdmin();

    const task = await prisma.managerChecklistTask.create({
      data: {
        title,
        description,
        assigneeId,
        targetDate,
        active: true
      }
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateManagerChecklistTask(id: string, title: string, description: string | null, active: boolean, targetDate: string | null = null) {
  try {
    await requireAdmin();

    const task = await prisma.managerChecklistTask.update({
      where: { id },
      data: {
        title,
        description,
        active,
        targetDate
      }
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true, data: task };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteManagerChecklistTask(id: string) {
  try {
    await requireAdmin();

    await prisma.managerChecklistTask.delete({
      where: { id }
    });

    revalidatePath("/admin/manager-tasks");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getManagerStatsHistory(userId: string, date: Date = new Date()) {
  try {
    await requireAdmin();
    const stats = await getUserMonthlyStats(userId, date);
    return { success: true, data: stats };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function verifyChecklistComplete(userId: string, dateStr: string) {
  try {
    const activeTasks = await prisma.managerChecklistTask.findMany({
      where: {
        assigneeId: userId,
        active: true,
        OR: [
          { targetDate: null },
          { targetDate: "" },
          { targetDate: dateStr }
        ]
      }
    });

    if (activeTasks.length === 0) {
      return { success: true };
    }

    const completions = await prisma.managerChecklistCompletion.findMany({
      where: {
        date: dateStr,
        task: { assigneeId: userId }
      }
    });

    const completedTaskIds = completions.filter(c => c.completed).map(c => c.taskId);
    const uncompleted = activeTasks.filter(t => !completedTaskIds.includes(t.id));

    if (uncompleted.length > 0) {
      // Check if there is an approved CHECKLIST explanation request for this date
      const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59+07:00`);

      const approvedRequest = await prisma.request.findFirst({
        where: {
          userId,
          type: "CHECKLIST",
          date: { gte: startOfDay, lte: endOfDay },
          status: "APPROVED"
        }
      });

      if (approvedRequest) {
        return { success: true }; // Allowed to check out because explanation is approved
      }

      return {
        success: false,
        message: `⚠️ Không thể Check-out! Bạn còn ${uncompleted.length} nhiệm vụ chưa hoàn thành. Vui lòng hoàn thành checklist hoặc nộp giải trình và nhờ Admin Dung duyệt để được Check-out.`
      };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

