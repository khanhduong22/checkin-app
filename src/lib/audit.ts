import { prisma } from "@/lib/prisma";

export async function logShiftAction(params: {
  shiftId: number;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'TAKE_SWAP';
  changedById: string;
  oldStart?: Date;
  oldEnd?: Date;
  newStart?: Date;
  newEnd?: Date;
}) {
  try {
    await prisma.shiftAuditLog.create({
      data: {
        shiftId: params.shiftId,
        userId: params.userId,
        action: params.action,
        changedById: params.changedById,
        oldStart: params.oldStart,
        oldEnd: params.oldEnd,
        newStart: params.newStart,
        newEnd: params.newEnd,
      },
    });
  } catch (error) {
    console.error("Failed to write shift audit log:", error);
  }
}
