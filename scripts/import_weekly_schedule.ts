
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// MAPPING: Name -> Email
// Keys should be lowercase for easier matching.
const MAPPING: { [key: string]: string } = {
  // Confirmed by User
  "nía": "minhthuu309@gmail.com",
  "thư": "cuccung123456789@gmail.com",
  "ngân": "baomy18052007@gmail.com",

  // Inferred (Standard naming)
  "thu": "quynhthu9718@gmail.com",
  "trang": "thutrang090726@gmail.com",
  "hương": "thuhuong10072007@gmail.com",
  "phượng": "kimphuong050606@gmail.com",
  "chị na": "maithina4040@gmail.com",
  "na": "maithina4040@gmail.com",
};

// SHIFT DEFINITIONS (Columns 3 to 7)
const SHIFTS = [
  { name: 'Ca Sáng', startH: 8, startM: 0, endH: 12, endM: 0 },   // Col 2 (0-index)
  { name: 'Ca Giữa 1', startH: 9, startM: 0, endH: 13, endM: 0 }, // Col 3
  { name: 'Ca Giữa 2', startH: 10, startM: 0, endH: 14, endM: 0 },// Col 4
  { name: 'Ca Giữa 3', startH: 11, startM: 0, endH: 16, endM: 0 },// Col 5
  { name: 'Ca Chiều', startH: 12, startM: 0, endH: 17, endM: 0 }, // Col 6
];

const RAW_DATA = `
Thứ 2 SALE	02/02/2026	Nía	phượng			Thư	
		ngân	"			
Thứ 3	03/02/2026	Thư		phượng	ngân	Ngân 12h30
		Trang				hương 	
Thứ 4	04/02/2026	Thư 		Nía			
							
Thứ 5	05/02/2026	Thư		Nía		Hương	
		Phượng				Trang	
Thứ 6	06/02/2026	Thư			Hương		
						Ngân	chị Na nghỉ ca chiều 
Thứ 7	07/02/2026	Thu, Ngân 		Phượng	Hương		chị Na nghỉ 
		Nía				Trang	
Chủ nhật	08/02/2026	Thu, Thư			Ngân 		
		Trang			Nía		
`;

async function main() {
  console.log("Parsing schedule...");

  const lines = RAW_DATA.trim().split('\n');
  let currentDate: Date | null = null;
  let shiftsToAdd: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    let parts = line.split('\t');
    if (parts.length < 2 && line.includes('   ')) {
      parts = line.split(/   +/); // Split by 3+ spaces
    }

    // Detect Date
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2,4})/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/').map(Number);
      currentDate = new Date(y, m - 1, d);
    }

    if (!currentDate) continue;

    const dateIndex = parts.findIndex(p => /\d{2}\/\d{2}/.test(p));
    const startIndex = (dateIndex !== -1) ? dateIndex + 1 : 2;

    // Iterate shifts
    for (let s = 0; s < 5; s++) {
      const colIdx = startIndex + s;
      if (colIdx >= parts.length) break;

      const rawCell = parts[colIdx].trim();
      if (!rawCell) continue;

      // Handle "Nía", "ngân", "Thu, Ngân"
      const names = rawCell.split(/[,+]/).map(n => n.trim()).filter(n => n);

      for (const rawName of names) {
        if (rawName === '"') continue;

        // Check for time override "Ngân 12h30"
        const timeMatch = rawName.match(/(\d{1,2})h(\d{2})?/);

        let cleanName = rawName.replace(/\d{1,2}h(\d{2})?/, '').trim();
        let email = MAPPING[cleanName.toLowerCase()];

        if (!email) {
          console.warn(`⚠️ Unknown name: "${cleanName}" in line: "${line}"`);
          continue;
        }

        // Default Times
        let start = new Date(currentDate);
        start.setHours(SHIFTS[s].startH, SHIFTS[s].startM);

        let end = new Date(currentDate);
        end.setHours(SHIFTS[s].endH, SHIFTS[s].endM);

        // Override?
        if (timeMatch) {
          const h = parseInt(timeMatch[1]);
          const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          start.setHours(h, m);
          // If start time is pushed late (e.g. 12h30 instead of 12h), 
          // should we end later? Or keep fixed end (17h)?
          // "Ca Chiều (12h-17h)" -> "Ngân 12h30".
          // Implies 12:30 -> 17:00.
          // Keep 'end' as is.
        }

        shiftsToAdd.push({
          email,
          start,
          end,
          type: SHIFTS[s].name,
          rawName: cleanName
        });
      }
    }
  }

  console.log(`Found ${shiftsToAdd.length} shifts to import.`);

  // Process
  for (const item of shiftsToAdd) {
    const user = await prisma.user.findUnique({ where: { email: item.email } });
    if (!user) {
      console.error(`User not found in DB: ${item.email} (${item.rawName})`);
      continue;
    }

    // Check duplicate?
    const exists = await prisma.workShift.count({
      where: {
        userId: user.id,
        start: item.start,
        end: item.end
      }
    });

    if (exists === 0) {
      await prisma.workShift.create({
        data: {
          userId: user.id,
          start: item.start,
          end: item.end,
          status: 'APPROVED'
        }
      });
      console.log(`+ Added: ${item.rawName} | ${item.start.toLocaleString()} - ${item.end.toLocaleTimeString()}`);
    } else {
      console.log(`= Skipped (Exists): ${item.rawName} | ${item.start.toLocaleTimeString()}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
