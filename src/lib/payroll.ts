import { prisma } from "@/lib/prisma";
import { getUserMonthlyStats } from "@/lib/stats";

export async function calculatePayroll(month: number, year: number) {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const targetDate = new Date(year, month - 1, 15);
  const vnDate = new Date(targetDate.getTime() + VN_OFFSET_MS);
  const vnYear = vnDate.getUTCFullYear();
  const vnMonth = vnDate.getUTCMonth();

  // Start = midnight VN time on the 1st = UTC - 7h
  const startDate = new Date(Date.UTC(vnYear, vnMonth, 1) - VN_OFFSET_MS);
  // End = 23:59:59.999 VN time on the last day = UTC - 7h + 23:59:59.999
  const endDate = new Date(Date.UTC(vnYear, vnMonth + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

  // 1. Fetch all users with adjustments for this month
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isActive: true },
        { shifts: { some: { start: { gte: startDate, lte: endDate } } } },
        { checkins: { some: { timestamp: { gte: startDate, lte: endDate } } } },
        { adjustments: { some: { date: { gte: startDate, lte: endDate } } } }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      adjustments: {
        where: {
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'desc' }
      }
    }
  });

  const userIds = users.map(u => u.id);

  // 2. Batch fetch checkins, shifts, requests, holidays, and staff tasks
  const [checkins, shifts, allRequests, holidays, staffTasks] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        userId: { in: userIds },
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'asc' }
    }),
    prisma.workShift.findMany({
      where: {
        userId: { in: userIds },
        start: { gte: startDate, lte: endDate }
      }
    }),
    prisma.request.findMany({
      where: {
        userId: { in: userIds },
        type: { in: ['LEAVE', 'WFH', 'EARLY_LEAVE'] },
        date: { gte: startDate, lte: endDate }
      }
    }),
    prisma.holiday.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      }
    }),
    prisma.staffTask.findMany({
      where: {
        assigneeId: { in: userIds },
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
    })
  ]);

  // Group fetched data by userId in O(1) lookups
  const checkinsByUser = new Map<string, any[]>();
  const shiftsByUser = new Map<string, any[]>();
  const requestsByUser = new Map<string, any[]>();
  const staffTasksByUser = new Map<string, any[]>();

  checkins.forEach(c => {
    if (!checkinsByUser.has(c.userId)) checkinsByUser.set(c.userId, []);
    checkinsByUser.get(c.userId)!.push(c);
  });

  shifts.forEach(s => {
    if (!shiftsByUser.has(s.userId)) shiftsByUser.set(s.userId, []);
    shiftsByUser.get(s.userId)!.push(s);
  });

  allRequests.forEach(r => {
    if (!requestsByUser.has(r.userId)) requestsByUser.set(r.userId, []);
    requestsByUser.get(r.userId)!.push(r);
  });

  staffTasks.forEach(t => {
    if (!staffTasksByUser.has(t.assigneeId)) staffTasksByUser.set(t.assigneeId, []);
    staffTasksByUser.get(t.assigneeId)!.push(t);
  });

  // Calculate in parallel (using pre-fetched, pre-grouped data)
  const payrollData = await Promise.all(users.map(async (user: any) => {
    const stats = await getUserMonthlyStats(user.id, targetDate, {
      user,
      checkins: checkinsByUser.get(user.id) || [],
      shifts: shiftsByUser.get(user.id) || [],
      allRequests: requestsByUser.get(user.id) || [],
      holidays,
      staffTasks: staffTasksByUser.get(user.id) || []
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employmentType: user.employmentType,
      ...stats
    };
  }));

  // Apply hardworking bonus (top 1 part-time user working >= 130 hours gets 200k)
  return applyHardworkingBonus(payrollData, month, year, false);
}

export function applyHardworkingBonus(payrollList: any[], month: number, year: number, isNestedStats: boolean) {
  const useNewOTRule = year > 2026 || (year === 2026 && month >= 8);
  const excludedNames = useNewOTRule ? ['Nía', 'Na'] : ['Nía'];

  // Filter eligible users: PART_TIME, not ADMIN, not in excludedNames
  const eligible = payrollList.filter(p => {
    const name = p.name;
    const role = p.role;
    const empType = isNestedStats ? p.stats?.employmentType : p.employmentType;
    return empType !== 'FULL_TIME' && role !== 'ADMIN' && !excludedNames.includes(name);
  });

  if (eligible.length === 0) return payrollList;

  // Find the top 1 hardworking user (highest totalHours)
  const sorted = [...eligible].sort((a, b) => {
    const hoursA = isNestedStats ? a.stats.totalHours : a.totalHours;
    const hoursB = isNestedStats ? b.stats.totalHours : b.totalHours;
    return hoursB - hoursA;
  });

  const topUser = sorted[0];
  const topHours = isNestedStats ? topUser.stats.totalHours : topUser.totalHours;

  if (topHours >= 130) {
    const allTopUsers = sorted.filter(u => {
      const hours = isNestedStats ? u.stats.totalHours : u.totalHours;
      return hours === topHours;
    });

    for (const u of allTopUsers) {
      const targetStats = isNestedStats ? u.stats : u;

      // Add a synthetic adjustment to adjustments array
      const bonusAdjustment = {
        id: `hardworking-bonus-${month}-${year}`,
        userId: u.id,
        amount: 200000,
        reason: 'Thưởng Top 1 Chăm Chỉ (Làm tối thiểu 130h)',
        date: new Date(year, month - 1, 28)
      };

      if (!targetStats.adjustments) {
        targetStats.adjustments = [];
      }
      // Ensure we don't add it twice (idempotency check in memory)
      const hasBonus = targetStats.adjustments.some((adj: any) => adj.reason === bonusAdjustment.reason);
      if (!hasBonus) {
        targetStats.adjustments = [bonusAdjustment, ...targetStats.adjustments];
        targetStats.totalAdjustments = (targetStats.totalAdjustments || 0) + 200000;
        targetStats.totalSalary = (targetStats.totalSalary || 0) + 200000;
        targetStats.projectedSalary = (targetStats.projectedSalary || 0) + 200000;
        if (targetStats.finalNet !== undefined) {
          targetStats.finalNet = (targetStats.finalNet || 0) + 200000;
        }
      }
    }
  }

  return payrollList;
}

