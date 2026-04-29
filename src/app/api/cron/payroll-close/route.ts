import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { closePayrollMonth } from "@/app/actions/payroll";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log('[CRON] Executing auto payroll closure...');
        
        // This cron runs daily at 17:00 UTC (00:00 ICT next day).
        // For example: 17:00 UTC April 30th -> 00:00 ICT May 1st.
        const now = new Date(); 
        const currentMonthUTC = now.getMonth();
        
        // Check if adding 24 hours pushes us to a new month. 
        // If it does, today (in UTC) is the LAST day of the month.
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
        
        if (tomorrow.getMonth() === currentMonthUTC) {
            console.log('[CRON] Not the last day of the month, skipping payroll closure.');
            return NextResponse.json({ message: "Not the last day of the month" });
        }

        // It is the last day of the month in UTC. 
        // Which means it is EXACTLY 00:00 of the 1st day of the new month in ICT.
        const targetMonth = now.getMonth() + 1; // 1-indexed (e.g. 4 for April)
        const targetYear = now.getFullYear();

        // 1. Check if it's already closed to avoid duplicate work
        const existingPeriod = await prisma.payrollPeriod.findUnique({
            where: { month_year: { month: targetMonth, year: targetYear } }
        });

        if (existingPeriod?.status === 'CLOSED') {
            console.log(`[CRON] Payroll for ${targetMonth}/${targetYear} is already closed.`);
            return NextResponse.json({ message: "Already closed" });
        }

        // 2. Retrieve existing config (bonus, excluded users, targets) if any
        const bonusPercent = existingPeriod?.bonusPercent || 0;
        const targets = existingPeriod?.bonusTargets || ['PART_TIME'];
        const excludedBonusUsers = existingPeriod?.excludedBonusUsers || [];

        // 3. Execute the closure process
        await closePayrollMonth(targetMonth, targetYear, bonusPercent, targets as any, excludedBonusUsers);
        
        console.log(`[CRON] Successfully closed payroll automatically for ${targetMonth}/${targetYear}`);
        return NextResponse.json({ success: true, message: `Payroll closed for ${targetMonth}/${targetYear}.` });
    } catch (err) {
        console.error('[CRON] Auto payroll closure error:', err);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
