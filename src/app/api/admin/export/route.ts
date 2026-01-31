
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.role !== 'ADMIN') {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_data_${timestamp}.xlsx`;
    const workbook = XLSX.utils.book_new();

    // 1. Users
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    const userRows = users.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      EmploymentType: u.employmentType,
      HourlyRate: u.hourlyRate
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows), "Users");

    // 2. CheckIns
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
      IP: c.ipAddress,
      Note: c.note
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(checkinRows), "CheckIns");

    // 3. Shifts
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(shiftRows), "WorkShifts");

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error("Backup failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
