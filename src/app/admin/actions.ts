'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- User Management Actions (Delete) ---
export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath('/admin');
    return { success: true, message: 'Đã xóa nhân viên' };
  } catch (e) {
    return { success: false, message: 'Lỗi khi xóa nhân viên' };
  }
}

// --- IP Management ---

export async function addAllowedIP(prefix: string, label: string) {
  try {
    await prisma.allowedIP.create({
      data: { prefix, label }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã thêm IP thành công' };
  } catch (e) {
    return { success: false, message: 'Lỗi: IP này có thể đã tồn tại' };
  }
}

export async function deleteAllowedIP(id: number) {
  try {
    await prisma.allowedIP.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true, message: 'Đã xóa IP' };
  } catch (e) {
    return { success: false, message: 'Lỗi khi xóa IP' };
  }
}

// --- User Management ---

export async function updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật quyền hạn' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

export async function updateUserRate(userId: string, hourlyRate: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hourlyRate }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật lương' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

export async function updateUserMonthlySalary(userId: string, monthlySalary: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { monthlySalary }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật lương cứng' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

export async function updateUserName(userId: string, name: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name }
    });
    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật tên' };
  } catch (e) {
    return { success: false, message: 'Lỗi cập nhật tên' };
  }
}

export async function updateUserEmploymentType(userId: string, type: 'FULL_TIME' | 'PART_TIME') {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { employmentType: type }
    });

    if (type === 'FULL_TIME') {
      // Auto generate shifts: 9:00 - 17:00, Mon-Sat (1-6), for next 3 months
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const shiftsToCreate = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = d.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
        if (day === 0) continue; // Skip Sunday

        // Set 9:00 - 17:00 (Local Time relative to server, which might be UTC)
        // Assuming simplistic local time expectation (VN).
        // If server is UTC, 9:00 VN = 2:00 UTC.
        // Best practice: Store as UTC.
        // But user sees 9-17.
        // "9g-17g" implies VN time (UTC+7).
        // 9:00 VN = 02:00 UTC.
        // 17:00 VN = 10:00 UTC.

        const shiftStart = new Date(d);
        shiftStart.setUTCHours(2, 0, 0, 0); // 09:00 GMT+7

        const shiftEnd = new Date(d);
        shiftEnd.setUTCHours(10, 0, 0, 0); // 17:00 GMT+7

        // Check overlap? Expensive to check per day.
        // Since this is "Reset/Set" for Full Time.
        // Let's rely on checking existence by day?

        // For simplicity and performance, we'll try strict checking or skip if exists
        // We'll insert and ignore if fails? No unique constraint on userId+start.

        // Let's just create. Admin can manage dupes if any. 
        // Or better: Delete future shifts and recreate?
        // "Tự động gán" -> Override?
        // Let's Delete existing future shifts for this user before creating to avoid messes.

        // Wait, deleting might remove specific swaps/custom shifts.
        // But switching to FULL TIME implies standard schedule.
        // I will NOT delete, but simply skip if a shift exists on that day?

        // To avoid N+1 queries, fetch existing shifts in range first.
      }

      // Optimization: Fetch existing shifts
      const existing = await prisma.workShift.findMany({
        where: {
          userId,
          start: { gte: startDate, lte: endDate }
        },
        select: { start: true }
      });
      const existingDates = new Set(existing.map(s => s.start.toISOString().split('T')[0]));

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day === 0) continue; // No Sunday

        // We compare via Date String (UTC)
        // d is iterating. Note d.toISOString() uses UTC.
        // We want 9:00 VN (02:00 UTC).
        const shiftStart = new Date(d);
        shiftStart.setUTCHours(2, 0, 0, 0);

        const shiftEnd = new Date(d);
        shiftEnd.setUTCHours(10, 0, 0, 0);

        const dateKey = shiftStart.toISOString().split('T')[0];
        if (!existingDates.has(dateKey)) {
          shiftsToCreate.push({
            userId,
            start: shiftStart,
            end: shiftEnd,
            status: 'APPROVED'
          });
        }
      }

      if (shiftsToCreate.length > 0) {
        await prisma.workShift.createMany({
          data: shiftsToCreate
        });
      }
      revalidatePath('/admin');
      revalidatePath('/schedule');
      revalidatePath('/admin/schedule');
    }

    revalidatePath('/admin');
    return { success: true, message: 'Đã cập nhật loại nhân viên & lịch làm' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Lỗi cập nhật' };
  }
}

// --- Manual Check-in ---
export async function adminManualCheckIn(userId: string, date: string, checkInTime: string, checkOutTime: string) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (process.env.NODE_ENV !== 'development' && (session?.user as any)?.role !== 'ADMIN') {
    return { success: false, message: "Forbidden" };
  }

  try {
    const adminName = session?.user?.name || "Admin";
    const note = `Admin ${adminName} chấm công hộ`;

    // 1. Calculate Day Range (VN Time -> UTC) to clear existing data
    const startOfDayVN = new Date(date);
    startOfDayVN.setUTCHours(-7, 0, 0, 0); // 00:00 VN = 17:00 UTC prev day

    const endOfDayVN = new Date(date);
    endOfDayVN.setUTCHours(16, 59, 59, 999); // 23:59 VN = 16:59 UTC current day

    // Clear existing records for this day to allow "Override"
    await prisma.checkIn.deleteMany({
      where: {
        userId,
        timestamp: {
          gte: startOfDayVN,
          lte: endOfDayVN
        }
      }
    });

    if (checkInTime) {
      const inTimeParts = checkInTime.split(':');
      const targetDate = new Date(date);
      targetDate.setUTCHours(parseInt(inTimeParts[0]) - 7, parseInt(inTimeParts[1]), 0, 0);

      await prisma.checkIn.create({
        data: {
          userId,
          type: 'checkin',
          timestamp: targetDate, // Store as UTC
          ipAddress: 'Manual',
          note
        }
      });
    }

    if (checkOutTime) {
      const outTimeParts = checkOutTime.split(':');
      const targetDate = new Date(date);
      targetDate.setUTCHours(parseInt(outTimeParts[0]) - 7, parseInt(outTimeParts[1]), 0, 0);

      await prisma.checkIn.create({
        data: {
          userId,
          type: 'checkout',
          timestamp: targetDate,
          ipAddress: 'Manual',
          note
        }
      });
    }

    revalidatePath(`/admin/employees/${userId}`);
    return { success: true, message: "Đã chấm công hộ thành công!" };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Lỗi hệ thống" };
  }
}
