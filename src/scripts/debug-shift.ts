import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log("Users list:", users);

  const targetDateStart = new Date(2026, 5, 13, 0, 0, 0); // June 13th
  const targetDateEnd = new Date(2026, 5, 13, 23, 59, 59);

  const checkins = await prisma.checkIn.findMany({
    where: {
      timestamp: { gte: targetDateStart, lte: targetDateEnd }
    },
    include: { user: true }
  });

  const shifts = await prisma.workShift.findMany({
    where: {
      start: { gte: targetDateStart, lte: targetDateEnd }
    },
    include: { user: true }
  });

  console.log("Check-ins on 13-06:", checkins.map(c => ({
    user: c.user.name,
    userId: c.userId,
    type: c.type,
    time: c.timestamp.toISOString(),
    localTime: new Date(c.timestamp.getTime() + 7 * 60 * 60 * 1000).toISOString()
  })));

  console.log("Shifts on 13-06:", shifts.map(s => ({
    user: s.user.name,
    userId: s.userId,
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    localStart: new Date(s.start.getTime() + 7 * 60 * 60 * 1000).toISOString(),
    localEnd: new Date(s.end.getTime() + 7 * 60 * 60 * 1000).toISOString()
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
