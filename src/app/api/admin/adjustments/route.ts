import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { invalidatePayrollCache } from '@/lib/payroll';
import { invalidateUserStatsCache } from '@/lib/stats';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, amount, reason, month, year } = body;

        if (!userId || typeof amount !== 'number' || !reason) {
            return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
        }

        let targetDate = new Date();
        if (month && year) {
            // Set date to the 15th of the selected month at 12:00 PM local time
            targetDate = new Date(year, month - 1, 15, 12, 0, 0);
        }

        const result = await prisma.payrollAdjustment.create({
            data: {
                userId,
                amount,
                reason,
                date: targetDate
            }
        });

        await invalidatePayrollCache();
        await invalidateUserStatsCache(userId);

        revalidatePath('/admin/payroll');
        revalidatePath(`/admin/payroll/${userId}`);
        revalidatePath('/payroll');
        revalidatePath(`/admin/employees/${userId}`);
        revalidatePath('/'); // Update user homepage

        return NextResponse.json({ success: true, id: result.id });
    } catch (error: any) {
        console.error("API Error: ", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
