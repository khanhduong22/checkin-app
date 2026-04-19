'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerShift(start: Date, end: Date, override: boolean = false, targetUserId?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (duration < 4) return { success: false, error: 'Thời gian làm việc tối thiểu 4 tiếng!' };

  const email = session.user.email;
  if (!email) return { success: false, error: 'No email' };

  const requester = await prisma.user.findUnique({ where: { email } });
  if (!requester) return { success: false, error: 'User not found' };

  let targetUser = requester;
  if (targetUserId && targetUserId !== requester.id) {
    if (requester.role !== 'ADMIN') return { success: false, error: 'Chỉ Admin mới được xếp lịch cho người khác!' };
    const found = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!found) return { success: false, error: 'Nhân viên không tồn tại' };
    targetUser = found;
  }

  // Check self overlap (for targetUser)
  const overlap = await prisma.workShift.count({
    where: {
      userId: targetUser.id,
      OR: [
        { start: { lte: start }, end: { gt: start } },
        { start: { lt: end }, end: { gte: end } },
        { start: { gte: start }, end: { lte: end } }
      ]
    }
  });

  if (overlap > 0) return { success: false, error: 'Nhân viên này đã có lịch đăng ký trùng giờ này!' };

  // PART_TIME Limit Validation
  if (targetUser.employmentType === 'PART_TIME') {
    const overlappingShifts = await prisma.workShift.findMany({
      where: {
        OR: [
          { start: { lte: start }, end: { gt: start } },
          { start: { lt: end }, end: { gte: end } },
          { start: { gte: start }, end: { lte: end } }
        ]
      },
      include: { user: true }
    });

    const partTimeCount = overlappingShifts.reduce((count, s) => {
      if (s.user.employmentType === 'PART_TIME' || (s.user as any).employmentType === 'PART_TIME') return count + 1;
      return count;
    }, 0);

    if (partTimeCount >= 2) {
      if (override) {
        if (requester.role !== 'ADMIN') return { success: false, error: 'Cần quyền Admin để vượt giới hạn nhân sự!' };
        // Allowed
      } else {
        if (requester.role === 'ADMIN') {
          return { success: false, error: 'LIMIT_PART_TIME', count: partTimeCount };
        } else {
          return { success: false, error: 'Đã đủ số lượng nhân viên Part-time (2/2) trong khung giờ này.' };
        }
      }
    }
  }

  try {
    const newShift = await prisma.workShift.create({
      data: {
        userId: targetUser.id,
        start: start,
        end: end,
        status: 'APPROVED'
      }
    });
    revalidatePath('/schedule');
    revalidatePath('/admin/schedule');

    const requesterName = requester.name || requester.email;
    const targetName = targetUser.name || targetUser.email;
    const title = `${requesterName} đã gán lịch cho ${targetName}`;

    return { success: true, id: newShift.id, title };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Lỗi khi lưu lịch làm' };
  }
}

export async function deleteShift(shiftId: number) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email: email! } });
  if (!user) return { success: false };

  await prisma.workShift.deleteMany({
    where: {
      id: shiftId,
      userId: user.role === 'ADMIN' ? undefined : user.id
    }
  });
  revalidatePath('/schedule');
  return { success: true };
}

export async function updateShift(shiftId: number, start: Date, end: Date) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  const existing = await prisma.workShift.findUnique({ where: { id: shiftId } });

  if (!existing) return { success: false, error: 'Not found' };

  if (user?.role !== 'ADMIN' && existing.userId !== user?.id) {
    return { success: false, error: 'Forbidden' };
  }

  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (duration < 4) return { success: false, error: 'Tối thiểu 4 tiếng!' };

  await prisma.workShift.update({
    where: { id: shiftId },
    data: { start, end }
  });

  revalidatePath('/schedule');
  revalidatePath('/admin/schedule');
  return { success: true };
}

export type ParsedShiftItem = {
    dateIso: string;
    startHour: number;
    endHour: number;
    names: string[];
};

export async function importWeeklySchedule(shiftsParam: ParsedShiftItem[], overrideExisting: boolean = true) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const adminEmail = session.user.email;
  const admin = await prisma.user.findUnique({ where: { email: adminEmail! } });
  if (!admin || admin.role !== 'ADMIN') return { success: false, error: 'Forbidden. Chỉ Admin mới có quyền tải lịch.' };

  if (!shiftsParam || shiftsParam.length === 0) {
      return { success: false, error: 'File không có dữ liệu lịch làm.' };
  }

  try {
      // 1. Fetch all users to map names
      const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
      const createdShifts = [];
      const unrecognizedNames = new Set<string>();

      // Distinct dates to clear old data if overrideExisting is true
      const distinctDateStrings = Array.from(new Set(shiftsParam.map(s => s.dateIso)));
      
      if (overrideExisting && distinctDateStrings.length > 0) {
          // Xóa tất cả ca làm việc trong các ngày được upload
          for (const ds of distinctDateStrings) {
              const dtStart = new Date(ds); // expected midnight: 00:00:00
              const dtEnd = new Date(dtStart.getTime());
              dtEnd.setDate(dtEnd.getDate() + 1); // Up to next day midnight

              // Ignore Admin's own full-day shifts maybe? No, typically WorkShift contains everyone's shifts
              await prisma.workShift.deleteMany({
                  where: {
                      start: { gte: dtStart, lt: dtEnd },
                      OR: [
                        { shiftType: null },
                        { shiftType: { not: 'FIXED' } }
                      ]
                  }
              });
          }
      }

      // 2. Prepare array for insert
      for (const shift of shiftsParam) {
          const shiftDate = new Date(shift.dateIso);
          const start = new Date(shiftDate);
          // Explicitly set time in UTC using the GMT+7 offset
          start.setUTCHours(shift.startHour - 7, 0, 0, 0);

          const end = new Date(shiftDate);
          end.setUTCHours(shift.endHour - 7, 0, 0, 0);

          for (let name of shift.names) {
              name = name.trim();
              if (!name) continue;

              // Find closest match user (fuzzy search by substring in name)
              const lowerName = name.toLowerCase();
              let matchedUser = allUsers.find(u => {
                   if (u.name) {
                       const un = u.name.toLowerCase();
                       return un === lowerName || un.includes(lowerName);
                   }
                   return false;
              });

              if (!matchedUser) {
                  // Fallback: try email prefix if no name
                  matchedUser = allUsers.find(u => u.email && u.email.split('@')[0].toLowerCase().includes(lowerName));
              }

              if (matchedUser) {
                  createdShifts.push({
                      userId: matchedUser.id,
                      start: start,
                      end: end,
                      status: 'APPROVED'
                  });
              } else {
                  unrecognizedNames.add(name);
              }
          }
      }

      // 3. Bulk insert
      if (createdShifts.length > 0) {
          await prisma.workShift.createMany({
              data: createdShifts
          });
      }

      revalidatePath('/schedule');
      revalidatePath('/admin/schedule');

      if (unrecognizedNames.size > 0) {
          return { 
              success: true, 
              message: `Đã xếp ${createdShifts.length} ca. Tuy nhiên không tìm thấy nhân viên: ${Array.from(unrecognizedNames).join(', ')}` 
          };
      }

      return { success: true, message: `Thành công! Đã lên lịch tự động ${createdShifts.length} ca làm.` };

  } catch (error: any) {
      console.error("Excel import error:", error);
      return { success: false, error: error?.message || 'Có lỗi server khi import!' };
  }
}
