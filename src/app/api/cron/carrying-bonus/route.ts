import { NextResponse } from 'next/server';
import { runCarryingBonus } from '@/lib/carrying-bonus';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log('[CRON] Executing carrying bonus job...');
        await runCarryingBonus();
        return NextResponse.json({ success: true, message: 'Carrying bonus execution completed.' });
    } catch (err) {
        console.error('[CRON] Custom carrying bonus error:', err);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
