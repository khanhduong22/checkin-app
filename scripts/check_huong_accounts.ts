import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = 'cml1w19sr0001r078xyipndfc';
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true, sessions: true }
  });
  
  console.log("User details:", JSON.stringify(user, null, 2));

  // let's also check if there are any recent logs for NextAuth errors in standard out or vercel
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
