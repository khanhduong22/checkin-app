import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { startDate: 'desc' },
    take: 20
  });
  console.log("Recent users:", JSON.stringify(users.map(u => ({ id: u.id, name: u.name, email: u.email })), null, 2));

  // Check recent checkins today
  const today = new Date();
  today.setHours(0,0,0,0);
  const checkins = await prisma.checkIn.findMany({
    where: { timestamp: { gte: today } },
    include: { user: { select: { name: true, email: true } } }
  });
  console.log("\nToday Checkins:", JSON.stringify(checkins, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
