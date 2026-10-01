"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getOrSetCache, invalidateCachePattern } from "@/lib/cache";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export async function invalidateShiftDutyCache(userId?: string, shiftId?: number): Promise<void> {
  try {
    await invalidateCachePattern("shift-duties:*");
    await invalidateCachePattern("shifts:*");
  } catch (e) {
    console.warn("[Cache Warning] Failed to invalidate shift duty cache:", e);
  }
}

function getTodayVnBoundaries(baseDate: Date = new Date()) {
  const vnNow = new Date(baseDate.getTime() + VN_OFFSET_MS);
  const vnYear = vnNow.getUTCFullYear();
  const vnMonth = vnNow.getUTCMonth();
  const vnDate = vnNow.getUTCDate();

  const dayStart = new Date(Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0) - VN_OFFSET_MS);
  const dayEnd = new Date(Date.UTC(vnYear, vnMonth, vnDate, 23, 59, 59, 999) - VN_OFFSET_MS);

  return { dayStart, dayEnd, now: baseDate, vnNow };
}

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
    where: { email: session.user.email! },
  });
  if (!user) {
    throw new Error("User not found");
  }
  return { session, user };
}

export type ShiftDutyActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CreateShiftDutyInput = {
  title: string;
  description?: string | null;
  userId: string;
  shiftId?: number | null;
  date: string | Date;
};

export async function createShiftDuty(data: CreateShiftDutyInput) {
  try {
    const session = await requireAdmin();
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });
    if (!adminUser) return { success: false, error: "Admin user not found" };
    if (!data.title || !data.title.trim()) {
      return { success: false, error: "Tiêu đề công việc không được để trống" };
    }

    const taskDate = typeof data.date === "string" ? new Date(data.date) : data.date;

    const duty = await prisma.shiftDuty.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        userId: data.userId,
        shiftId: data.shiftId || null,
        createdById: adminUser.id,
        date: taskDate,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        shift: true,
      },
    });

    await invalidateShiftDutyCache(data.userId, data.shiftId || undefined);
    revalidatePath("/");
    revalidatePath("/schedule");
    revalidatePath("/admin/schedule");
    return { success: true, data: duty };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateShiftDuty(id: string, data: { title?: string; description?: string | null }) {
  try {
    await requireAdmin();
    const duty = await prisma.shiftDuty.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
      },
    });

    await invalidateShiftDutyCache();
    revalidatePath("/");
    revalidatePath("/schedule");
    revalidatePath("/admin/schedule");
    return { success: true, data: duty };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteShiftDuty(id: string) {
  try {
    await requireAdmin();
    await prisma.shiftDuty.delete({ where: { id } });

    await invalidateShiftDutyCache();
    revalidatePath("/");
    revalidatePath("/schedule");
    revalidatePath("/admin/schedule");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function toggleCompleteShiftDuty(id: string) {
  try {
    const { user } = await requireUserOrAdmin();
    const duty = await prisma.shiftDuty.findUnique({ where: { id } });
    if (!duty) return { success: false, error: "Không tìm thấy nhiệm vụ" };

    if (user.role !== "ADMIN" && duty.userId !== user.id) {
      return { success: false, error: "Bạn không có quyền cập nhật nhiệm vụ này" };
    }

    const nextCompleted = !duty.isCompleted;
    const updated = await prisma.shiftDuty.update({
      where: { id },
      data: {
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      },
    });

    await invalidateShiftDutyCache(duty.userId);
    revalidatePath("/");
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getTodayUserShiftDuties(userId: string): Promise<ShiftDutyActionResult<any[]>> {
  try {
    const { dayStart, dayEnd } = getTodayVnBoundaries();

    return await getOrSetCache<ShiftDutyActionResult<any[]>>(`shift-duties:today-user:${userId}`, 180, async () => {
      const duties = await prisma.shiftDuty.findMany({
        where: {
          userId,
          date: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { createdAt: "asc" },
        include: {
          shift: true,
        },
      });

      return { success: true, data: duties };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getTodayShiftDutiesWithTeammates(userId: string): Promise<ShiftDutyActionResult<{ myDuties: any[]; colleagues: any[]; totalTodayDutiesCount: number }>> {
  try {
    const { dayStart, dayEnd } = getTodayVnBoundaries();

    return await getOrSetCache<ShiftDutyActionResult<{ myDuties: any[]; colleagues: any[]; totalTodayDutiesCount: number }>>(`shift-duties:today-teammates:${userId}`, 180, async () => {
      // 1. Get shifts for today to know who is working
      const todayShifts = await prisma.workShift.findMany({
        where: {
          start: { gte: dayStart, lte: dayEnd },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { start: "asc" },
      });

      // 2. Get all duties for today
      const allTodayDuties = await prisma.shiftDuty.findMany({
        where: {
          date: { gte: dayStart, lte: dayEnd },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          shift: true,
        },
        orderBy: { createdAt: "asc" },
      });

      const myDuties = allTodayDuties.filter((d) => d.userId === userId);

      // Group duties by shift and colleague
      const colleaguesMap = new Map<string, {
        user: { id: string; name: string | null; email: string | null; image: string | null };
        shiftTime: string;
        duties: typeof allTodayDuties;
      }>();

      // First map all people who have a shift today
      for (const s of todayShifts) {
        if (s.userId === userId) continue;
        const sStart = new Date(s.start);
        const sEnd = new Date(s.end);
        const shiftTime = `${sStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${sEnd.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}`;

        if (!colleaguesMap.has(s.userId)) {
          colleaguesMap.set(s.userId, {
            user: s.user,
            shiftTime,
            duties: [],
          });
        }
      }

      // Attach duties to colleagues
      for (const d of allTodayDuties) {
        if (d.userId === userId) continue;
        if (!colleaguesMap.has(d.userId)) {
          colleaguesMap.set(d.userId, {
            user: d.user,
            shiftTime: "Ca hôm nay",
            duties: [],
          });
        }
        colleaguesMap.get(d.userId)!.duties.push(d);
      }

      const colleagues = Array.from(colleaguesMap.values());

      return {
        success: true,
        data: {
          myDuties,
          colleagues,
          totalTodayDutiesCount: allTodayDuties.length,
        },
      };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getShiftDutiesForShift(shiftId: number): Promise<ShiftDutyActionResult<any[]>> {
  try {
    return await getOrSetCache<ShiftDutyActionResult<any[]>>(`shift-duties:shift:${shiftId}`, 180, async () => {
      const shift = await prisma.workShift.findUnique({
        where: { id: shiftId },
      });

      const whereClause: any = shift
        ? {
            OR: [
              { shiftId },
              {
                userId: shift.userId,
                date: {
                  gte: getTodayVnBoundaries(new Date(shift.start)).dayStart,
                  lte: getTodayVnBoundaries(new Date(shift.start)).dayEnd,
                },
              },
            ],
          }
        : { shiftId };

      const duties = await prisma.shiftDuty.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      return { success: true, data: duties };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getUserUpcomingShifts(userId: string): Promise<ShiftDutyActionResult<any[]>> {
  try {
    return await getOrSetCache<ShiftDutyActionResult<any[]>>(`shifts:upcoming:${userId}`, 180, async () => {
      const { dayStart } = getTodayVnBoundaries();
      const rangeEnd = new Date(dayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

      const shifts = await prisma.workShift.findMany({
        where: {
          userId,
          start: { gte: dayStart, lte: rangeEnd },
        },
        orderBy: { start: "asc" },
      });

      const formatted = shifts.map((s) => {
        const sStart = new Date(s.start);
        const sEnd = new Date(s.end);
        const sStartVN = new Date(sStart.getTime() + VN_OFFSET_MS);
        const y = sStartVN.getUTCFullYear();
        const m = String(sStartVN.getUTCMonth() + 1).padStart(2, "0");
        const d = String(sStartVN.getUTCDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;

        const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const dayName = dayNames[sStartVN.getUTCDay()];

        const timeStr = `${sStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })} - ${sEnd.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}`;

        return {
          id: s.id,
          dateStr,
          displayLabel: `${dayName}, ${d}/${m} (${timeStr})`,
          start: s.start.toISOString(),
          end: s.end.toISOString(),
        };
      });

      return { success: true, data: formatted };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getWeeklyShiftDuties(date: Date = new Date()): Promise<ShiftDutyActionResult<any[]>> {
  try {
    const vnDate = new Date(date.getTime() + VN_OFFSET_MS);
    const dayOfWeek = vnDate.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayVN = new Date(vnDate);
    mondayVN.setUTCDate(vnDate.getUTCDate() + diffToMonday);
    const weekStart = new Date(Date.UTC(mondayVN.getUTCFullYear(), mondayVN.getUTCMonth(), mondayVN.getUTCDate(), 0, 0, 0, 0) - VN_OFFSET_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const weekKey = weekStart.toISOString().slice(0, 10);
    return await getOrSetCache<ShiftDutyActionResult<any[]>>(`shift-duties:weekly:${weekKey}`, 180, async () => {
      const duties = await prisma.shiftDuty.findMany({
        where: {
          date: { gte: weekStart, lte: weekEnd },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          shift: true,
        },
        orderBy: { date: "asc" },
      });
      return { success: true, data: duties };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
