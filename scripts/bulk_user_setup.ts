
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const USERS_TO_ADD = [
  { email: 'thutrang090726@gmail.com' },
  { email: 'thuhuong10072007@gmail.com' },
  { email: 'quynhthu9718@gmail.com' },
  { email: 'ngocbaohanche25@gmail.com' },
  { email: 'minhthuu309@gmail.com' }, // Target of rename
  { email: 'kimphuong050606@gmail.com' },
  { email: 'cuccung123456789@gmail.com' },
  { email: 'baomy18052007@gmail.com' },
  { email: 'maithina4040@gmail.com', role: 'ADMIN' },
];

async function main() {
  console.log("Starting bulk migration...");

  // 1. Rename mthu@gmail.com -> minhthuu309@gmail.com
  const oldEmail = 'mthu@gmail.com';
  const targetEmail = 'minhthuu309@gmail.com';

  const oldUser = await prisma.user.findUnique({ where: { email: oldEmail } });
  if (oldUser) {
    console.log(`Found old user ${oldEmail} (ID: ${oldUser.id}). Renaming to ${targetEmail}...`);
    try {
      // Check if target already exists to avoid collision
      const existingTarget = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (existingTarget) {
        console.warn(`⚠️ Target email ${targetEmail} already exists! Skipping rename to preserve existing user.`);
      } else {
        await prisma.user.update({
          where: { email: oldEmail },
          data: {
            email: targetEmail,
            name: 'minhthuu309' // Update name to match new email style or keep old? Best to update.
          }
        });
        console.log("✅ Rename successful. History preserved.");
      }
    } catch (e) {
      console.error("❌ Rename failed:", e);
    }
  } else {
    console.log(`ℹ️ Old user ${oldEmail} not found. Skipping rename step.`);
  }

  // 2. Bulk Upsert Users
  console.log("\nProcessing user list...");
  for (const u of USERS_TO_ADD) {
    const name = u.email.split('@')[0];
    const role = (u.role === 'ADMIN') ? 'ADMIN' : 'USER';

    try {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          role: role // Enforce Admin role if specified
        },
        create: {
          email: u.email,
          name: name,
          role: role,
          employmentType: 'PART_TIME', // Default
          hourlyRate: 0
        }
      });
      console.log(`- Processed: ${user.email} [${user.role}]`);
    } catch (e) {
      console.error(`- Error processing ${u.email}:`, e);
    }
  }

  console.log("\nMigration completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
