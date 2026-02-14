import { prisma } from "@/lib/prisma";
import { isLate as checkIsLate } from "@/lib/utils";
import { User, EmploymentType, Request, WorkShift, CheckIn, Holiday, PayrollAdjustment } from "@prisma/client";

// --- Interfaces ---

interface DailyDetail {
  date: string;
  checkIn: Date | null;
  checkOut: Date | null;
  hours: number;
  salary: number;
  isLate: boolean;
  multiplier: number;
  isValid: boolean;
  shift: string;
  error?: string;
  checkInNote: string | null;
  checkOutNote: string | null;
}

export interface MonthlyStats {
  totalHours: number;
  daysWorked: number;
  checkinCount: number;
  baseSalary: number;
  totalAdjustments: number;
  totalSalary: number;
  projectedSalary: number;
  dailyDetails: DailyDetail[];
  adjustments: PayrollAdjustment[];
  hourlyRate: number;
  dynamicHourlyRate: number;
  employmentType?: EmploymentType;
  monthlySalary?: number;
  standardDays: number;
  dailySalary: number;
  leaveCount: number;
  deduction: number;
  lateCount: number;
}

// --- Data Fetching Helpers ---

async function fetchUserData(userId: string, startDate: Date, endDate: Date) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      adjustments: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });
}

async function fetchPeriodData(userId: string, startDate: Date, endDate: Date) {
  const [checkins, shifts, allRequests, holidays] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        userId: userId,
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'asc' }
    }),
    prisma.workShift.findMany({
      where: {
        userId: userId,
        start: { gte: startDate, lte: endDate }
      }
    }),
    prisma.request.findMany({
      where: {
        userId: userId,
        type: { in: ['LEAVE', 'WFH', 'EARLY_LEAVE'] },
        date: { gte: startDate, lte: endDate }
      }
    }),
    prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      }
    })
  ]);

  return { checkins, shifts, allRequests, holidays };
}

// --- Calculation Helpers ---

function calculateFullTimeMetrics(user: User, endDate: Date, targetDate: Date, leaveCount: number) {
  if (user.employmentType !== 'FULL_TIME') {
    return { standardDays: 0, dailySalary: 0, dynamicHourlyRate: user.hourlyRate, deduction: 0 };
  }

  let sundays = 0;
  const daysInMonth = endDate.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(targetDate.getFullYear(), targetDate.getMonth(), d);
    if (current.getDay() === 0) sundays++;
  }
  const standardDays = daysInMonth - sundays;
  const dailySalary = (user.monthlySalary || 0) / (standardDays || 1);
  const dynamicHourlyRate = dailySalary / 8;
  const deduction = leaveCount * dailySalary;

  return { standardDays, dailySalary, dynamicHourlyRate, deduction };
}

// --- Main Function ---

export async function getUserMonthlyStats(userId: string, targetDate: Date = new Date()): Promise<MonthlyStats> {
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  // 1. Fetch Data
  const user = await fetchUserData(userId, startDate, endDate);
  if (!user) throw new Error("User not found");

  const { checkins, shifts, allRequests, holidays } = await fetchPeriodData(userId, startDate, endDate);

  // 2. Process Requests & Maps
  const leaves = allRequests.filter(r => r.type === 'LEAVE' && r.status === 'APPROVED');
  const wfhRequests = allRequests.filter(r => r.type === 'WFH' && r.status === 'APPROVED');
  const earlyLeaveApprovedRequests = allRequests.filter(r => r.type === 'EARLY_LEAVE' && r.status === 'APPROVED');
  const earlyLeavePendingRequests = allRequests.filter(r => r.type === 'EARLY_LEAVE' && r.status === 'PENDING');

  const holidayMap = new Map<string, number>();
  holidays.forEach(h => {
    holidayMap.set(h.date.toISOString().split('T')[0], h.multiplier);
  });

  const wfhMap = new Map<string, Request>();
  wfhRequests.forEach(r => wfhMap.set(r.date.toISOString().split('T')[0], r));

  const earlyLeaveApprovedMap = new Set(earlyLeaveApprovedRequests.map(r => r.date.toISOString().split('T')[0]));
  const earlyLeavePendingMap = new Set(earlyLeavePendingRequests.map(r => r.date.toISOString().split('T')[0]));

  const shiftsByDay: Record<string, WorkShift> = {};
  shifts.forEach(s => {
    shiftsByDay[s.start.toISOString().split('T')[0]] = s;
  });

  const checkinsByDay: Record<string, CheckIn[]> = {};
  const daysWorked = new Set<string>();

  checkins.forEach(c => {
    const dateKey = c.timestamp.toISOString().split('T')[0];
    daysWorked.add(dateKey);
    if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
    checkinsByDay[dateKey].push(c);
  });

  wfhRequests.forEach(r => {
    const d = r.date.toISOString().split('T')[0];
    daysWorked.add(d);
  });

  // 3. Calculate Metrics
  const { standardDays, dailySalary, dynamicHourlyRate, deduction } = calculateFullTimeMetrics(user, endDate, targetDate, leaves.length);

  // 4. Daily Loop
  let totalHours = 0;
  const dailyDetails: DailyDetail[] = [];
  const allDates = new Set([...Object.keys(checkinsByDay), ...Array.from(wfhMap.keys())]);

  Array.from(allDates).forEach(date => {
    const dailyCheckins = checkinsByDay[date] || [];
    const shift = shiftsByDay[date];
    let dayHours = 0;

    // Check-in Processing
    let lastCheckIn: CheckIn | null = null;
    let firstCheckIn: Date | null = null;
    let firstCheckInEvent: CheckIn | null = null;
    let lastCheckOut: Date | null = null;
    let lastCheckOutEvent: CheckIn | null = null;

    let isValidDay = true;
    let errorMsg = '';
    let isLate = false;
    let multiplier = holidayMap.get(date) || 1;

    // Process check-in pairs
    for (const event of dailyCheckins) {
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

            // Shift Logic
            if (startCalc < shiftStart) startCalc = shiftStart;

            // Early Leave Logic
            if (endCalc < shiftEnd) {
              const currentDateStr = event.timestamp.toISOString().split('T')[0];
              if (earlyLeaveApprovedMap.has(currentDateStr)) {
                endCalc = shiftEnd;
              } else if (earlyLeavePendingMap.has(currentDateStr)) {
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

    // WFH Logic
    if (wfhMap.has(date)) {
      if (dayHours === 0) {
        dayHours = 8;
        totalHours += 8;
        isValidDay = true;
        errorMsg = 'Làm việc từ xa (WFH)';
      } else {
        errorMsg = errorMsg ? `${errorMsg} + WFH` : 'WFH + Check-in';
      }
    }

    // Lateness Logic
    if (shift && firstCheckIn) {
      if (checkIsLate(firstCheckIn, shift.start)) {
        isLate = true;
      }
    }

    // Daily Salary Calculation
    const effectiveHours = user.employmentType === 'FULL_TIME' ? Math.min(dayHours, 8) : dayHours;
    const dailySalaryCalc = (effectiveHours * dynamicHourlyRate) * multiplier;

    dailyDetails.push({
      date: date,
      checkIn: firstCheckIn,
      checkOut: lastCheckOut,
      hours: dayHours,
      salary: dailySalaryCalc,
      isLate,
      multiplier,
      isValid: isValidDay && dayHours > 0,
      shift: shift ? `${formatTime(shift.start)} - ${formatTime(shift.end)}` : 'Ngoài lịch',
      error: errorMsg || (dayHours === 0 ? 'Không tính công' : undefined),
      checkInNote: firstCheckInEvent?.note || null,
      checkOutNote: lastCheckOutEvent?.note || null,
    });
  });

  dailyDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. Final Totals
  let baseSalary = 0;
  if (user.employmentType === 'FULL_TIME') {
    baseSalary = dailyDetails.reduce((sum, day) => sum + (day.salary || 0), 0);
  } else {
    baseSalary = totalHours * (user.hourlyRate || 0);
  }

  const totalAdjustments = user.adjustments.reduce((sum, adj) => sum + adj.amount, 0);
  const totalSalary = baseSalary + totalAdjustments;

  let projectedSalary = baseSalary + totalAdjustments;
  if (user.employmentType === 'FULL_TIME') {
    projectedSalary = (user.monthlySalary || 0) + totalAdjustments;
  }

  return {
    totalHours,
    daysWorked: daysWorked.size,
    checkinCount: checkins.length,
    baseSalary,
    totalAdjustments,
    totalSalary,
    projectedSalary,
    dailyDetails,
    adjustments: user.adjustments,
    hourlyRate: user.hourlyRate,
    dynamicHourlyRate,
    employmentType: user.employmentType,
    monthlySalary: user.monthlySalary,
    standardDays,
    dailySalary,
    leaveCount: leaves.length,
    deduction,
    lateCount: dailyDetails.filter(d => d.isLate).length
  };
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(date));
}
