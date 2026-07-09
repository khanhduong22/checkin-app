import { prisma } from "@/lib/prisma";

/**
 * Runs packing bonus logic: gives +100,000 VND to the Top 1 employee in packing points.
 * Triggers at 18:00 on the last day of the month, or catches up in the first 5 days of the next month.
 * Safe to call multiple times - idempotency is handled via checking the existing PayrollAdjustment reason.
 */
export async function runPackingBonus(): Promise<void> {
    try {
        const now = new Date();
        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7 buffer
        
        let targetMonth = vnNow.getUTCMonth(); // 0-11
        let targetYear = vnNow.getUTCFullYear();
        
        // Calculate the last day of the current evaluated month
        const lastDayOfCurrentMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        
        const isLastDay = vnNow.getUTCDate() === lastDayOfCurrentMonth;
        const isPast6PM = vnNow.getUTCHours() >= 18;
        
        let shouldCheck = false;
        
        // Case 1: Today is the last day and time is >= 18:00
        if (isLastDay && isPast6PM) {
            shouldCheck = true;
        } 

        if (!shouldCheck) return;

        // Create a unique reason key for the specific month to guarantee it's only awarded once.
        const reasonKey = `Thưởng Vua Đóng Hàng (Top 1 T${targetMonth + 1}/${targetYear})`;

        const existing = await prisma.payrollAdjustment.findFirst({
            where: { reason: reasonKey }
        });

        if (existing) return; // Already awarded this month

        // Find the top 1 packer for the target month
        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

        const pointTasks = await prisma.userTask.findMany({
            where: {
                status: "APPROVED",
                updatedAt: { gte: startDate, lte: endDate },
                taskDefinition: { unit: 'điểm' },
                user: {
                    role: {
                        not: 'ADMIN'
                    }
                }
            }
        });

        const userPoints: Record<string, number> = {};
        for (const pt of pointTasks) {
            if (!userPoints[pt.userId]) {
                userPoints[pt.userId] = 0;
            }
            userPoints[pt.userId] += (pt.finalAmount || 0);
        }

        const sortedUsers = Object.keys(userPoints).sort((a, b) => userPoints[b] - userPoints[a]);
        if (sortedUsers.length === 0) return; // No points accumulated by anyone

        const topScore = userPoints[sortedUsers[0]];
        if (topScore <= 0) return;

        // Find all users who are tied with the top score
        const tiedUsers = Object.keys(userPoints).filter(uid => userPoints[uid] === topScore);
        const tieCount = tiedUsers.length;

        const baseAmount = topScore > 50 ? 200000 : 100000;
        const splitAmount = Math.round(baseAmount / tieCount);

        for (const uid of tiedUsers) {
            await prisma.payrollAdjustment.create({
                data: {
                    userId: uid,
                    amount: splitAmount,
                    reason: reasonKey,
                    date: now
                }
            });
            console.log(`[Packing Bonus] +${splitAmount.toLocaleString()} VND granted to user ${uid} (Split top 1) - ${reasonKey}`);
        }
    } catch (err) {
        console.error("[Packing Bonus] Error running packing bonus:", err);
    }
}
