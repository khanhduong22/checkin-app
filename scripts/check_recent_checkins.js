const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecent() {
  const result = await prisma.checkIn.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
    include: { user: true }
  });
  console.log('Recent CheckIns in Neon DB:');
  for (const c of result) {
    console.log(`- Time: ${c.timestamp.toISOString()} (Local: ${c.timestamp.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}), User: ${c.user.name} (${c.user.email})`);
  }
}

checkRecent()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
