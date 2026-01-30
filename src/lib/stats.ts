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
    // daily is sorted by timestamp asc

    let dayHours = 0;
    let lastCheckInTime: number | null = null;
    let firstCheckIn = null;
    let lastCheckOut = null;
    let isValidDay = true;
    let errorMsg = '';

    for (let i = 0; i < daily.length; i++) {
      const event = daily[i];

      if (event.type === 'checkin') {
        // If we already have a pending checkin (forgot checkout before this one), ignore proper pair logic or handle error?
        // For simplicity: Update lastCheckInTime to current. This implies previous checkin was abandoned.
        lastCheckInTime = event.timestamp.getTime();
        if (!firstCheckIn) firstCheckIn = event.timestamp;
      } else if (event.type === 'checkout') {
        if (lastCheckInTime !== null) {
          const diff = event.timestamp.getTime() - lastCheckInTime;
          dayHours += diff / (1000 * 60 * 60);
          lastCheckInTime = null; // Pair consumed
          lastCheckOut = event.timestamp;
        } else {
          // Checkout without checkin
          isValidDay = false;
          errorMsg = 'Có Check-out nhưng thiếu Check-in trước đó';
        }
      }
    }

    // Check if day ended with a pending checkin
    if (lastCheckInTime !== null) {
      isValidDay = false;
      errorMsg = 'Quên Check-out';
      // Optional: Count hours up to now if today? No, better safe than sorry.
    }

    if (dayHours > 0) {
      totalHours += dayHours;
    }

    dailyDetails.push({
      date: date,
      checkIn: firstCheckIn,
      checkOut: lastCheckOut,
      hours: dayHours,
      salary: dayHours * hourlyRate,
      isValid: isValidDay && dayHours > 0,
      error: errorMsg || (dayHours === 0 ? 'Không có giờ làm hợp lệ' : undefined)
    });
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
