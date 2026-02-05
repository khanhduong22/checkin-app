import { prisma } from "@/lib/prisma";

export async function getUserMonthlyStats(userId: string, targetDate: Date = new Date()) {
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  // 1. Fetch User Info (Rate + Type)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hourlyRate: true,
      employmentType: true,
      monthlySalary: true,
      adjustments: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  // 2. Fetch Checkins
  const checkins = await prisma.checkIn.findMany({
    where: {
      userId: userId,
      timestamp: { gte: startDate, lte: endDate }
    },
    orderBy: { timestamp: 'asc' }
  });

  // 3. Fetch Shifts
  const shifts = await prisma.workShift.findMany({
    where: {
      userId: userId,
      start: { gte: startDate, lte: endDate }
    }
  });

  // 4. Fetch Approved Leaves (For Full-time deduction)
  const leaves = await prisma.request.findMany({
    where: {
      userId: userId,
      type: 'LEAVE', // "Xin nghỉ phép"
      status: 'APPROVED',
      date: { gte: startDate, lte: endDate }
    }
  });

  // --- Processing ---

  // 0. Pre-calculate Full-time Metrics
  let standardDays = 0;
  let dailySalary = 0;
  let dynamicHourlyRate = user?.hourlyRate || 0;
  let deduction = 0;

  if (user?.employmentType === 'FULL_TIME') {
    let sundays = 0;
    const daysInMonth = endDate.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(targetDate.getFullYear(), targetDate.getMonth(), d);
      if (current.getDay() === 0) sundays++;
    }
    standardDays = daysInMonth - sundays;
    dailySalary = (user.monthlySalary || 0) / (standardDays || 1);
    // Dynamic Hourly = Daily / 8 hours
    dynamicHourlyRate = dailySalary / 8;

    // Deduction for Full Time (Leaves)
    deduction = leaves.length * dailySalary;
  }

  // Map shifts
  const shiftsByDay: { [key: string]: any } = {};
  shifts.forEach((s: any) => {
    const d = s.start.toISOString().split('T')[0];
    if (!shiftsByDay[d]) shiftsByDay[d] = s;
  });

  // Process Daily Work (Hours)
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

  // Compute Daily Details (Hours Worked) - Common for both
  Object.keys(checkinsByDay).forEach(date => {
    const daily = checkinsByDay[date];
    const shift = shiftsByDay[date];
    let dayHours = 0;
    let lastCheckIn: any = null;
    let firstCheckIn = null;
    let firstCheckInEvent: any = null;
    let lastCheckOut = null;
    let lastCheckOutEvent: any = null;
    let isValidDay = true;
    let errorMsg = '';

    for (const event of daily) {
      if (event.type === 'checkin') {
        lastCheckIn = event;
        if (!firstCheckIn) {
          firstCheckIn = event.timestamp;
          firstCheckInEvent = event;
        }
      } else if (event.type === 'checkout') {
        if (lastCheckIn) {
          let startCalc = lastCheckIn.timestamp.getTime();
          let endCalc = event.timestamp.getTime();

          if (shift) {
            const shiftStart = shift.start.getTime();
            const shiftEnd = shift.end.getTime();

            // Logic: Cut off early/late based on shift
            if (startCalc < shiftStart) startCalc = shiftStart;
            if (endCalc < shiftEnd) {
              if (event.note && event.note.trim().length > 0) endCalc = shiftEnd;
            }
          }

          const diff = Math.max(0, endCalc - startCalc);
          dayHours += diff / (1000 * 60 * 60);
          lastCheckIn = null;
          lastCheckOut = event.timestamp;
          lastCheckOutEvent = event;
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

    if (dayHours > 0) totalHours += dayHours;

    dailyDetails.push({
      date: date,
      checkIn: firstCheckIn,
      checkOut: lastCheckOut,
      hours: dayHours,
      salary: (user?.employmentType === 'FULL_TIME' ? Math.min(dayHours, 8) : dayHours) * dynamicHourlyRate, // Full-time capped at 8h for daily value
      isValid: isValidDay && dayHours > 0,
      shift: shift ? `${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(shift.start))} - ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(shift.end))}` : 'Ngoài lịch',
      error: errorMsg || (dayHours === 0 ? 'Không tính công' : undefined),
      checkInNote: firstCheckInEvent?.note || null,
      checkOutNote: lastCheckOutEvent?.note || null,
    });
  });

  dailyDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- FINAL SALARY CALCULATION ---
  let baseSalary = 0;

  if (user?.employmentType === 'FULL_TIME') {
    // For Full Time, Base is calculated from actual daily earnings.
    // The deduction calculated earlier is for informational purposes.
    // Base Salary = Sum of Daily Earnings (Accumulated)
    // dailyDetails.salary involves the 8h cap logic we added.
    baseSalary = dailyDetails.reduce((sum, day) => sum + (day.salary || 0), 0);
  } else {
    // PART TIME LOGIC
    baseSalary = totalHours * (user?.hourlyRate || 0);
  }

  const totalAdjustments = user?.adjustments.reduce((sum: number, adj: any) => sum + adj.amount, 0) || 0;

  // Projection
  let projectedSalary = baseSalary + totalAdjustments;
  if (user?.employmentType === 'FULL_TIME') {
    // Projected = Monthly Fixed + Adjustments (ignoring current earned progress)
    // This assumes no future leaves/deductions
    projectedSalary = (user.monthlySalary || 0) + totalAdjustments;
  }

  return {
    totalHours,
    daysWorked: daysWorked.size,
    checkinCount: checkins.length,
    baseSalary,
    totalAdjustments,
    totalSalary: baseSalary + totalAdjustments,
    projectedSalary,
    dailyDetails,
    adjustments: user?.adjustments || [],
    hourlyRate: user?.hourlyRate || 0,
    dynamicHourlyRate,
    // Extensions for Full Time
    employmentType: user?.employmentType,
    monthlySalary: user?.monthlySalary,
    standardDays,
    dailySalary,
    leaveCount: leaves.length,
    deduction
  };
}
