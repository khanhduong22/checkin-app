'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getShiftAuditLogs(page: number = 1, pageSize: number = 50) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { success: false, error: 'Unauthorized' };

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email: email! } });
  if (!user || user.role !== 'ADMIN') return { success: false, error: 'Forbidden' };

  try {
    const logs = await prisma.shiftAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        changedBy: { select: { id: true, name: true, email: true } },
      }
    });

    const total = await prisma.shiftAuditLog.count();

    return { success: true, logs, total };
  } catch (error: any) {
    console.error("Failed to fetch shift audit logs:", error);
    return { success: false, error: error.message || 'Lỗi server' };
  }
}
