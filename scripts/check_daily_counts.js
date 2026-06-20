const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDaily() {
  const result = await prisma.$queryRaw`
    SELECT 
      DATE(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') as date,
      COUNT(*)::int as count
    FROM "CheckIn"
    WHERE timestamp >= '2026-06-09T00:00:00Z'
    GROUP BY DATE(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
    ORDER BY date
  `;
  console.log('Daily CheckIn counts in Neon DB:', result);
}

checkDaily()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
