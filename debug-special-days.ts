
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  const currentMonth = today.getMonth();
  console.log('Current Month (0-indexed):', currentMonth);

  // 1. Raw Data
  const users = await prisma.user.findMany({
    select: { id: true, name: true, birthday: true, startDate: true }
  });

  console.log('\n--- All Users with Dates ---');
  users.forEach(u => {
    const bMonth = u.birthday ? new Date(u.birthday).getMonth() : 'N/A';
    const sMonth = u.startDate ? new Date(u.startDate).getMonth() : 'N/A';

    const isFebBirthday = bMonth === currentMonth;
    const isFebAnniversary = sMonth === currentMonth;

    if (isFebBirthday || isFebAnniversary) {
      console.log(`[MATCH] ${u.name}: Birthday Month=${bMonth}, Start Month=${sMonth}`);
    } else {
      // console.log(`[SKIP] ${u.name}: Birthday Month=${bMonth}, Start Month=${sMonth}`);
    }
  });

  // 2. Logic simulation
  const specialUsers = users.map(user => {
    let isBirthdayCheck = false;
    let isAnniversaryCheck = false;

    if (user.birthday) {
      const b = new Date(user.birthday);
      if (b.getMonth() === currentMonth) {
        isBirthdayCheck = true;
      }
    }

    if (user.startDate) {
      const s = new Date(user.startDate);
      if (s.getMonth() === currentMonth) {
        // Simplistic check for anniversary (assuming > 0 years or just existing logic)
        if (today.getFullYear() > s.getFullYear()) {
          isAnniversaryCheck = true;
        }
      }
    }

    return {
      name: user.name,
      isBirthdayThisMonth: isBirthdayCheck,
      isAnniversaryThisMonth: isAnniversaryCheck
    };
  }).filter(u => u.isBirthdayThisMonth || u.isAnniversaryThisMonth);

  console.log('\n--- SIMULATED getSpecialDayUsers RESULT ---');
  console.log(specialUsers);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
