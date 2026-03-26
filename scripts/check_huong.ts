import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'hương',
        mode: 'insensitive'
      }
    }
  });
  console.log("Users matching 'hương':", JSON.stringify(users, null, 2));

  // Also check all users just in case
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  const huong = allUsers.find(u => u.name && u.name.toLowerCase().includes('hương'));
  if (huong) {
    console.log("Found in all users:", huong);
  } else {
    // maybe check without unicode
    const huongNoAccent = allUsers.find(u => u.name && u.name.toLowerCase().includes('huong'));
    if (huongNoAccent) {
      console.log("Found without accent:", huongNoAccent);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
