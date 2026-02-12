
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Verifying TaskItem model...");

  try {
    // Check if we can count task items (even if table is empty)
    const count = await prisma.taskItem.count();
    console.log(`✅ TaskItem model exists! Current count: ${count}`);

    // Create a dummy task definition if needed
    let taskDef = await prisma.taskDefinition.findFirst();
    if (!taskDef) {
      taskDef = await prisma.taskDefinition.create({
        data: {
          name: "Test Task",
          baseReward: 1000,
          unit: "test"
        }
      });
      console.log("Created dummy definition");
    }

    // Attempt to create a Task Item
    const newItem = await prisma.taskItem.create({
      data: {
        taskDefId: taskDef.id,
        title: "Verification Task",
        description: "Just checking",
        status: "OPEN"
      }
    });

    console.log("✅ Created TaskItem:", newItem.id);

    // Clean up
    await prisma.taskItem.delete({ where: { id: newItem.id } });
    console.log("✅ Deleted TaskItem");

  } catch (e) {
    console.error("❌ Verification Failed:", e);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
