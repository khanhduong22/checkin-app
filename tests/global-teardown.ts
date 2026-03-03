import { PrismaClient } from "@prisma/client";
import { FullConfig } from "@playwright/test";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

const E2E_ADMIN_EMAIL = "e2e-admin@test.local";
const E2E_STAFF_EMAIL = "e2e-staff@test.local";

export default async function globalTeardown(_config: FullConfig) {
  console.log("[E2E Teardown] Cleaning up E2E test data...");

  // 1. Delete all E2E-prefixed data
  await prisma.announcement.deleteMany({
    where: { title: { startsWith: "[E2E]" } },
  });
  await prisma.allowedIP.deleteMany({
    where: { label: { startsWith: "[E2E]" } },
  });

  // 2. Delete staff user data + user
  const staffUser = await prisma.user.findUnique({
    where: { email: E2E_STAFF_EMAIL },
  });
  if (staffUser) {
    await prisma.request.deleteMany({ where: { userId: staffUser.id } });
    await prisma.workShift.deleteMany({ where: { userId: staffUser.id } });
    await prisma.user.delete({ where: { id: staffUser.id } });
  }

  // 3. Delete admin session + user
  const adminUser = await prisma.user.findUnique({
    where: { email: E2E_ADMIN_EMAIL },
  });
  if (adminUser) {
    await prisma.session.deleteMany({ where: { userId: adminUser.id } });
    await prisma.user.delete({ where: { id: adminUser.id } });
  }

  console.log("[E2E Teardown] ✅ All E2E data cleaned.");
  await prisma.$disconnect();
}
