/**
 * Script: seed-late-penalty-doc.ts
 * Mục đích: Seed tài liệu quy tắc phạt đi trễ vào database cho AI RAG
 * Chạy: npx tsx scripts/seed-late-penalty-doc.ts
 *
 * Dùng Prisma $queryRaw/$executeRaw (không cần generated model types)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Import Prisma with require to avoid TS type issues at runtime
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DOC_PATH = "quy-tac/phat-di-tre";
const DOC_TITLE = "Quy tắc phạt đi trễ (Late Penalty)";
const DOC_CONTENT = `# Quy tắc phạt đi trễ (Late Penalty)

## Áp dụng cho
Quy tắc phạt đi trễ chỉ áp dụng cho nhân viên Full-time (toàn thời gian). Nhân viên Part-time không bị áp dụng quy tắc này.

## Định nghĩa đi trễ
Nhân viên bị coi là đi trễ nếu check-in sau giờ bắt đầu ca làm việc (có thêm một khoảng buffer). Ca bắt đầu lúc 8:30, nếu check-in trễ hơn thì bị tính là đi trễ trong ngày đó.

## Quy tắc phạt theo số lần đi trễ trong tháng
- Đi trễ 1 lần, 2 lần, hoặc 3 lần trong tháng: không bị phạt, không bị trừ tiền.
- Đi trễ 4 lần: bị trừ 1 giờ lương.
- Đi trễ 5 lần: bị trừ 2 giờ lương.
- Đi trễ 6 lần: bị trừ 3 giờ lương.
- Đi trễ n lần (n >= 4): bị trừ (n - 3) giờ lương.

Công thức: số giờ bị trừ = số lần đi trễ - 3 (chỉ áp dụng khi số lần >= 4).

## Cách tính số tiền bị trừ
Số tiền bị trừ = Số giờ bị phạt × Hourly Rate.
Hourly Rate được tính động dựa trên lương tháng và số ngày làm việc thực tế.

## Ví dụ
- Đi trễ 3 lần: không bị trừ.
- Đi trễ 4 lần: trừ 1 giờ lương.
- Đi trễ 6 lần: trừ 3 giờ lương.
- Đi trễ 10 lần: trừ 7 giờ lương.

## Theo tháng
Số lần đi trễ được đếm trong phạm vi 1 tháng và reset vào đầu tháng mới.

## Xem thông tin
Nhân viên xem số lần đi trễ và số tiền bị trừ trong phần chi tiết bảng lương hàng tháng (lateCount, latePenaltyHours, latePenaltyAmount).
`;

async function generateEmbedding(text: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return `[${result.embedding.values.join(",")}]`;
}

function chunkText(text: string, maxSize = 800): string[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = "";
    for (const para of paragraphs) {
        if ((current + "\n\n" + para).length > maxSize && current) {
            chunks.push(current.trim());
            current = para;
        } else {
            current = current ? current + "\n\n" + para : para;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

async function main() {
    console.log("🚀 Seed tài liệu AI...\n");

    // Upsert Document
    const existing = await prisma.$queryRaw`
    SELECT id FROM "Document" WHERE path = ${DOC_PATH}
  `;

    let docId: string;
    if (existing.length > 0) {
        docId = existing[0].id;
        await prisma.$executeRaw`
      UPDATE "Document" SET title = ${DOC_TITLE}, content = ${DOC_CONTENT}, "updatedAt" = NOW()
      WHERE id = ${docId}
    `;
        console.log(`📝 Đã cập nhật document: ${docId}`);
    } else {
        const created = await prisma.$queryRaw`
      INSERT INTO "Document" (id, path, title, content, "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${DOC_PATH}, ${DOC_TITLE}, ${DOC_CONTENT}, NOW(), NOW())
      RETURNING id
    `;
        docId = created[0].id;
        console.log(`✨ Đã tạo document mới: ${docId}`);
    }

    // Delete old chunks
    await prisma.$executeRaw`DELETE FROM "DocumentChunk" WHERE "documentId" = ${docId}`;

    // Create chunks with embeddings
    const chunks = chunkText(DOC_CONTENT);
    console.log(`\n📦 Tạo ${chunks.length} chunk(s) với embedding...\n`);

    for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i];
        const embedding = await generateEmbedding(content);
        await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "createdAt")
      VALUES (gen_random_uuid()::text, ${docId}, ${content}, ${embedding}::vector, NOW())
    `;
        console.log(`✅ Chunk ${i + 1}/${chunks.length} hoàn thành`);
    }

    console.log(`\n🎉 Xong! AI assistant đã sẵn sàng trả lời về quy tắc phạt đi trễ.`);
    await prisma.$disconnect();
}

main().catch(async (err) => {
    console.error("❌ Lỗi:", err.message || err);
    await prisma.$disconnect();
    process.exit(1);
});
