import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const han = await prisma.user.findFirst({ where: { name: 'Hân' } });
    if (!han) {
        console.log('Không tìm thấy nhân viên Hân');
        return;
    }
    console.log('Hân ID:', han.id);
}
main().finally(() => prisma.$disconnect());
