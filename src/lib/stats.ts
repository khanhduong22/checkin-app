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
  totalOvertimeHours: number;
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
  latePenaltyHours: number;
  latePenaltyAmount: number;
}

// --- Late Penalty Helper ---

/**
 * Calculate late penalty hours:
 * - 1st–3rd late: no penalty
 * - 4th late: -1h, 5th: -2h, 6th: -3h, ... nth: -(n-3)h
 */
export function calculateLatePenalty(lateCount: number): number {
  if (lateCount < 4) return 0;
  return lateCount - 3;
}

// --- Data Fetching Helpers ---

async function fetchUserData(userId: string, startDate: Date, endDate: Date) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      adjustments: {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        orderBy: {
          date: 'desc'
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

// Convert any UTC Date to a YYYY-MM-DD string in Vietnam timezone (UTC+7)
function toVNDateKey(date: Date): string {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnMs = date.getTime() + VN_OFFSET_MS;
  return new Date(vnMs).toISOString().split('T')[0];
}

function calculateFullTimeMetrics(user: User, vnYear: number, vnMonth: number, leaveCount: number) {
  if (user.employmentType !== 'FULL_TIME') {
    return { standardDays: 0, dailySalary: 0, dynamicHourlyRate: user.hourlyRate, deduction: 0 };
  }

  // daysInMonth in VN calendar for the target month
  const daysInMonth = new Date(vnYear, vnMonth + 1, 0).getDate();
  let sundays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(vnYear, vnMonth, d);
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
  // Use Vietnam timezone (UTC+7) for month boundaries
  // Convert targetDate to VN local time to get correct year/month
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnDate = new Date(targetDate.getTime() + VN_OFFSET_MS);
  const vnYear = vnDate.getUTCFullYear();
  const vnMonth = vnDate.getUTCMonth();

  // Start = midnight VN time on the 1st = UTC - 7h
  const startDate = new Date(Date.UTC(vnYear, vnMonth, 1) - VN_OFFSET_MS);
  // End = 23:59:59.999 VN time on the last day = UTC - 7h + 23:59:59.999
  const endDate = new Date(Date.UTC(vnYear, vnMonth + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

  // 1. Fetch Data
  const user = await fetchUserData(userId, startDate, endDate);
  if (!user) throw new Error("User not found");

  const isThuKpiSalary = (user.email === 'cuccung123456789@gmail.com' || user.name === 'Thư') && (vnYear > 2026 || (vnYear === 2026 && vnMonth >= 5));
  let completionRate = 1.0;
  let totalTasksCount = 0;
  let approvedTasksCount = 0;

  if (isThuKpiSalary) {
    const monthlyTasks = await prisma.staffTask.findMany({
      where: {
        assigneeId: userId,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          {
            AND: [
              { startDate: null },
              { createdAt: { gte: startDate, lte: endDate } }
            ]
          }
        ]
      }
    });
    totalTasksCount = monthlyTasks.length;
    const now = new Date();
    approvedTasksCount = monthlyTasks.filter(t => {
      if (t.status === 'APPROVED' || t.status === 'DONE') return true;
      if (t.status === 'REJECTED') {
        const diffHours = (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60);
        return diffHours <= 24;
      }
      return false;
    }).length;
    completionRate = totalTasksCount === 0 ? 1.0 : approvedTasksCount / totalTasksCount;
  }

  const { checkins, shifts, allRequests, holidays } = await fetchPeriodData(userId, startDate, endDate);

  // 2. Process Requests & Maps
  const leaves = allRequests.filter(r => r.type === 'LEAVE' && r.status === 'APPROVED');
  const wfhRequests = allRequests.filter(r => r.type === 'WFH' && r.status === 'APPROVED');
  const earlyLeaveApprovedRequests = allRequests.filter(r => r.type === 'EARLY_LEAVE' && r.status === 'APPROVED');
  const earlyLeavePendingRequests = allRequests.filter(r => r.type === 'EARLY_LEAVE' && r.status === 'PENDING');

  const holidayMap = new Map<string, number>();
  holidays.forEach(h => {
    holidayMap.set(toVNDateKey(h.date), h.multiplier);
  });

  const wfhMap = new Map<string, Request>();
  wfhRequests.forEach(r => wfhMap.set(toVNDateKey(r.date), r));

  const earlyLeaveApprovedMap = new Set(earlyLeaveApprovedRequests.map(r => toVNDateKey(r.date)));
  const earlyLeavePendingMap = new Set(earlyLeavePendingRequests.map(r => toVNDateKey(r.date)));

  const shiftsByDay: Record<string, WorkShift> = {};
  shifts.forEach(s => {
    shiftsByDay[toVNDateKey(s.start)] = s;
  });

  const checkinsByDay: Record<string, CheckIn[]> = {};
  const daysWorked = new Set<string>();

  checkins.forEach(c => {
    const dateKey = toVNDateKey(c.timestamp);
    daysWorked.add(dateKey);
    if (!checkinsByDay[dateKey]) checkinsByDay[dateKey] = [];
    checkinsByDay[dateKey].push(c);
  });

  wfhRequests.forEach(r => {
    const d = toVNDateKey(r.date);
    daysWorked.add(d);
  });

  // 3. Calculate Metrics
  const { standardDays, dailySalary, dynamicHourlyRate, deduction } = calculateFullTimeMetrics(user, vnYear, vnMonth, leaves.length);

  // 4. Daily Loop
  let totalHours = 0;
  let totalOvertimeHours = 0;
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
              const currentDateStr = toVNDateKey(event.timestamp);
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

    let scheduledHours = user.employmentType === 'FULL_TIME' ? 8 : 0;
    let canEarnOT = user.employmentType === 'FULL_TIME' || !!shift;
    
    if (shift) {
      scheduledHours = (shift.end.getTime() - shift.start.getTime()) / (1000 * 60 * 60);
    }

    if (dayHours > 0) {
      totalHours += dayHours;
      if (canEarnOT && dayHours > scheduledHours) {
        totalOvertimeHours += (dayHours - scheduledHours);
      }
    }

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
  // Both FULL_TIME and PART_TIME sum daily salaries so holiday multipliers are included.
  let baseSalary = dailyDetails.reduce((sum, day) => sum + (day.salary || 0), 0);

  const totalAdjustments = user.adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  // Late penalty: deduct (lateCount - 3) hours of salary starting from the 4th late occurrence
  const lateCount = dailyDetails.filter(d => d.isLate).length;
  const latePenaltyHours = calculateLatePenalty(lateCount);
  const latePenaltyAmount = latePenaltyHours * dynamicHourlyRate;

  const totalSalary = baseSalary + totalAdjustments - latePenaltyAmount;

  let projectedSalary = baseSalary + totalAdjustments - latePenaltyAmount;
  if (user.employmentType === 'FULL_TIME') {
    projectedSalary = (user.monthlySalary || 0) + totalAdjustments - latePenaltyAmount;
  }

  let statsResult = {
    totalHours,
    totalOvertimeHours,
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
    lateCount,
    latePenaltyHours,
    latePenaltyAmount
  };

  if (isThuKpiSalary) {
    const finalBaseSalary = 3000000 + (completionRate * 3000000);
    const finalDeduction = 3000000 - (completionRate * 3000000);
    const finalTotalSalary = finalBaseSalary + totalAdjustments;

    statsResult = {
      ...statsResult,
      baseSalary: finalBaseSalary,
      deduction: finalDeduction,
      totalSalary: finalTotalSalary,
      projectedSalary: finalTotalSalary,
      employmentType: 'FULL_TIME' as any,
      monthlySalary: 6000000,
      latePenaltyHours: 0,
      latePenaltyAmount: 0,
      // @ts-ignore
      isThuKpiSalary: true,
      kpiCompletionRate: completionRate,
      kpiTasksTotal: totalTasksCount,
      kpiTasksApproved: approvedTasksCount,
      fixedBaseSalary: 3000000,
      kpiSalary: 3000000 * completionRate
    } as any;
  }

  return statsResult;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(date));
}
