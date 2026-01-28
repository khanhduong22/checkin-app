import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  // Only pass adapter/accelerateUrl if you use them, but for standard connection in Prisma 7:
  // Actually we need to pass datasource url here if we removed it from schema?
  // Wait, Prisma 7 client might need special config?
  // The previous `npx prisma generate` succeeded. Let's see if standard init works.
  // If we use Prisma 7 with `prisma.config.ts`, the client might need to be initialized differently?
  // Let's stick to standard first. Wait, if URL was removed from schema, we MUST pass it to constructor?
  datasourceUrl: process.env.DATABASE_URL
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
