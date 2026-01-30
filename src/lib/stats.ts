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

  // Fetch shifts for this period
  const shifts = await prisma.workShift.findMany({
    where: {
      userId: userId,
      start: { gte: startDate, lte: endDate }
    }
  });

  // Map shifts by date (YYYY-MM-DD -> Shift)
  // Assuming one shift per day for simplicity in calculation matching
  const shiftsByDay: { [key: string]: any } = {};
  shifts.forEach((s: any) => {
    const d = s.start.toISOString().split('T')[0];
    // If multiple, maybe pick earliest? Or keep array?
    // Let's keep the one that covers the core hours or just the first one.
    if (!shiftsByDay[d]) shiftsByDay[d] = s;
  });

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
    const shift = shiftsByDay[date];

    let dayHours = 0;
    let lastCheckIn: any = null;
    let firstCheckIn = null;
    let lastCheckOut = null;
    let isValidDay = true;
    let errorMsg = '';

    const processedPairs = [];

    for (let i = 0; i < daily.length; i++) {
      const event = daily[i];

      if (event.type === 'checkin') {
        lastCheckIn = event;
        if (!firstCheckIn) firstCheckIn = event.timestamp;
      } else if (event.type === 'checkout') {
        if (lastCheckIn) {
          // Found a pair: lastCheckIn -> event

          let startCalc = lastCheckIn.timestamp.getTime();
          let endCalc = event.timestamp.getTime();

          // PAYROLL RULES
          if (shift) {
            const shiftStart = shift.start.getTime();
            const shiftEnd = shift.end.getTime();

            // Rule 1: Early Check-in -> Count from Shift Start
            if (startCalc < shiftStart) {
              startCalc = shiftStart;
            }

            // Rule 2 & 3: Checkout Logic
            // If Checkout is EARLY (< shiftEnd) AND Has Reason (event.note) -> Credit Full to Shift End
            // If Checkout is LATE (> shiftEnd) -> Keep Actual End (Overtime)
            // If Checkout is EARLY (< shiftEnd) AND NO Reason -> Keep Actual End (Deducted)

            if (endCalc < shiftEnd) {
              if (event.note && event.note.trim().length > 0) {
                endCalc = shiftEnd; // Credit full shift
              }
            }
            // Else (endCalc >= shiftEnd) -> Keep endCalc (User pays for overtime)

            // Edge Case: If startCalc adjusted to shiftStart is > endCalc? (e.g. came very early, left before shift start?)
            // Should ignore.
            if (startCalc >= endCalc) {
              // Valid work duration is 0 or negative relative to shift constraints?
              // Except if actual work was done outside shift and we barely touched shift start.
              // But Rule 1 forces start to Shift Start.
              // If I worked 7:00 - 7:50, Shift 8:00. Start=8:00, End=7:50 ??
              // This implies NO pay for work strictly before shift.
              // Which is consistent with "early checkin -> start from registered".
            }
          }

          const diff = Math.max(0, endCalc - startCalc);
          dayHours += diff / (1000 * 60 * 60);

          lastCheckIn = null;
          lastCheckOut = event.timestamp;
        } else {
          isValidDay = false;
          errorMsg = 'Thiếu Check-in';
        }
      }
    }

    if (lastCheckIn) {
      isValidDay = false;
      errorMsg = 'Quên Check-out';
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
      shift: shift ? `${new Date(shift.start).getHours()}:${new Date(shift.start).getMinutes()} - ${new Date(shift.end).getHours()}:${new Date(shift.end).getMinutes()}` : 'Tự do',
      error: errorMsg || (dayHours === 0 ? 'Không tính công' : undefined)
    });
  });

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
