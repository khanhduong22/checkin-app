import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hanId = 'cml1w19v20003r078f4d76ql9';

    // 1. Fetch all tasks for Hân
    const hanTasks = await prisma.userTask.findMany({
      where: { userId: hanId },
      include: { taskDefinition: true },
      orderBy: { createdAt: 'asc' }
    });

    // 2. Fetch carrying tasks for all users between June 10 and June 18, 2026
    const allCarryingTasksInRange = await prisma.userTask.findMany({
      where: {
        taskDefinition: { unit: 'điểm-bưng' },
        createdAt: {
          gte: new Date('2026-06-10T00:00:00Z'),
          lte: new Date('2026-06-18T23:59:59Z')
        }
      },
      include: {
        taskDefinition: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      success: true,
      hanTasksCount: hanTasks.length,
      hanTasks: hanTasks.map(t => ({
        id: t.id,
        name: t.taskDefinition?.name,
        unit: t.taskDefinition?.unit,
        quantity: t.quantity,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        note: t.note
      })),
      allCarryingTasksInRangeCount: allCarryingTasksInRange.length,
      allCarryingTasksInRange: allCarryingTasksInRange.map(t => ({
        id: t.id,
        userName: t.user?.name,
        userEmail: t.user?.email,
        taskName: t.taskDefinition?.name,
        quantity: t.quantity,
        status: t.status,
        createdAt: t.createdAt.toISOString()
      }))
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}

