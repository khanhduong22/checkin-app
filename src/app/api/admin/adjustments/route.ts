import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, amount, reason } = body;

        if (!userId || typeof amount !== 'number' || !reason) {
            return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
        }

        const result = await prisma.payrollAdjustment.create({
            data: {
                userId,
                amount,
                reason
            }
        });

        revalidatePath('/admin/payroll');
        revalidatePath('/'); // Update user homepage

        return NextResponse.json({ success: true, id: result.id });
    } catch (error: any) {
        console.error("API Error: ", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
