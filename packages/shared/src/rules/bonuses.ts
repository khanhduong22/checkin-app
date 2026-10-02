/**
 * Bonus calculation rules and runners for Checkin App.
 * Includes Hardworking, Birthday, Carrying, and Packing bonuses.
 */

// --- 1. HARDWORKING BONUS (Thưởng Chăm Chỉ) ---

export interface PayrollRecordLike {
  id?: string;
  userId?: string;
  name?: string;
  role?: string;
  employmentType?: string;
  totalHours?: number;
  stats?: {
    employmentType?: string;
    totalHours?: number;
    adjustments?: any[];
    totalAdjustments?: number;
    totalSalary?: number;
    projectedSalary?: number;
    finalNet?: number;
  };
  adjustments?: any[];
  totalAdjustments?: number;
  totalSalary?: number;
  projectedSalary?: number;
  finalNet?: number;
}

/**
 * Applies Top 1 Hardworking Bonus (+200,000 VND for Part-Time staff who worked >= 130 hours).
 * Pure and idempotent function.
 */
export function applyHardworkingBonus<T extends PayrollRecordLike>(
  payrollList: T[],
  month: number,
  year: number,
  isNestedStats: boolean = false
): T[] {
  const useNewOTRule = year > 2026 || (year === 2026 && month >= 8);
  const excludedNames = useNewOTRule ? ["Nía", "Na"] : ["Nía"];

  // Filter eligible users: PART_TIME, not ADMIN, not in excludedNames
  const eligible = payrollList.filter((p) => {
    const name = p.name || "";
    const role = p.role;
    const empType = isNestedStats ? p.stats?.employmentType : p.employmentType;
    return empType !== "FULL_TIME" && role !== "ADMIN" && !excludedNames.includes(name);
  });

  if (eligible.length === 0) return payrollList;

  // Find the top 1 hardworking user (highest totalHours)
  const sorted = [...eligible].sort((a, b) => {
    const hoursA = isNestedStats ? (a.stats?.totalHours || 0) : (a.totalHours || 0);
    const hoursB = isNestedStats ? (b.stats?.totalHours || 0) : (b.totalHours || 0);
    return hoursB - hoursA;
  });

  const topUser = sorted[0];
  const topHours = isNestedStats ? (topUser.stats?.totalHours || 0) : (topUser.totalHours || 0);

  if (topHours >= 130) {
    const allTopUsers = sorted.filter((u) => {
      const hours = isNestedStats ? (u.stats?.totalHours || 0) : (u.totalHours || 0);
      return hours === topHours;
    });

    for (const u of allTopUsers) {
      const targetStats = isNestedStats ? (u.stats as any) : (u as any);
      if (!targetStats) continue;

      const bonusAdjustment = {
        id: `hardworking-bonus-${month}-${year}`,
        userId: u.id || u.userId,
        amount: 200000,
        reason: "Thưởng Top 1 Chăm Chỉ (Làm tối thiểu 130h)",
        date: new Date(year, month - 1, 28),
      };

      if (!targetStats.adjustments) {
        targetStats.adjustments = [];
      }

      // Idempotency: ensure bonus not added twice
      const hasBonus = targetStats.adjustments.some(
        (adj: any) => adj.reason === bonusAdjustment.reason
      );

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

// --- 2. BIRTHDAY BONUS (Thưởng Sinh Nhật) ---

/**
 * Checks if a given birthday date matches today (in Vietnam UTC+7 timezone).
 */
export function isBirthdayToday(
  birthday: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!birthday) return false;
  const bd = birthday instanceof Date ? birthday : new Date(birthday);
  if (isNaN(bd.getTime())) return false;

  // Convert now to VN UTC+7
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayMonth = vnNow.getUTCMonth() + 1;
  const todayDay = vnNow.getUTCDate();

  // Birthday stored in UTC midnight
  const bdMonth = bd.getUTCMonth() + 1;
  const bdDay = bd.getUTCDate();

  return bdMonth === todayMonth && bdDay === todayDay;
}

/**
 * Database runner for birthday bonus: creates +100,000 VND adjustment for matching active users.
 */
export async function runBirthdayBonus(db?: any, now: Date = new Date()): Promise<void> {
  const prismaClient = db || (globalThis as any).prisma;
  if (!prismaClient) return;

  try {
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayMonth = vnNow.getUTCMonth() + 1;
    const todayDay = vnNow.getUTCDate();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const allUsers = await prismaClient.user.findMany({
      where: { isActive: true, birthday: { not: null } },
      select: { id: true, name: true, email: true, birthday: true },
    });

    const birthdayUsers = allUsers.filter((u: any) =>
      isBirthdayToday(u.birthday, now)
    );

    for (const user of birthdayUsers) {
      const existing = await prismaClient.payrollAdjustment.findFirst({
        where: {
          userId: user.id,
          reason: { contains: "sinh nhật" },
          date: { gte: todayStart, lte: todayEnd },
        },
      });

      if (existing) continue;

      await prismaClient.payrollAdjustment.create({
        data: {
          userId: user.id,
          amount: 100000,
          reason: `🎂 Thưởng sinh nhật (${todayDay}/${todayMonth})`,
          date: now,
        },
      });
      console.log(`[Birthday Bonus] +100k granted to ${user.name} (${user.email})`);
    }
  } catch (err) {
    console.error("[Birthday Bonus] Error running birthday bonus:", err);
  }
}

// --- 3. CARRYING BONUS (Thưởng Chiến Thần Bưng Hàng) ---

export interface PointTaskItem {
  userId: string;
  finalAmount: number;
}

export interface BonusCalculationResult {
  topScore: number;
  baseAmount: number;
  tiedUsers: string[];
  splitAmount: number;
  reasonKey: string;
}

/**
 * Pure calculation logic for Carrying points bonus.
 * Minimum threshold: 10 points. >50 points: 200k, <=50 points: 100k.
 */
export function calculateCarryingBonus(
  tasks: PointTaskItem[],
  targetMonth: number, // 0-11
  targetYear: number
): BonusCalculationResult | null {
  const userPoints: Record<string, number> = {};
  for (const pt of tasks) {
    userPoints[pt.userId] = (userPoints[pt.userId] || 0) + (pt.finalAmount || 0);
  }

  const sortedUsers = Object.keys(userPoints).sort((a, b) => userPoints[b] - userPoints[a]);
  if (sortedUsers.length === 0) return null;

  const topScore = userPoints[sortedUsers[0]];
  if (topScore < 10) return null;

  const tiedUsers = Object.keys(userPoints).filter((uid) => userPoints[uid] === topScore);
  const tieCount = tiedUsers.length;

  const baseAmount = topScore > 50 ? 200000 : 100000;
  const splitAmount = Math.round(baseAmount / tieCount);
  const reasonKey = `Thưởng Chiến Thần Bưng Hàng (Top 1 T${targetMonth + 1}/${targetYear})`;

  return {
    topScore,
    baseAmount,
    tiedUsers,
    splitAmount,
    reasonKey,
  };
}

export async function runCarryingBonus(db?: any, now: Date = new Date()): Promise<void> {
  const prismaClient = db || (globalThis as any).prisma;
  if (!prismaClient) return;

  try {
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const targetMonth = vnNow.getUTCMonth();
    const targetYear = vnNow.getUTCFullYear();

    const lastDayOfCurrentMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const isLastDay = vnNow.getUTCDate() === lastDayOfCurrentMonth;
    const isPast6PM = vnNow.getUTCHours() >= 18;

    if (!isLastDay || !isPast6PM) return;

    const reasonKey = `Thưởng Chiến Thần Bưng Hàng (Top 1 T${targetMonth + 1}/${targetYear})`;
    const existing = await prismaClient.payrollAdjustment.findFirst({
      where: { reason: reasonKey },
    });
    if (existing) return;

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const pointTasks = await prismaClient.userTask.findMany({
      where: {
        status: "APPROVED",
        submittedAt: { gte: startDate, lte: endDate },
        taskDefinition: { unit: "điểm-bưng" },
        user: { role: { not: "ADMIN" } },
      },
    });

    const result = calculateCarryingBonus(pointTasks, targetMonth, targetYear);
    if (!result) return;

    for (const uid of result.tiedUsers) {
      await prismaClient.payrollAdjustment.create({
        data: {
          userId: uid,
          amount: result.splitAmount,
          reason: result.reasonKey,
          date: now,
        },
      });
      console.log(`[Carrying Bonus] +${result.splitAmount} VND granted to ${uid}`);
    }
  } catch (err) {
    console.error("[Carrying Bonus] Error running carrying bonus:", err);
  }
}

// --- 4. PACKING BONUS (Thưởng Vua Đóng Hàng) ---

/**
 * Pure calculation logic for Packing points bonus.
 * Minimum threshold: >0 points. >50 points: 200k, <=50 points: 100k.
 */
export function calculatePackingBonus(
  tasks: PointTaskItem[],
  targetMonth: number, // 0-11
  targetYear: number
): BonusCalculationResult | null {
  const userPoints: Record<string, number> = {};
  for (const pt of tasks) {
    userPoints[pt.userId] = (userPoints[pt.userId] || 0) + (pt.finalAmount || 0);
  }

  const sortedUsers = Object.keys(userPoints).sort((a, b) => userPoints[b] - userPoints[a]);
  if (sortedUsers.length === 0) return null;

  const topScore = userPoints[sortedUsers[0]];
  if (topScore <= 0) return null;

  const tiedUsers = Object.keys(userPoints).filter((uid) => userPoints[uid] === topScore);
  const tieCount = tiedUsers.length;

  const baseAmount = topScore > 50 ? 200000 : 100000;
  const splitAmount = Math.round(baseAmount / tieCount);
  const reasonKey = `Thưởng Vua Đóng Hàng (Top 1 T${targetMonth + 1}/${targetYear})`;

  return {
    topScore,
    baseAmount,
    tiedUsers,
    splitAmount,
    reasonKey,
  };
}

export async function runPackingBonus(db?: any, now: Date = new Date()): Promise<void> {
  const prismaClient = db || (globalThis as any).prisma;
  if (!prismaClient) return;

  try {
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const targetMonth = vnNow.getUTCMonth();
    const targetYear = vnNow.getUTCFullYear();

    const lastDayOfCurrentMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const isLastDay = vnNow.getUTCDate() === lastDayOfCurrentMonth;
    const isPast6PM = vnNow.getUTCHours() >= 18;

    if (!isLastDay || !isPast6PM) return;

    const reasonKey = `Thưởng Vua Đóng Hàng (Top 1 T${targetMonth + 1}/${targetYear})`;
    const existing = await prismaClient.payrollAdjustment.findFirst({
      where: { reason: reasonKey },
    });
    if (existing) return;

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const pointTasks = await prismaClient.userTask.findMany({
      where: {
        status: "APPROVED",
        submittedAt: { gte: startDate, lte: endDate },
        taskDefinition: { unit: "điểm" },
        user: { role: { not: "ADMIN" } },
      },
    });

    const result = calculatePackingBonus(pointTasks, targetMonth, targetYear);
    if (!result) return;

    for (const uid of result.tiedUsers) {
      await prismaClient.payrollAdjustment.create({
        data: {
          userId: uid,
          amount: result.splitAmount,
          reason: result.reasonKey,
          date: now,
        },
      });
      console.log(`[Packing Bonus] +${result.splitAmount} VND granted to ${uid}`);
    }
  } catch (err) {
    console.error("[Packing Bonus] Error running packing bonus:", err);
  }
}
