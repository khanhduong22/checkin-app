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
        earlyLeaveCount: 0,
        checkinCount: 0,
        earliestCheckin: null // For Top Early Bird
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

      // Check Late
      if (shouldCheck && isLate(timeVal, expectedStart)) {
        stats.lateCount++;
        const lateMins = Math.floor((timeVal - expectedStart) * 60);
        stats.totalLateMinutes += lateMins;
      }

      // Check Early Bird (Min checkin time)
      if (!stats.earliestCheckin || timeVal < stats.earliestCheckin) {
        stats.earliestCheckin = timeVal;
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

  const report = Object.values(userStats);

  return {
    topLate: report.sort((a, b) => b.totalLateMinutes - a.totalLateMinutes).slice(0, 5),
    topEarlyBird: report.filter(u => u.earliestCheckin).sort((a, b) => a.earliestCheckin - b.earliestCheckin).slice(0, 3)
  };
}
