import { NextResponse } from 'next/server';
import { runPackingBonus } from '@/lib/packing-bonus';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log('[CRON] Executing packing bonus job...');
        await runPackingBonus();
        return NextResponse.json({ success: true, message: 'Packing bonus execution completed.' });
    } catch (err) {
        console.error('[CRON] Custom packing bonus error:', err);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
