
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting full backup to ${backupDir}...`);

  // Helper to dump table
  const dump = async (modelName: string, delegate: any) => {
    try {
      console.log(`Exporting ${modelName}...`);
      const data = await delegate.findMany();
      fs.writeFileSync(
        path.join(backupDir, `${modelName}.json`),
        JSON.stringify(data, null, 2)
      );
      console.log(`  - ${data.length} records.`);
    } catch (e) {
      console.error(`  ! Failed to export ${modelName}:`, e);
    }
  };

  await dump('User', prisma.user);
  await dump('Account', prisma.account);
  await dump('Session', prisma.session);
  await dump('VerificationToken', prisma.verificationToken);
  await dump('WorkShift', prisma.workShift);
  await dump('Request', prisma.request);
  await dump('Announcement', prisma.announcement);
  await dump('StickyNote', prisma.stickyNote);
  await dump('PayrollAdjustment', prisma.payrollAdjustment);
  await dump('LuckyWheelPrize', prisma.luckyWheelPrize);
  await dump('LuckyWheelHistory', prisma.luckyWheelHistory);
  await dump('UserAchievement', prisma.userAchievement);
  await dump('CheckIn', prisma.checkIn);
  await dump('AllowedIP', prisma.allowedIP);
  await dump('Holiday', prisma.holiday);
  await dump('TaskDefinition', prisma.taskDefinition);
  await dump('UserTask', prisma.userTask);

  console.log(`\n✅ Backup completed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
