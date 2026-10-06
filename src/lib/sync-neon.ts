import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { invalidatePayrollCache } from "@/lib/payroll";
import { invalidateUserStatsCache } from "@/lib/stats";

const NEON_URL = process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:npg_ALj4rNpvPCZ3@ep-orange-dust-a1m4z6so-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export async function syncCheckInsFromNeon(sinceDate?: Date) {
  const currentDbUrl = process.env.DATABASE_URL || "";
  // If already pointing to Neon directly, no need to sync to itself
  if (currentDbUrl.includes("neon.tech")) {
    return { success: true, synced: 0, message: "Already on Neon DB" };
  }

  const neonPrisma = new PrismaClient({
    datasources: { db: { url: NEON_URL } }
  });

  try {
    const from = sinceDate || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // Default last 3 days
    const neonCheckins = await neonPrisma.checkIn.findMany({
      where: { timestamp: { gte: from } },
      orderBy: { timestamp: "asc" }
    });

    let synced = 0;
    for (const c of neonCheckins) {
      // Check if this checkin already exists in local DB
      const existing = await prisma.checkIn.findFirst({
        where: {
          userId: c.userId,
          type: c.type,
          timestamp: {
            gte: new Date(c.timestamp.getTime() - 60000),
            lte: new Date(c.timestamp.getTime() + 60000)
          }
        }
      });

      if (!existing) {
        await prisma.checkIn.create({
          data: {
            userId: c.userId,
            type: c.type,
            timestamp: c.timestamp,
            ipAddress: c.ipAddress,
            note: c.note
          }
        });
        synced++;
        await invalidateUserStatsCache(c.userId);
      }
    }

    if (synced > 0) {
      await invalidatePayrollCache();
    }

    return { success: true, synced, message: `Successfully synced ${synced} check-in(s) from Neon` };
  } catch (err: any) {
    console.error("[Sync Neon Error]:", err);
    return { success: false, synced: 0, error: err.message };
  } finally {
    await neonPrisma.$disconnect();
  }
}
