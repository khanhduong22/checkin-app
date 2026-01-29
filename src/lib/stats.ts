import { prisma } from "@/lib/prisma";

export async function getUserMonthlyStats(userId: string) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const checkins = await prisma.checkIn.findMany({
    where: {
      userId: userId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { timestamp: 'asc' }
  });

  // Calculate hours
  let totalHours = 0;
  const daysWorked = new Set();
  const checkinsByDay: { [key: string]: any[] } = {};

  checkins.forEach((c: any) => {
    const dateKey = c.timestamp.toISOString().split('T')[0];
    daysWorked.add(dateKey);
    if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
    checkinsByDay[dateKey].push(c);
  });

  Object.keys(checkinsByDay).forEach(date => {
    const daily = checkinsByDay[date];
    // daily.sort((a,b) => a.timestamp - b.timestamp); // Already sorted by query

    if (daily.length >= 2) {
      const first = daily[0];
      const last = daily[daily.length - 1];
      if (first.type === 'checkin' && last.type === 'checkout') {
        const diff = last.timestamp.getTime() - first.timestamp.getTime();
        totalHours += diff / (1000 * 60 * 60);
      }
    }
  });

  // Fetch user to get hourlyRate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hourlyRate: true }
  });

  return {
    totalHours,
    daysWorked: daysWorked.size,
    checkinCount: checkins.length,
    totalSalary: totalHours * (user?.hourlyRate || 0)
  };
}
