
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  const achievementsCount = await prisma.userAchievement.count();
  const historyCount = await prisma.luckyWheelHistory.count();
  
  console.log(`Achievements count: ${achievementsCount}`);
  console.log(`LuckyWheelHistory count: ${historyCount}`);

  if (historyCount > 0) {
      const history = await prisma.luckyWheelHistory.findMany({ take: 5 });
      console.log('Sample History:', history);
  }
}

checkData()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
