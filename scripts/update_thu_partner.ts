import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "cuccung123456789@gmail.com";
  console.log(`Checking user with email: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`User ${email} not found in database.`);
    return;
  }

  console.log(`Found user: ${user.name} (${user.id}), current role: ${user.role}`);

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "PARTNER" as any },
  });

  console.log(`Successfully updated user ${updated.name} to role: ${updated.role} 🚀`);
}

main()
  .catch((err) => {
    console.error("Error updating user role:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
