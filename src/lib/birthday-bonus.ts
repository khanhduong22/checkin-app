import { prisma } from "@/lib/prisma";

/**
 * Runs birthday bonus logic: gives +100,000 VND to all users whose birthday is today.
 * Safe to call multiple times — uses a duplicate-check by day to prevent double-crediting.
 */
export async function runBirthdayBonus(): Promise<void> {
    try {
        // Use Vietnam time (UTC+7)
        const now = new Date();
        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const todayMonth = vnNow.getUTCMonth() + 1; // 1-12
        const todayDay = vnNow.getUTCDate();

        // Build today's range in local server time (for duplicate check)
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch all users with a birthday set
        const allUsers = await prisma.user.findMany({
            where: { birthday: { not: null } },
            select: { id: true, name: true, email: true, birthday: true },
        });

        // Filter to users whose birthday matches today (month + day)
        const birthdayUsers = allUsers.filter((u) => {
            if (!u.birthday) return false;
            const bd = new Date(u.birthday);
            // Store birthday month/day in UTC (since Prisma stores as UTC midnight)
            // Compare against VN local date
            const bdMonth = bd.getUTCMonth() + 1;
            const bdDay = bd.getUTCDate();
            return bdMonth === todayMonth && bdDay === todayDay;
        });

        for (const user of birthdayUsers) {
            // Check if bonus already given today to avoid duplicates
            const existing = await prisma.payrollAdjustment.findFirst({
                where: {
                    userId: user.id,
                    reason: { contains: "sinh nhật" },
                    date: { gte: todayStart, lte: todayEnd },
                },
            });

            if (existing) continue;

            // Create +100k birthday bonus
            await prisma.payrollAdjustment.create({
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
        // Non-fatal: log but don't break page rendering
        console.error("[Birthday Bonus] Error running birthday bonus:", err);
    }
}
