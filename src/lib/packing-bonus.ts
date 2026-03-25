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

        // We use updatedAt to credit points exactly when they were approved/modified by Admin
        const pointTasks = await prisma.userTask.findMany({
            where: {
                status: "APPROVED",
                updatedAt: { gte: startDate, lte: endDate },
                taskDefinition: { unit: 'điểm' }
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

        const top1UserId = sortedUsers[0];

        // Ensure we don't grant 100k if their total score is 0 somehow (defensive check)
        if (userPoints[top1UserId] <= 0) return;

        // Award +100k VND
        await prisma.payrollAdjustment.create({
            data: {
                userId: top1UserId,
                amount: 100000,
                reason: reasonKey,
                date: now
            }
        });

        console.log(`[Packing Bonus] +100k granted to user ${top1UserId} - ${reasonKey}`);
    } catch (err) {
        console.error("[Packing Bonus] Error running packing bonus:", err);
    }
}
