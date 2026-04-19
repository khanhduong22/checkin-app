import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ select: { name: true, employmentType: true } });
    console.log(users);
}
main().finally(() => prisma.$disconnect());
