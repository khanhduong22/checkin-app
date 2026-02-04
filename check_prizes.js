
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrizes() {
  const prizes = await prisma.luckyWheelPrize.findMany();
  console.log('Total prizes:', prizes.length);
  console.log('Prizes list:', JSON.stringify(prizes, null, 2));
}

checkPrizes()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
