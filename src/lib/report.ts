import { prisma } from "@/lib/prisma";
import { isLate, isEarlyLeave } from "@/lib/utils";

export async function getMonthlyReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all checkins in month
  const checkins = await prisma.checkIn.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate
      },
      user: {
        role: {
          not: 'ADMIN'
        }
      }
    },
    include: { user: true }
  });

  // Get Shifts to compare Late/Early
  const shifts = await prisma.workShift.findMany({
    where: {
      start: { gte: startDate, lte: endDate }
    }
  });

  const shiftMap: Record<string, any> = {};
  shifts.forEach((s: any) => {
    const d = s.start.toISOString().split('T')[0];
    const key = `${s.userId}-${d}`;
    shiftMap[key] = s;
  });

  const userStats: Record<string, any> = {};

  checkins.forEach((c: any) => {
    if (!userStats[c.userId]) {
      userStats[c.userId] = {
        user: c.user,
        totalLateMinutes: 0,
        lateCount: 0,
        strictLateCount: 0,
        earlyLeaveCount: 0,
        checkinCount: 0,
        totalEarlyMinutes: 0 // For Top Early Bird
      };
    }

    const stats = userStats[c.userId];
    const date = new Date(c.timestamp);
    const dateKey = date.toISOString().split('T')[0];
    const hour = date.getHours();
    const min = date.getMinutes();
    const timeVal = hour + min / 60; // 8:30 = 8.5

    const shift = shiftMap[`${c.userId}-${dateKey}`];

    if (c.type === 'checkin') {
      stats.checkinCount++;

      // Determine Expected Start
      let expectedStart = 8.5; // Default 8:30
      let shouldCheck = false;

      if (shift) {
        const s = new Date(shift.start);
        expectedStart = s.getHours() + s.getMinutes() / 60;
        shouldCheck = true;
      } else if (c.user.employmentType === 'FULL_TIME') {
        // Full Time no shift => Assume Standard
        shouldCheck = true;
      }

      if (shouldCheck) {
        stats.totalScheduledCheckins = (stats.totalScheduledCheckins || 0) + 1;
        // Check Late
        if (isLate(timeVal, expectedStart)) {
          stats.lateCount++;
          const lateMins = Math.floor((timeVal - expectedStart) * 60);
          stats.totalLateMinutes += lateMins;
        } else {
          stats.onTimeCount = (stats.onTimeCount || 0) + 1;
        }

        // Strict Late Check (0 grace period, > 0 minutes late)
        // timeVal and expectedStart only have minute precision, so timeVal > expectedStart means diffMins > 0
        if (timeVal > expectedStart) {
            stats.strictLateCount = (stats.strictLateCount || 0) + 1;
        }

        // Check Early Bird (Total early minutes)
        if (timeVal < expectedStart) {
          const earlyMins = Math.round((expectedStart - timeVal) * 60);
          stats.totalEarlyMinutes += earlyMins;
        }
      }
    }
    else if (c.type === 'checkout') {
      let expectedEnd = 17.5; // Default 17:30
      let shouldCheck = false;

      if (shift) {
        const e = new Date(shift.end);
        expectedEnd = e.getHours() + e.getMinutes() / 60;
        shouldCheck = true;
      } else if (c.user.employmentType === 'FULL_TIME') {
        shouldCheck = true;
      }

      // Check Early Leave
      if (shouldCheck && isEarlyLeave(timeVal, expectedEnd)) {
        stats.earlyLeaveCount++;
      }
    }
  });

  const report = Object.values(userStats).map((u: any) => {
    u.punctualityRate = u.totalScheduledCheckins ? ((u.onTimeCount || 0) / u.totalScheduledCheckins) * 100 : 0;
    return u;
  });

  return {
    topLate: report.sort((a, b) => b.totalLateMinutes - a.totalLateMinutes),
    topEarlyBird: report.filter((u: any) => u.totalEarlyMinutes > 0).sort((a: any, b: any) => b.totalEarlyMinutes - a.totalEarlyMinutes).slice(0, 3),
    topDiscipline: report.filter((u: any) => u.totalScheduledCheckins > 0 && u.strictLateCount === 0).sort((a: any, b: any) => {
      if (b.punctualityRate === a.punctualityRate) {
        if (b.totalEarlyMinutes === a.totalEarlyMinutes) {
          return b.totalScheduledCheckins - a.totalScheduledCheckins;
        }
        return b.totalEarlyMinutes - a.totalEarlyMinutes;
      }
      return b.punctualityRate - a.punctualityRate;
    }).slice(0, 3)
  };
}
