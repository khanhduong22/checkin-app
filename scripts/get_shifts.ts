import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const shifts = await prisma.workShift.findMany({
        take: 10,
        orderBy: { id: 'desc' }
    });
    console.log(shifts.map(s => ({ start: s.start.toISOString(), end: s.end.toISOString() })));
}
main().finally(() => prisma.$disconnect());
