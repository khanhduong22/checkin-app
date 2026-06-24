import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || "not set";
    const dbType = databaseUrl.includes("neon.tech") ? "Neon DB" : "VPS local DB";

    const thu = await prisma.user.findFirst({
      where: { email: "cuccung123456789@gmail.com" }
    });

    if (!thu) {
      return NextResponse.json({
        success: false,
        dbType,
        error: "User Thư (cuccung123456789@gmail.com) not found in DB"
      });
    }

    // Retrieve all tasks for Thư
    const allTasks = await prisma.staffTask.findMany({
      where: { assigneeId: thu.id },
      include: {
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Check client-side calculations
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    const vnNow = new Date(now.getTime() + VN_OFFSET_MS);

    const currentDay = vnNow.getUTCDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const thisWeekStartLocal = new Date(vnNow);
    thisWeekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
    thisWeekStartLocal.setUTCHours(0, 0, 0, 0);
    const thisWeekStart = new Date(thisWeekStartLocal.getTime() - VN_OFFSET_MS);

    const thisWeekEndLocal = new Date(thisWeekStartLocal);
    thisWeekEndLocal.setUTCDate(thisWeekStartLocal.getUTCDate() + 6);
    thisWeekEndLocal.setUTCHours(23, 59, 59, 999);
    const thisWeekEnd = new Date(thisWeekEndLocal.getTime() - VN_OFFSET_MS);

    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(thisWeekStart.getDate() + 7);

    const nextWeekEnd = new Date(thisWeekEnd);
    nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    const thisWeekTasks = allTasks.filter(t => {
      const taskStart = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      return taskStart >= thisWeekStart && taskStart <= thisWeekEnd;
    });

    const nextWeekTasks = allTasks.filter(t => {
      const taskStart = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      return taskStart >= nextWeekStart && taskStart <= nextWeekEnd;
    });

    return NextResponse.json({
      success: true,
      dbType,
      envNode: process.env.NODE_ENV,
      serverTimeUtc: now.toISOString(),
      thisWeekRange: {
        start: thisWeekStart.toISOString(),
        end: thisWeekEnd.toISOString()
      },
      stats: {
        totalTasks: allTasks.length,
        thisWeekTasksCount: thisWeekTasks.length,
        nextWeekTasksCount: nextWeekTasks.length,
      },
      thisWeekTasksList: thisWeekTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        startDate: t.startDate ? new Date(t.startDate).toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        createdBy: t.createdBy.name
      })),
      nextWeekTasksList: nextWeekTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        startDate: t.startDate ? new Date(t.startDate).toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        createdBy: t.createdBy.name
      }))
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
