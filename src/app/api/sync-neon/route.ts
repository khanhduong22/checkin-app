import { NextResponse } from 'next/server';
import { syncCheckInsFromNeon } from '@/lib/sync-neon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await syncCheckInsFromNeon();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const res = await syncCheckInsFromNeon();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
