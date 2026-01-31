
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log("Danh sách nhân viên hiện có:");
  users.forEach(u => console.log(`- ${u.name} (${u.email})`));
}
main()
  .finally(() => prisma.$disconnect());
