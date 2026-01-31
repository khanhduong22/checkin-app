
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PREFERRED_NAMES = [
  { email: "minhthuu309@gmail.com", name: "Nía" },
  { email: "cuccung123456789@gmail.com", name: "Thư" },
  { email: "baomy18052007@gmail.com", name: "Ngân" },
  { email: "quynhthu9718@gmail.com", name: "Thu" },
  { email: "thutrang090726@gmail.com", name: "Trang" },
  { email: "thuhuong10072007@gmail.com", name: "Hương" },
  { email: "kimphuong050606@gmail.com", name: "Phượng" },
  { email: "maithina4040@gmail.com", name: "Chị Na" },
  { email: "ngocbaohanche25@gmail.com", name: "Bảo Han" }, // Guess/Default just in case
];

async function main() {
  console.log("Updating user names to nicknames...");

  for (const u of PREFERRED_NAMES) {
    try {
      const exists = await prisma.user.findUnique({ where: { email: u.email } });
      if (exists) {
        await prisma.user.update({
          where: { email: u.email },
          data: { name: u.name }
        });
        console.log(`✅ Updated ${u.email} -> ${u.name}`);
      } else {
        console.warn(`⚠️ User not found: ${u.email}`);
      }
    } catch (e) {
      console.error(`❌ Error updating ${u.email}:`, e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
