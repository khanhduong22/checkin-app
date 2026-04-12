import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MAPPING: { [key: string]: string } = {
  "trang": "thutrang090726@gmail.com",
  "hiền": "thanhhien190907@gmail.com",
  "phượng": "kimphuong050606@gmail.com",
  "uyên": "hotrankhanhuyen7@gmail.com",
  "hương": "thuhuong10072007@gmail.com",
  "thư": "cuccung123456789@gmail.com",
  "nía": "minhthuu309@gmail.com",
  "nhi": "ptbn24@gmail.com",
  "hân": "ngocbaohanche25@gmail.com",
};

// year: 2026, month: 3 (April)
// Dates:
// T2: 13
// T3: 14
// T4: 15
// T5: 16
// T6: 17
// T7: 18
// CN: 19

const scheduleData = [
  // Thứ 2
  { date: 13, shift: "Ca Sáng", names: ["Trang", "Hiền"] },
  { date: 13, shift: "Ca giữa 3", names: ["phượng"] },
  { date: 13, shift: "Ca Chiều", names: ["Uyên", "hương", "Thư"] },
  { date: 13, shift: "Hân 8h-16h", names: ["Hân"] },
  
  // Thứ 3
  { date: 14, shift: "Ca Sáng", names: ["Uyên", "Nía", "Nhi"] },
  { date: 14, shift: "Ca giữa 2", names: ["phượng"] },
  { date: 14, shift: "Ca Chiều", names: ["hương", "Trang"] },
  { date: 14, shift: "Hân 8h-16h", names: ["Hân"] },

  // Thứ 4
  { date: 15, shift: "Ca Sáng", names: ["Nía", "thư"] },
  { date: 15, shift: "Ca giữa 1", names: ["Nhi"] },
  { date: 15, shift: "Ca giữa 3", names: ["phượng"] },
  { date: 15, shift: "Ca Chiều", names: ["hương", "Hiền", "Trang"] },
  { date: 15, shift: "Hân 8h-16h", names: ["Hân"] },

  // Thứ 5
  { date: 16, shift: "Ca Sáng", names: ["Nía", "Thư"] },
  { date: 16, shift: "Ca giữa 2", names: ["Trang"] },
  { date: 16, shift: "Ca Chiều", names: ["Uyên", "Hiền"] },
  { date: 16, shift: "Hân 8h-16h", names: ["Hân"] },

  // Thứ 6
  { date: 17, shift: "Ca Sáng", names: ["Nía", "Thư"] },
  { date: 17, shift: "Ca Chiều", names: ["Hương", "Hiền", "Trang"] },
  { date: 17, shift: "Hân 8h-16h", names: ["Hân"] },

  // Thứ 7
  { date: 18, shift: "Ca Sáng", names: ["Thư", "Hiền", "Nhi"] },
  { date: 18, shift: "Ca giữa 2", names: ["Uyên"] },
  { date: 18, shift: "Ca giữa 3", names: ["phượng", "hương"] },
  { date: 18, shift: "Hân 8h-16h", names: ["Hân"] },

  // Chủ Nhật
  { date: 19, shift: "Ca Sáng", names: ["phượng", "Thư", "Nhi"] },
  { date: 19, shift: "Ca giữa 3", names: ["Hiền", "Trang"] },
];

const SHIFT_TIMES: { [key: string]: { startH: number, endH: number } } = {
  "Ca Sáng": { startH: 8, endH: 12 },
  "Ca giữa 1": { startH: 9, endH: 13 },
  "Ca giữa 2": { startH: 10, endH: 14 },
  "Ca giữa 3": { startH: 11, endH: 16 },
  "Ca Chiều": { startH: 12, endH: 17 },
  "Hân 8h-16h": { startH: 8, endH: 16 },
};

async function main() {
  console.log("Importing schedule week 13 -> 19 April 2026...");
  let added = 0;

  for (const item of scheduleData) {
    for (const name of item.names) {
      const lowerName = name.toLowerCase();
      const email = MAPPING[lowerName];
      if (!email) {
        console.warn(`Unknown person: ${name}`);
        continue;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.warn(`User not found in DB: ${email}`);
        continue;
      }

      const shiftInfo = SHIFT_TIMES[item.shift];
      if (!shiftInfo) {
        console.warn(`Unknown shift: ${item.shift}`);
        continue;
      }

      // Dates are in local timeline, typically server uses local timezone if new Date(y, m, d, h)
      // We will create Date objects exactly like that.
      const start = new Date(2026, 3, item.date, shiftInfo.startH, 0, 0); // 3 = April
      const end = new Date(2026, 3, item.date, shiftInfo.endH, 0, 0);

      const exists = await prisma.workShift.findFirst({
        where: {
          userId: user.id,
          start,
          end,
        }
      });

      let shiftTypeStr = item.shift;
      if (item.shift === "Hân 8h-16h") shiftTypeStr = undefined as any;

      if (!exists) {
        await prisma.workShift.create({
          data: {
            userId: user.id,
            start,
            end,
            shiftType: shiftTypeStr,
            status: "APPROVED"
          }
        });
        console.log(`+ Added: ${name} -> ${item.shift} on 2026-04-${item.date}`);
        added++;
      } else {
        console.log(`= Duplicate skipped: ${name} on ${item.shift}`);
      }
    }
  }

  console.log(`Finished inserting ${added} shifts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
