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

  return payrollData;
}
