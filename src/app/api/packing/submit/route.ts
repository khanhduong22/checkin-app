import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskDefId, quantity, note } = body;

    if (!taskDefId) {
      return NextResponse.json({ success: false, error: "Thiếu Task ID" }, { status: 400 });
    }

    const taskDef = await prisma.taskDefinition.findUnique({
      where: { id: taskDefId },
    });

    if (!taskDef || !taskDef.active) {
      return NextResponse.json({ success: false, error: "Task definition not found or inactive" }, { status: 404 });
    }

    const userTask = await prisma.userTask.create({
      data: {
        userId: session.user.id,
        taskDefId: taskDefId,
        unitPrice: taskDef.baseReward,
        status: "SUBMITTED",
        submittedAt: new Date(),
        quantity: quantity || 1,
        note: note || "",
        evidenceLink: "",
      },
    });

    revalidatePath("/packing");
    revalidatePath("/carrying");
    revalidatePath("/tasks");
    revalidatePath("/admin/tasks");

    return NextResponse.json({ success: true, data: { id: userTask.id } });
  } catch (error: any) {
    console.error("API error direct submitting task:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to submit task" }, { status: 500 });
  }
}
