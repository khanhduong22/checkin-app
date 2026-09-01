import { prisma } from "@/lib/prisma";
import { toVietnamTime } from "@/lib/schedule-lock";

/**
 * Checks and applies a 50,000 VND late schedule registration penalty for a Part-time employee.
 * 
 * Rules:
 * - Applicable only to Part-time staff (not Full-time, not Admin).
 * - Triggered when a shift is registered or assigned after Saturday 00:00 (GMT+7) of the week prior to the shift.
 * - Max 1 penalty per week per employee.
 * - Bypassed if `skipPenalty` is set to true (e.g. Admin grants explicit waiver).
 */
export async function applyLateSchedulePenalty(
  targetUserId: string,
  shiftStart: Date,
  skipPenalty: boolean = false
): Promise<{ applied: boolean; reason?: string }> {
  if (skipPenalty) return { applied: false };

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser || targetUser.employmentType !== 'PART_TIME' || targetUser.role === 'ADMIN') {
    return { applied: false };
  }

  const shiftVN = toVietnamTime(shiftStart);
  const nowVN = toVietnamTime(new Date());

  const day = shiftVN.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayVN = new Date(shiftVN.getTime());
  mondayVN.setDate(shiftVN.getDate() + diffToMonday);
  mondayVN.setHours(0, 0, 0, 0);

  // Penalty deadline is Saturday 00:00:00 (2 days before Monday)
  const penaltyDeadlineVN = new Date(mondayVN.getTime());
  penaltyDeadlineVN.setDate(mondayVN.getDate() - 2);
  penaltyDeadlineVN.setHours(0, 0, 0, 0);

  // If current time is after Saturday 00:00 of the week prior
  if (nowVN.getTime() >= penaltyDeadlineVN.getTime()) {
    const mondayDate = new Date(mondayVN);

    // Check if they already have a penalty for this week
    const existingAdjustment = await prisma.payrollAdjustment.findFirst({
      where: {
        userId: targetUser.id,
        date: mondayDate,
        OR: [
          { reason: { contains: "Phạt đăng ký lịch muộn" } },
          { reason: { contains: "Phạt không đăng ký lịch" } },
          { reason: { contains: "Đăng ký trễ lịch làm" } }
        ]
      }
    });

    if (!existingAdjustment) {
      const sundayVN = new Date(mondayVN.getTime());
      sundayVN.setDate(mondayVN.getDate() + 6);

      const monStr = mondayVN.getDate().toString().padStart(2, '0') + '/' + (mondayVN.getMonth() + 1).toString().padStart(2, '0');
      const sunStr = sundayVN.getDate().toString().padStart(2, '0') + '/' + (sundayVN.getMonth() + 1).toString().padStart(2, '0');
      const weekStr = `${monStr} - ${sunStr}`;
      const reason = `Phạt đăng ký lịch muộn tuần ${weekStr}`;

      await prisma.payrollAdjustment.create({
        data: {
          userId: targetUser.id,
          amount: -50000,
          reason,
          date: mondayDate,
        }
      });

      return { applied: true, reason };
    }
  }

  return { applied: false };
}
