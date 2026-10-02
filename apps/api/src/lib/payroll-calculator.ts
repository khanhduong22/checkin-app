import { prisma } from "@checkin/db";
import { calculateLatePenalty, isLate as checkIsLate } from "@checkin/shared";
import { getVietnamMonthRange, toVNDateString, VN_OFFSET_MS } from "./date-utils";

export interface DailyDetail {
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
  isSenior?: boolean;
}

export interface UserPayrollSummary {
  userId: string;
  totalHours: number;
  daysWorked: number;
  baseSalary: number;
  totalAdjustments: number;
  lateCount: number;
  latePenaltyHours: number;
  latePenaltyAmount: number;
  totalSalary: number;
  projectedSalary: number;
  hourlyRate: number;
  monthlySalary: number;
  employmentType: string;
  dailyDetails: DailyDetail[];
}

export async function calculateUserMonthlyStats(
  userId: string,
  targetDate: Date = new Date()
): Promise<UserPayrollSummary | null> {
  const { startDate, endDate, month, year } = getVietnamMonthRange(
    targetDate.getMonth() + 1,
    targetDate.getFullYear()
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      adjustments: {
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: "desc" },
      },
      payslips: {
        where: { month, year },
      },
    },
  });

  if (!user) return null;

  // 1. If Payslip is already saved and CLOSED/PAID, we can return stored summary
  const existingPayslip = user.payslips?.[0];
  if (existingPayslip && existingPayslip.status === "PAID" && existingPayslip.content) {
    const content = existingPayslip.content as any;
    return {
      userId: user.id,
      totalHours: content.totalHours || 0,
      daysWorked: content.daysWorked || 0,
      baseSalary: content.baseSalary || 0,
      totalAdjustments: content.totalAdjustments || 0,
      lateCount: content.lateCount || 0,
      latePenaltyHours: content.latePenaltyHours || 0,
      latePenaltyAmount: content.latePenaltyAmount || 0,
      totalSalary: existingPayslip.netSalary || content.totalSalary || 0,
      projectedSalary: content.projectedSalary || existingPayslip.netSalary || 0,
      hourlyRate: user.hourlyRate,
      monthlySalary: user.monthlySalary,
      employmentType: user.employmentType,
      dailyDetails: content.dailyDetails || [],
    };
  }

  // 2. Live calculation
  const [checkins, shifts, requests, holidays] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        userId,
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.workShift.findMany({
      where: {
        userId,
        start: { gte: startDate, lte: endDate },
      },
      orderBy: { start: "asc" },
    }),
    prisma.request.findMany({
      where: {
        userId,
        type: { in: ["LEAVE", "WFH", "EARLY_LEAVE"] },
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    }),
  ]);

  const holidayMap = new Map<string, number>();
  holidays.forEach((h: { date: Date; multiplier: number }) => {
    holidayMap.set(toVNDateString(h.date), h.multiplier);
  });

  const shiftsByDay: Record<string, any> = {};
  shifts.forEach((s: any) => {
    const key = toVNDateString(s.start);
    if (!shiftsByDay[key] || s.isSenior) {
      shiftsByDay[key] = s;
    }
  });

  const checkinsByDay: Record<string, any[]> = {};
  checkins.forEach((c: any) => {
    const key = toVNDateString(c.timestamp);
    if (!checkinsByDay[key]) checkinsByDay[key] = [];
    checkinsByDay[key].push(c);
  });

  const wfhDates = new Set(
    requests
      .filter((r: any) => r.type === "WFH" && r.status === "APPROVED")
      .map((r: any) => toVNDateString(r.date))
  );

  const leavesCount = requests.filter(
    (r: any) => r.type === "LEAVE" && r.status === "APPROVED"
  ).length;

  // Rate calculation
  let dynamicHourlyRate = user.hourlyRate;
  if (user.employmentType === "FULL_TIME") {
    // Days in month minus Sundays
    const daysInMonth = new Date(year, month, 0).getDate();
    let sundays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(year, month - 1, d);
      if (cur.getDay() === 0) sundays++;
    }
    const standardDays = Math.max(1, daysInMonth - sundays);
    const dailySalary = (user.monthlySalary || 0) / standardDays;
    dynamicHourlyRate = dailySalary / 8;
  }

  const allDates = new Set([...Object.keys(checkinsByDay), ...Array.from(wfhDates)]);
  const dailyDetails: DailyDetail[] = [];
  let totalHours = 0;

  for (const date of allDates) {
    const dailyCheckins = checkinsByDay[date] || [];
    const shift = shiftsByDay[date];
    const multiplier = holidayMap.get(date) || 1;

    let dayHours = 0;
    let firstCheckIn: Date | null = null;
    let lastCheckOut: Date | null = null;
    let lastIn: any = null;
    let isLate = false;
    let isValid = true;
    let errorMsg = "";

    for (const ev of dailyCheckins) {
      if (ev.type === "checkin") {
        lastIn = ev;
        if (!firstCheckIn) firstCheckIn = ev.timestamp;
      } else if (ev.type === "checkout") {
        if (lastIn) {
          let startMs = lastIn.timestamp.getTime();
          let endMs = ev.timestamp.getTime();

          if (shift) {
            const shiftStartMs = shift.start.getTime();
            if (startMs < shiftStartMs) startMs = shiftStartMs;
          }

          const diffMs = Math.max(0, endMs - startMs);
          dayHours += diffMs / (1000 * 60 * 60);
          lastIn = null;
          lastCheckOut = ev.timestamp;
        } else {
          isValid = false;
          errorMsg = "Thiếu Check-in";
        }
      }
    }

    if (lastIn) {
      isValid = false;
      errorMsg = "Quên Check-out";
    }

    if (wfhDates.has(date)) {
      if (dayHours === 0) {
        dayHours = 8;
        isValid = true;
        errorMsg = "Làm việc từ xa (WFH)";
      }
    }

    if (shift && firstCheckIn) {
      if (checkIsLate(firstCheckIn, shift.start)) {
        isLate = true;
      }
    }

    const isSenior = Boolean(shift?.isSenior);
    const seniorRateBonus = isSenior ? 3000 : 0;
    const effectiveRate = dynamicHourlyRate + seniorRateBonus;
    const effectiveHours =
      user.employmentType === "FULL_TIME" ? Math.min(dayHours, 8) : dayHours;
    const dailySalary = effectiveHours * effectiveRate * multiplier;

    totalHours += dayHours;

    dailyDetails.push({
      date,
      checkIn: firstCheckIn,
      checkOut: lastCheckOut,
      hours: dayHours,
      salary: dailySalary,
      isLate,
      multiplier,
      isValid: isValid && dayHours > 0,
      shift: shift
        ? `${new Date(shift.start).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${new Date(shift.end).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Ngoài lịch",
      error: errorMsg || undefined,
      isSenior,
    });
  }

  dailyDetails.sort((a, b) => b.date.localeCompare(a.date));

  const baseSalary = dailyDetails.reduce((sum, d) => sum + d.salary, 0);
  const totalAdjustments = user.adjustments.reduce((sum, a) => sum + a.amount, 0);

  const lateCount = dailyDetails.filter((d) => d.isLate).length;
  const latePenaltyHours = calculateLatePenalty(lateCount);
  const latePenaltyAmount = latePenaltyHours * dynamicHourlyRate;

  const totalSalary = Math.max(0, baseSalary + totalAdjustments - latePenaltyAmount);

  // Projected salary based on remaining days of month
  const todayVN = new Date(Date.now() + VN_OFFSET_MS);
  const currentDay = todayVN.getUTCDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const progress = Math.max(1, currentDay) / daysInMonth;
  const projectedSalary = progress > 0 ? Math.round(totalSalary / progress) : totalSalary;

  return {
    userId: user.id,
    totalHours: Math.round(totalHours * 10) / 10,
    daysWorked: dailyDetails.filter((d) => d.hours > 0).length,
    baseSalary: Math.round(baseSalary),
    totalAdjustments,
    lateCount,
    latePenaltyHours,
    latePenaltyAmount: Math.round(latePenaltyAmount),
    totalSalary: Math.round(totalSalary),
    projectedSalary: Math.round(projectedSalary),
    hourlyRate: user.hourlyRate,
    monthlySalary: user.monthlySalary,
    employmentType: user.employmentType,
    dailyDetails,
  };
}

export async function calculateMonthlyPayrollSummary(
  targetDate: Date = new Date()
): Promise<{
  totalPayroll: number;
  totalProjected: number;
  details: Array<{
    userId: string;
    userName: string;
    actualHours: number;
    totalSalary: number;
    overtimeHours: number;
  }>;
}> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let totalPayroll = 0;
  let totalProjected = 0;
  const details = [];

  for (const user of users) {
    const stats = await calculateUserMonthlyStats(user.id, targetDate);
    if (stats) {
      totalPayroll += stats.totalSalary;
      totalProjected += stats.projectedSalary;
      const standardHours = 176;
      const actualHours = stats.totalHours || 0;
      const overtimeHours = Math.max(0, actualHours - standardHours);
      details.push({
        userId: user.id,
        userName: user.name || "Nhân viên",
        actualHours,
        totalSalary: stats.totalSalary,
        overtimeHours,
      });
    }
  }

  return {
    totalPayroll,
    totalProjected,
    details,
  };
}
