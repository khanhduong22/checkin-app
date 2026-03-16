import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
    const docs = await prisma.$queryRaw`
    SELECT d.id, d.title, d.path, COUNT(c.id)::int as chunks 
    FROM "Document" d 
    LEFT JOIN "DocumentChunk" c ON c."documentId" = d.id 
    GROUP BY d.id, d.title, d.path
  `;
    console.log("Documents in DB:");
    for (const doc of docs as any[]) {
        console.log(`  - [${doc.chunks} chunks] "${doc.title}" (${doc.path})`);
    }
    await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
