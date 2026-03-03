import { PrismaClient } from "@prisma/client";
import { FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load .env for DATABASE_URL
config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();

// Fixed session token — easy to identify and cleanup
const E2E_ADMIN_SESSION = "e2e-admin-session-token-fixed";
const E2E_ADMIN_EMAIL = "e2e-admin@test.local";
const E2E_STAFF_EMAIL = "e2e-staff@test.local";

export default async function globalSetup(_config: FullConfig) {
  console.log("[E2E Setup] Starting global setup...");

  // 1. Pre-clean any orphaned E2E data from previous runs
  await preClean();

  // 2. Upsert test admin user
  const adminUser = await prisma.user.upsert({
    where: { email: E2E_ADMIN_EMAIL },
    update: { role: "ADMIN", name: "[E2E] Test Admin" },
    create: {
      email: E2E_ADMIN_EMAIL,
      name: "[E2E] Test Admin",
      role: "ADMIN",
    },
  });

  // 3. Create admin session (fixed token for easy cookie injection)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.upsert({
    where: { sessionToken: E2E_ADMIN_SESSION },
    update: { expires, userId: adminUser.id },
    create: {
      sessionToken: E2E_ADMIN_SESSION,
      userId: adminUser.id,
      expires,
    },
  });

  // 4. Upsert test STAFF user
  const staffUser = await prisma.user.upsert({
    where: { email: E2E_STAFF_EMAIL },
    update: { role: "USER", name: "[E2E] Test Staff" },
    create: {
      email: E2E_STAFF_EMAIL,
      name: "[E2E] Test Staff",
      role: "USER",
    },
  });

  // 5. Create STAFF session
  const E2E_STAFF_SESSION = "e2e-staff-session-token-fixed";
  await prisma.session.upsert({
    where: { sessionToken: E2E_STAFF_SESSION },
    update: { expires, userId: staffUser.id },
    create: {
      sessionToken: E2E_STAFF_SESSION,
      userId: staffUser.id,
      expires,
    },
  });

  // 6. Seed a PENDING leave request from staff user
  await prisma.request.create({
    data: {
      userId: staffUser.id,
      type: "LEAVE",
      date: new Date(),
      reason: "[E2E] Test leave request for approve/reject flow",
      status: "PENDING",
    },
  });

  // 7. Save ADMIN auth cookie state for Playwright
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const cookieBase = {
    domain: "localhost",
    path: "/",
    expires: expires.getTime() / 1000,
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };

  fs.writeFileSync(
    path.join(authDir, "admin.json"),
    JSON.stringify({
      cookies: [{ name: "next-auth.session-token", value: E2E_ADMIN_SESSION, ...cookieBase }],
      origins: [],
    }, null, 2)
  );

  // 8. Save STAFF auth cookie state for Playwright
  fs.writeFileSync(
    path.join(authDir, "staff.json"),
    JSON.stringify({
      cookies: [{ name: "next-auth.session-token", value: E2E_STAFF_SESSION, ...cookieBase }],
      origins: [],
    }, null, 2)
  );

  console.log("[E2E Setup] ✅ Admin + Staff sessions seeded.");
  await prisma.$disconnect();
}

async function preClean() {
  console.log("[E2E Setup] Pre-cleaning orphaned E2E data...");

  // Delete E2E announcements
  await prisma.announcement.deleteMany({
    where: { title: { startsWith: "[E2E]" } },
  });

  // Delete E2E allowed IPs
  await prisma.allowedIP.deleteMany({
    where: { label: { startsWith: "[E2E]" } },
  });

  // Delete all data for E2E staff user
  const staffUser = await prisma.user.findUnique({
    where: { email: E2E_STAFF_EMAIL },
  });
  if (staffUser) {
    await prisma.request.deleteMany({ where: { userId: staffUser.id } });
    await prisma.workShift.deleteMany({ where: { userId: staffUser.id } });
  }

  // Delete E2E admin sessions
  const adminUser = await prisma.user.findUnique({
    where: { email: E2E_ADMIN_EMAIL },
  });
  if (adminUser) {
    await prisma.session.deleteMany({ where: { userId: adminUser.id } });
  }

  console.log("[E2E Setup] ✅ Pre-clean done.");
}
