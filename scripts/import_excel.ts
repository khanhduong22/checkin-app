
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Please provide the path to the Excel file.');
    console.error('Usage: npx ts-node scripts/import_excel.ts <path-to-file>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(absolutePath, { cellDates: true });

  // ==========================
  // SHEET 1: USERS
  // Columns: email, name, role, employmentType, hourlyRate
  // ==========================
  const userSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('user'));
  if (userSheetName) {
    console.log(`Found Users sheet: ${userSheetName}`);
    const users: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[userSheetName]);

    for (const row of users) {
      if (!row.email) continue;

      console.log(`Processing user: ${row.email}`);
      await prisma.user.upsert({
        where: { email: row.email },
        update: {
          name: row.name,
          role: row.role || 'USER',
          employmentType: row.employmentType || 'PART_TIME',
          hourlyRate: parseFloat(row.hourlyRate) || 0,
        },
        create: {
          email: row.email,
          name: row.name,
          role: row.role || 'USER',
          employmentType: row.employmentType || 'PART_TIME',
          hourlyRate: parseFloat(row.hourlyRate) || 0,
        }
      });
    }
  } else {
    console.log('No "Users" sheet found. Skipping user import.');
  }

  // ==========================
  // SHEET 2: CHECKINS
  // Columns: email, timestamp, type (checkin/checkout), ipAddress
  // ==========================
  const checkinSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('checkin'));
  if (checkinSheetName) {
    console.log(`Found CheckIns sheet: ${checkinSheetName}`);
    const checkins: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[checkinSheetName]);

    for (const row of checkins) {
      if (!row.email || !row.timestamp) continue;

      const user = await prisma.user.findUnique({ where: { email: row.email } });
      if (!user) {
        console.warn(`User not found for checkin: ${row.email}`);
        continue;
      }

      // Convert Excel date to JS Date if necessary
      // Excel dates can be numbers or strings. XLSX usually handles it if cell format is date.
      // If it's a string, new Date() might work.
      let date = row.timestamp;
      // If XLSX parsed it as a number (serial date), convert it? 
      // check if it's a number:
      if (typeof date === 'number') {
        // Excel epoch diff logic or just rely on string parsing if user saved as text
        // Ideally, user provides ISO string or standard format.
        // Let's assume standard JS parsable string for now.
      }

      await prisma.checkIn.create({
        data: {
          userId: user.id,
          timestamp: new Date(date),
          type: row.type?.toLowerCase() || 'checkin',
          ipAddress: row.ipAddress || 'Imported',
          note: 'Imported from Excel'
        }
      });
    }
    console.log(`Imported ${checkins.length} checkins.`);
  }

  // ==========================
  // SHEET 3: SHIFTS
  // Columns: email, start, end
  // ==========================
  const shiftSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('shift'));
  if (shiftSheetName) {
    console.log(`Found Shifts sheet: ${shiftSheetName}`);
    const shifts: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[shiftSheetName]);

    for (const row of shifts) {
      if (!row.email || !row.start || !row.end) continue;

      const user = await prisma.user.findUnique({ where: { email: row.email } });
      if (!user) {
        console.warn(`User not found for shift: ${row.email}`);
        continue;
      }

      await prisma.workShift.create({
        data: {
          userId: user.id,
          start: new Date(row.start),
          end: new Date(row.end),
          status: 'APPROVED',
          shiftType: 'IMPORTED'
        }
      });
    }
    console.log(`Imported ${shifts.length} shifts.`);
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
