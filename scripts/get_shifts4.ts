import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // April 21 shifts
    const shifts = await prisma.workShift.findMany({
        where: {
            start: {
                gte: new Date('2026-04-20T17:00:00.000Z'),
                lt: new Date('2026-04-21T17:00:00.000Z')
            }
        },
        include: { user: true },
        orderBy: { start: 'asc' }
    });
    shifts.forEach(s => {
        console.log({ id: s.id, name: s.user.name, start: s.start.toISOString(), end: s.end.toISOString() });
    });
}
main().finally(() => prisma.$disconnect());
