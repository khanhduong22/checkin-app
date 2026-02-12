"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskStatus } from "@prisma/client";

// --- Task Definitions (Admin) ---

// --- Task Definitions (Admin) ---

export async function getTaskDefinitions() {
  try {
    const definitions = await prisma.taskDefinition.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: definitions };
  } catch (error) {
    console.error("Error fetching task definitions:", error);
    return { success: false, error: "Failed to fetch task definitions" };
  }
}

// ... existing Task Definition actions ...

// --- Task Items (Admin) ---

export async function getTaskItems() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const items = await prisma.taskItem.findMany({
      include: { taskDefinition: true, assignee: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: "Failed to fetch task items" };
  }
}

export async function createTaskItem(data: { taskDefId: string; title: string; description?: string; deadline?: Date }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const item = await prisma.taskItem.create({
      data: {
        ...data,
        status: 'OPEN'
      }
    });
    revalidatePath('/admin/tasks');
    revalidatePath('/tasks');
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: "Failed to create task item" };
  }
}

export async function closeTaskItem(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    await prisma.taskItem.update({
      where: { id },
      data: { status: 'CLOSED' }
    });
    revalidatePath('/admin/tasks');
    revalidatePath('/tasks');
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to close task item" };
  }
}

export async function deleteTaskItem(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    await prisma.taskItem.delete({ where: { id } });
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed" };
  }
}

export async function createTaskDefinition(data: {
  name: string;
  description?: string;
  baseReward: number;
  unit: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const definition = await prisma.taskDefinition.create({
      data: {
        ...data,
        active: true,
      },
    });

    revalidatePath("/admin/tasks");
    revalidatePath("/tasks");
    return { success: true, data: definition };
  } catch (error) {
    console.error("Error creating task definition:", error);
    return { success: false, error: "Failed to create task definition" };
  }
}

export async function updateTaskDefinition(
  id: string,
  data: {
    name?: string;
    description?: string;
    baseReward?: number;
    unit?: string;
    active?: boolean;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const definition = await prisma.taskDefinition.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/tasks");
    revalidatePath("/tasks");
    return { success: true, data: definition };
  } catch (error) {
    console.error("Error updating task definition:", error);
    return { success: false, error: "Failed to update task definition" };
  }
}

export async function deleteTaskDefinition(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.taskDefinition.delete({
      where: { id },
    });

    revalidatePath("/admin/tasks");
    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task definition:", error);
    return { success: false, error: "Failed to delete task definition" };
  }
}

// --- User Actions ---


export async function getAvailableTasks() {
  try {
    // Only return generic tasks if needed, or migrate to Items only.
    // For now, return generic definitions.
    const tasks = await prisma.taskDefinition.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error("Error searching tasks", error);
    return { success: false, error: "Failed to fetch available tasks" };
  }
}

export async function getAvailableTaskItems() {
  try {
    const items = await prisma.taskItem.findMany({
      where: { status: 'OPEN' },
      include: { taskDefinition: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: "Failed to fetch marketplace items" };
  }
}


export async function getUserTasks(userId?: string) {
  try {
    const session = await getServerSession(authOptions);
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return { success: false, error: "User ID required" };
    }

    // specific user can only view their own tasks unless admin
    if (userId && userId !== session?.user?.id && session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const tasks = await prisma.userTask.findMany({
      where: { userId: targetUserId },
      include: { taskDefinition: true, taskItem: true },
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, data: tasks };
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return { success: false, error: "Failed to fetch user tasks" };
  }
}


export async function startTask(taskDefId: string, taskItemId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is checked in (Must be checked out to start WFH task)
    // We assume if the last check-in has no check-out, they are checked in.
    // Or we can check the 'type' of the last check-in.
    // Assuming simple logic: If last CheckIn was "IN", they are at work.
    const lastCheckIn = await prisma.checkIn.findFirst({
      where: { userId: session.user.id },
      orderBy: { timestamp: 'desc' }
    });

    if (lastCheckIn && lastCheckIn.type === "IN") {
      return { success: false, error: "Must be checked out from office to start a WFH task." };
    }

    // If starting a specific Task Item
    if (taskItemId) {
      // Transaction: Check availability and Assign
      // Use interactive transaction to ensure no race condition
      return await prisma.$transaction(async (tx) => {
        const item = await tx.taskItem.findUnique({ where: { id: taskItemId } });
        if (!item || item.status !== 'OPEN') {
          throw new Error("Task item is no longer available.");
        }

        // Assign
        await tx.taskItem.update({
          where: { id: taskItemId },
          data: { status: 'IN_PROGRESS', assigneeId: session.user.id }
        });

        // Create UserTask
        const taskDef = await tx.taskDefinition.findUnique({ where: { id: item.taskDefId } });
        const userTask = await tx.userTask.create({
          data: {
            userId: session.user.id,
            taskDefId: item.taskDefId,
            taskItemId: item.id,
            unitPrice: taskDef?.baseReward || 0,
            status: "PENDING",
            note: item.description // Copy desc to user task or keeping ref
          },
        });
        return { success: true, data: userTask };
      });
    }

    // Legacy: Starting a Generic Task (if still allowed?)
    const taskDef = await prisma.taskDefinition.findUnique({
      where: { id: taskDefId },
    });

    if (!taskDef || !taskDef.active) {
      return { success: false, error: "Task definition not found or inactive" };
    }

    const userTask = await prisma.userTask.create({
      data: {
        userId: session.user.id,
        taskDefId: taskDefId,
        unitPrice: taskDef.baseReward,
        status: "PENDING",
      },
    });

    revalidatePath("/tasks");
    return { success: true, data: userTask };
  } catch (error: any) {
    console.error("Error starting task:", error);
    return { success: false, error: error.message || "Failed to start task" };
  }
}

export async function submitTask(userTaskId: string, data: { quantity: number; evidenceLink: string; note?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userTask = await prisma.userTask.findUnique({
      where: { id: userTaskId }
    });

    if (!userTask) return { success: false, error: "Task not found" };
    if (userTask.userId !== session.user.id) return { success: false, error: "Unauthorized" };
    if (userTask.status !== "PENDING") return { success: false, error: "Task is not in PENDING state" };

    const updated = await prisma.userTask.update({
      where: { id: userTaskId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        quantity: data.quantity,
        evidenceLink: data.evidenceLink,
        note: data.note
      }
    });

    revalidatePath("/tasks");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error submitting task:", error);
    return { success: false, error: "Failed to submit task" };
  }
}

// --- Admin Review Actions ---

export async function getPendingTasks() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const tasks = await prisma.userTask.findMany({
      where: { status: "SUBMITTED" },
      include: { user: true, taskDefinition: true },
      orderBy: { submittedAt: 'asc' }
    });
    return { success: true, data: tasks };
  } catch (error) {
    console.error("Error fetching pending tasks", error);
    return { success: false, error: "Failed" };
  }
}

export async function reviewTask(userTaskId: string, decision: "APPROVED" | "REJECTED", data?: { bonusPenalty?: number; adminNote?: string; finalAmount?: number }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

    const task = await prisma.userTask.findUnique({ where: { id: userTaskId } });
    if (!task) return { success: false, error: "Task not found" };

    // Calculate final amount if approved
    let finalAmount = 0;
    if (decision === "APPROVED") {
      // Default calculation: (UnitPrice * Quantity) + BonusPenalty
      // However, admin might override finalAmount.
      if (data?.finalAmount !== undefined) {
        finalAmount = data.finalAmount;
      } else {
        const baseTotal = task.unitPrice * task.quantity;
        finalAmount = baseTotal + (data?.bonusPenalty || 0);
      }
    }

    const updated = await prisma.userTask.update({
      where: { id: userTaskId },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        adminNote: data?.adminNote,
        bonusPenalty: data?.bonusPenalty || 0,
        finalAmount: finalAmount
      }
    });

    // If approved, create a PayrollAdjustment to reflect in salary/income?
    // OR we just query UserTask for payroll calculation.
    // For now, let's keep it in UserTask. 
    // We can add a PayrollAdjustment if the system relies on that for "Wallet" balance.
    // Given existing PayrollAdjustment model:
    // model PayrollAdjustment {
    //   id        String   @id @default(cuid())
    //   userId    String
    //   amount    Int
    //   reason    String
    //   date      DateTime @default(now())
    //   createdAt DateTime @default(now())
    //   user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    // }
    // It seems safer to create a PayrollAdjustment so it shows up in existing financial reports instantly.

    if (decision === "APPROVED") {
      await prisma.payrollAdjustment.create({
        data: {
          userId: task.userId,
          amount: Math.round(finalAmount), // PayrollAdjustment uses Int
          reason: `WFH Task: ${updated.quantity}x (Ref: ${task.id})`,
        }
      });
    }

    revalidatePath("/admin/tasks");
    return { success: true, data: updated };

  } catch (error) {
    console.error("Error reviewing task", error);
    return { success: false, error: "Failed to review task" };
  }
}
