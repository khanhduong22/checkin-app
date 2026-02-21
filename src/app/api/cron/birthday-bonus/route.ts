import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const todayMonth = now.getMonth() + 1; // 1-12
        const todayDay = now.getDate();

        // Set up today's date range (midnight to end of day) for duplicate check
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Find all users who have a birthday today (matching month & day)
        const allUsers = await prisma.user.findMany({
            where: { birthday: { not: null } },
            select: { id: true, name: true, email: true, birthday: true },
        });

        const birthdayUsers = allUsers.filter((u) => {
            if (!u.birthday) return false;
            const bd = new Date(u.birthday);
            return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay;
        });

        const bonuses: { name: string | null; email: string | null }[] = [];

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

            bonuses.push({ name: user.name, email: user.email });
        }

        return NextResponse.json({
            processed: bonuses.length,
            bonuses,
            checkedAt: now.toISOString(),
        });
    } catch (error) {
        console.error("Birthday bonus cron error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
