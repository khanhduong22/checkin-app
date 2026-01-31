
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const TARGET_YEAR = 2026; // Default year
const TARGET_MONTH = 0;   // January (0-indexed). Adjust if data crosses months. 
// BUT data has "1/1", "2/1", etc. It implies Day/Month.
// We will parse the Month from the string "1/1" -> Day 1, Month 1.

// !!! SET TARGET EMAIL HERE !!!
const TARGET_EMAIL = process.argv[2];

const RAW_DATA = `
1/1	7h55 - 14h30 	6,58	111860	x3 tết	
2/1	19h - 21h20 	2,33	39610	làm sản phẩm lim art	
3/1	13h - 17h 	4	68000		
4/1	12h - 16h 	4	68000		
5/1	8h10 - 15h	6,83	116110		
6/1			0		
7/1	12h - 17h 	7,34	124780	17h30 - 18h40 làm sản phẩm , 1h15 - 2h25 edit video + đăng sản phẩm lim art	
8/1	9h - 15h20 	7,58	128860	16h chỉnh sản phẩm thêm vd của 3 sản phẩm lim art 	
9/1			0		
10/1	8h - 12h	5,95	101150	00h25 - 2h22 làm sản phẩm giấy , đăng 3 bài fb lim art	
11/1	10h - 15h	5	85000		
12/1			0		
13/1	12h - 17h	7,17	121890	00h45 - 2h55 làm ảnh sản phẩm 	
14/1	12h - 17h 	5	85000		
15/1	8h - 12h	4	68000		
16/1	12h15 - 16h15 	4,67	79390	17h20 - 18h làm sp 	
17/1			0		
18/1	12h - 17h30	8,5	144500	20h15 - 23h15 làm sp diy + art	
19/1	12h - 17h	5	85000		
20/1	8h - 12h 		0		
21/1			0		
22/1	12h - 17h20	8,42	143140	22h15 - 1h20 làm sp diy lim art 	
23/1			0		
24/1	12h - 15h15 	7,08	120360	7h - 10h50 làm sản phẩm diy + art	
25/1	9h45 - 14h10 	4,42	75140		
26/1			0		
27/1	8h - 13h30	5,5	93500		
28/1	12h - 17h20		0		
29/1			0		
30/1	8h - 13h50	5,83	99110		
31/1	12h - 17h 		0		
`;

async function main() {
  if (!TARGET_EMAIL) {
    console.error("Please provide an email argument: npx ts-node scripts/import_raw_personal.ts <email>");
    process.exit(1);
  }

  // Find or Create User
  const user = await prisma.user.upsert({
    where: { email: TARGET_EMAIL },
    update: {},
    create: {
      email: TARGET_EMAIL,
      name: TARGET_EMAIL.split('@')[0], // e.g. "mthu"
      role: 'USER',
      employmentType: 'PART_TIME'
    }
  });
  console.log(`Target User: ${user.name} (${user.email})`);

  const lines = RAW_DATA.trim().split('\n');
  let count = 0;

  for (const line of lines) {
    const parts = line.split('\t').map(s => s.trim());
    if (parts.length < 2) continue;

    // Part 0: Date "1/1"
    const dateStr = parts[0];
    const [day, month] = dateStr.split('/').map(Number);

    // Part 1: Time range "7h55 - 14h30" OR empty
    const timeStr = parts[1];
    if (!timeStr) continue;

    // Parse Time Range
    // Regex for HhMM - HhMM
    // Supports "7h55", "19h", "21h20"
    const timeRegex = /(\d{1,2})h(\d{0,2})\s*-\s*(\d{1,2})h(\d{0,2})/;
    const match = timeStr.match(timeRegex);

    if (match) {
      const startH = parseInt(match[1]);
      const startM = match[2] ? parseInt(match[2]) : 0;
      const endH = parseInt(match[3]);
      const endM = match[4] ? parseInt(match[4]) : 0;

      const startTime = new Date(TARGET_YEAR, month - 1, day, startH, startM);
      const endTime = new Date(TARGET_YEAR, month - 1, day, endH, endM);
      // Handle cross-day if needed (e.g. 23h - 1h)
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // Note column (Part 4 usually)
      const note = parts[4] || parts[3] || '';
      // In the data, cols: Date | Time | Hours | Money | Note
      // "6,58" is duration. "111860" is money.

      console.log(`Importing: ${day}/${month} | ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()} | Note: ${note}`);

      // Create CheckIn pair (In and Out) to act as history
      await prisma.checkIn.create({
        data: {
          userId: user.id,
          type: 'checkin',
          timestamp: startTime,
          ipAddress: 'IMPORTED_RAW',
          note: `Imported Raw: ${timeStr}`
        }
      });

      await prisma.checkIn.create({
        data: {
          userId: user.id,
          type: 'checkout',
          timestamp: endTime,
          ipAddress: 'IMPORTED_RAW',
          note: note ? `Note: ${note}` : undefined
        }
      });
      count++;
    }
  }
  console.log(`Done! Imported ${count} shifts for ${TARGET_EMAIL}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
