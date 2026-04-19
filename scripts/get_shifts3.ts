import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const shifts = await prisma.workShift.findMany({
        take: 30,
        orderBy: { id: 'desc' }
    });
    shifts.forEach(s => {
        console.log({ id: s.id, start: s.start.toISOString(), end: s.end.toISOString(), userId: s.userId });
    });
}
main().finally(() => prisma.$disconnect());
