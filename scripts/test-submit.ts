import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const taskDef = await prisma.taskDefinition.findFirst({ where: { unit: 'điểm' } });
  const user = await prisma.user.findFirst();

  if (!taskDef || !user) {
    console.log("No data");
    return;
  }

  try {
    const userTask = await prisma.userTask.create({
      data: {
        userId: user.id,
        taskDefId: taskDef.id,
        unitPrice: taskDef.baseReward,
        status: "SUBMITTED",
        submittedAt: new Date(),
        quantity: 2,
        note: "Tranning test",
        evidenceLink: "",
      },
    });
    console.log("Success:", userTask.id);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
