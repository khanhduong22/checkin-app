
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting export process...");

  // Create a filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_data_${timestamp}.xlsx`;

  // Create new workbook
  const workbook = XLSX.utils.book_new();

  // ==========================================
  // 1. EXPORT USERS
  // ==========================================
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });

  const userRows = users.map(u => ({
    ID: u.id,
    Name: u.name,
    Email: u.email,
    Role: u.role,
    EmploymentType: u.employmentType,
    HourlyRate: u.hourlyRate,
    Image: u.image
  }));

  const userSheet = XLSX.utils.json_to_sheet(userRows);
  XLSX.utils.book_append_sheet(workbook, userSheet, "Users");
  console.log(`- Exported ${users.length} users.`);

  // ==========================================
  // 2. EXPORT CHECK-INS
  // ==========================================
  const checkins = await prisma.checkIn.findMany({
    include: { user: true },
    orderBy: { timestamp: 'desc' }
  });

  const checkinRows = checkins.map(c => ({
    ID: c.id,
    User: c.user?.name,
    Email: c.user?.email,
    Type: c.type,
    Timestamp: c.timestamp,
    IP_Address: c.ipAddress,
    Note: c.note
  }));

  const checkinSheet = XLSX.utils.json_to_sheet(checkinRows);
  XLSX.utils.book_append_sheet(workbook, checkinSheet, "CheckIns");
  console.log(`- Exported ${checkins.length} check-in records.`);

  // ==========================================
  // 3. EXPORT SHIFTS
  // ==========================================
  const shifts = await prisma.workShift.findMany({
    include: { user: true },
    orderBy: { start: 'desc' }
  });

  const shiftRows = shifts.map(s => ({
    ID: s.id,
    User: s.user?.name,
    Email: s.user?.email,
    Start_Time: s.start,
    End_Time: s.end,
    Duration_Hours: parseFloat(((s.end.getTime() - s.start.getTime()) / 3600000).toFixed(2)),
    Status: s.status,
    Created_At: s.createdAt
  }));

  const shiftSheet = XLSX.utils.json_to_sheet(shiftRows);
  XLSX.utils.book_append_sheet(workbook, shiftSheet, "WorkShifts");
  console.log(`- Exported ${shifts.length} shifts.`);

  // ==========================================
  // Write File
  // ==========================================
  XLSX.writeFile(workbook, filename);
  console.log(`\n✅ Data exported successfully to: ${filename}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
