import { prisma } from "@/lib/prisma";

export async function getUserMonthlyStats(userId: string, targetDate: Date = new Date()) {
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

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
  const dailyDetails: any[] = [];

  checkins.forEach((c: any) => {
    const dateKey = c.timestamp.toISOString().split('T')[0];
    daysWorked.add(dateKey);
    if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
    checkinsByDay[dateKey].push(c);
  });

  // Fetch user to get hourlyRate and Adjustments
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyRate: true,
      adjustments: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  const hourlyRate = user?.hourlyRate || 0;

  Object.keys(checkinsByDay).forEach(date => {
    const daily = checkinsByDay[date];
    // daily.sort((a,b) => a.timestamp - b.timestamp); // Already sorted by query

    if (daily.length >= 2) {
      const first = daily[0];
      const last = daily[daily.length - 1];

      let hours = 0;
      if (first.type === 'checkin' && last.type === 'checkout') {
        const diff = last.timestamp.getTime() - first.timestamp.getTime();
        hours = diff / (1000 * 60 * 60);
        totalHours += hours;
      }

      dailyDetails.push({
        date: date,
        checkIn: first.timestamp,
        checkOut: last.type === 'checkout' ? last.timestamp : null,
        hours: hours,
        salary: hours * hourlyRate,
        isValid: first.type === 'checkin' && last.type === 'checkout'
      });
    } else if (daily.length === 1) {
      // Missing checkout or checkin
      dailyDetails.push({
        date: date,
        checkIn: daily[0].type === 'checkin' ? daily[0].timestamp : null,
        checkOut: daily[0].type === 'checkout' ? daily[0].timestamp : null,
        hours: 0,
        salary: 0,
        isValid: false,
        error: daily[0].type === 'checkin' ? 'Quên Checkout' : 'Quên Checkin'
      });
    }
  });

  // Sort daily details by date desc
  dailyDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const baseSalary = totalHours * hourlyRate;
  const totalAdjustments = user?.adjustments.reduce((sum: number, adj: any) => sum + adj.amount, 0) || 0;

  return {
    totalHours,
    daysWorked: daysWorked.size,
    checkinCount: checkins.length,
    baseSalary,
    totalAdjustments,
    totalSalary: baseSalary + totalAdjustments,
    dailyDetails,
    adjustments: user?.adjustments || [],
    hourlyRate
  };
}
