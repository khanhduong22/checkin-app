import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hanId = 'cml1w19v20003r078f4d76ql9';

    // 1. Fetch Hân's check-ins in June 2026
    const checkins = await prisma.checkIn.findMany({
      where: {
        userId: hanId,
        timestamp: {
          gte: new Date('2026-06-01T00:00:00Z'),
          lte: new Date('2026-06-30T23:59:59Z')
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // 2. Fetch Hân's shifts in June 2026
    const shifts = await prisma.workShift.findMany({
      where: {
        userId: hanId,
        start: {
          gte: new Date('2026-06-01T00:00:00Z'),
          lte: new Date('2026-06-30T23:59:59Z')
        }
      },
      orderBy: { start: 'asc' }
    });

    return NextResponse.json({
      success: true,
      checkinsCount: checkins.length,
      checkins: checkins.map(c => ({
        id: c.id,
        type: c.type,
        timestamp: c.timestamp.toISOString(),
        note: c.note
      })),
      shiftsCount: shifts.length,
      shifts: shifts.map(s => ({
        id: s.id,
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        status: s.status
      }))
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}



