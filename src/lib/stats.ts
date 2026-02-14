import { prisma } from "@/lib/prisma";
import { isLate as checkIsLate } from "@/lib/utils";

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

  // 4. Fetch Approved Requests (Leave & WFH)
  const allRequests = await prisma.request.findMany({
    where: {
      userId: userId,
      type: { in: ['LEAVE', 'WFH', 'EARLY_LEAVE'] },
      // status: 'APPROVED', // We need to check PENDING for Early Leave
      date: { gte: startDate, lte: endDate }
    }
  });

  const leaves = allRequests.filter((r: any) => r.type === 'LEAVE' && r.status === 'APPROVED');
  const wfhRequests = allRequests.filter((r: any) => r.type === 'WFH' && r.status === 'APPROVED');
  const earlyLeaveApprovedRequests = allRequests.filter((r: any) => r.type === 'EARLY_LEAVE' && r.status === 'APPROVED');
  const earlyLeavePendingRequests = allRequests.filter((r: any) => r.type === 'EARLY_LEAVE' && r.status === 'PENDING');

  // 5. Fetch Holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    }
  });

  const holidayMap = new Map();
  holidays.forEach((h: any) => {
    const d = h.date.toISOString().split('T')[0];
    holidayMap.set(d, h.multiplier);
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

  const wfhMap = new Map();
  wfhRequests.forEach((r: any) => {
    const d = r.date.toISOString().split('T')[0];
    wfhMap.set(d, r);
    daysWorked.add(d); // Count WFH as worked day
  });

  const earlyLeaveApprovedMap = new Set();
  earlyLeaveApprovedRequests.forEach((r: any) => {
    const d = r.date.toISOString().split('T')[0];
    earlyLeaveApprovedMap.add(d);
  });

  const earlyLeavePendingMap = new Set();
  earlyLeavePendingRequests.forEach((r: any) => {
    const d = r.date.toISOString().split('T')[0];
    earlyLeavePendingMap.add(d);
  });

  // Compute Daily Details (Hours Worked)
  // Use Set of all relevant dates (Checkins + WFH)
  const allDates = new Set([...Object.keys(checkinsByDay), ...Array.from(wfhMap.keys())]);

  Array.from(allDates).forEach(date => {
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
    let isLate = false;
    let multiplier = 1;
    if (holidayMap.has(date)) {
      multiplier = holidayMap.get(date);
    }

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
              const currentDateStr = event.timestamp.toISOString().split('T')[0];
              // OLD: if (event.note && event.note.trim().length > 0) endCalc = shiftEnd;
              // NEW: Check if approved EARLY_LEAVE exists
              if (earlyLeaveApprovedMap.has(currentDateStr)) {
                endCalc = shiftEnd;
              } else if (earlyLeavePendingMap.has(currentDateStr)) {
                // Early Leave Pending: Calculation stays as actual time (cut short)
                // But we add a note to errorMsg
                errorMsg = errorMsg ? `${errorMsg}, Xin về sớm (Đang chờ duyệt)` : 'Xin về sớm (Đang chờ duyệt)';
              }
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

    // Handle WFH Case (if no physical checkin or supplement)
    // If WFH approved and dayHours is 0 (or low?), we credit 8h (or shift hours)
    if (wfhMap.has(date)) {
      if (dayHours === 0) {
        // Full WFH day
        dayHours = 8;
        totalHours += 8;
        isValidDay = true;
        errorMsg = 'Làm việc từ xa (WFH)';

        // For display purposes, maybe show start/end as WFH?
        // dailyDetails will use checkIn/checkOut null but have hours + valid.
      } else {
        // Hybrid? Worked some hours physically + WFH? 
        // Logic: If they checked in, we use actual hours. 
        // Or maybe WFH is just an excuse for not checking in?
        // Let's append note.
        errorMsg = errorMsg ? `${errorMsg} + WFH` : 'WFH + Check-in';
      }
    }

    // Lateness Check
    if (shift && firstCheckIn) {
      // Simple check: if checkin > shift start + grace period
      if (checkIsLate(firstCheckIn, shift.start)) {
        isLate = true;
      }
    }

    dailyDetails.push({
      date: date,
      checkIn: firstCheckIn,
      checkOut: lastCheckOut,
      hours: dayHours,
      salary: ((user?.employmentType === 'FULL_TIME' ? Math.min(dayHours, 8) : dayHours) * dynamicHourlyRate) * multiplier, // Full-time capped at 8h for daily value, then applied multiplier
      isLate,
      multiplier,
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
    deduction,
    lateCount: dailyDetails.filter(d => d.isLate).length
  };
}
