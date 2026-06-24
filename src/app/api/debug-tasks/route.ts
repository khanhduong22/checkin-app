import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all carrying tasks for the entire month of June 2026 across all users
    const allCarryingTasksInJune = await prisma.userTask.findMany({
      where: {
        taskDefinition: { unit: 'điểm-bưng' },
        createdAt: {
          gte: new Date('2026-06-01T00:00:00Z'),
          lte: new Date('2026-06-30T23:59:59Z')
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
      juneCarryingTasksCount: allCarryingTasksInJune.length,
      juneCarryingTasks: allCarryingTasksInJune.map(t => ({
        id: t.id,
        userName: t.user?.name,
        userEmail: t.user?.email,
        taskName: t.taskDefinition?.name,
        quantity: t.quantity,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        note: t.note
      }))
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}


