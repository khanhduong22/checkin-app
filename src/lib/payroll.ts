import { prisma } from "@/lib/prisma";

export async function calculatePayroll(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const users = await prisma.user.findMany({
    include: {
      checkins: {
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  const payrollData = users.map((user: any) => {
    let totalHours = 0;
    const checkinsByDay: { [key: string]: any[] } = {};

    // Group checkins by day
    user.checkins.forEach((c: any) => {
      const dateKey = c.timestamp.toISOString().split('T')[0];
      if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
      checkinsByDay[dateKey].push(c);
    });

    // Calculate hours per day
    Object.keys(checkinsByDay).forEach(date => {
      const dailyCheckins = checkinsByDay[date];
      // Sort by time
      dailyCheckins.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Simple logic: First check-in and Last check-out
      // If only 1 record (Forgot checkout), assume 0 hours or manual fix needed.
      if (dailyCheckins.length >= 2) {
        const first = dailyCheckins[0];
        const last = dailyCheckins[dailyCheckins.length - 1];

        if (first.type === 'checkin' && last.type === 'checkout') {
          const diffMs = last.timestamp.getTime() - first.timestamp.getTime();
          const hours = diffMs / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      hourlyRate: user.hourlyRate,
      totalHours,
      totalSalary: totalHours * user.hourlyRate,
      checkinCount: Object.keys(checkinsByDay).length,
      daysWorked: Object.keys(checkinsByDay).length // Add this field
    };
  });

  return payrollData;
}
