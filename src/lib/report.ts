import { prisma } from "@/lib/prisma";

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
    const hour = date.getHours();
    const min = date.getMinutes();
    const timeVal = hour + min / 60; // 8:30 = 8.5

    if (c.type === 'checkin') {
      stats.checkinCount++;

      // Check Late (> 8:30)
      if (timeVal > 8.5) {
        stats.lateCount++;
        const lateMins = Math.floor((timeVal - 8.5) * 60);
        stats.totalLateMinutes += lateMins;
      }

      // Check Early Bird (Min checkin time)
      if (!stats.earliestCheckin || timeVal < stats.earliestCheckin) {
        stats.earliestCheckin = timeVal;
      }
    }
    else if (c.type === 'checkout') {
      // Check Early Leave (< 17:30)
      if (timeVal < 17.5) {
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
