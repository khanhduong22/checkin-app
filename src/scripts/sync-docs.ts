import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const MANUALS_DIR = path.join(process.cwd(), "docs", "060-Manuals");

// Basic text chunker
function chunkText(text: string, maxTokens: number = 800): string[] {
  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // Rough estimate: 1 word ~ 1.3 tokens
    const estimatedTokens = (currentChunk.length + paragraph.length) / 4;

    if (estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph + "\n\n";
    } else {
      currentChunk += paragraph + "\n\n";
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Recursively get all markdown files
function getMarkdownFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMarkdownFiles(filePath, fileList);
    } else if (file.endsWith(".md")) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function main() {
  console.log("Starting Document Sync for RAG...");

  if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in .env");
    process.exit(1);
  }

  const files = getMarkdownFiles(MANUALS_DIR);
  console.log(`Found ${files.length} markdown files in ${MANUALS_DIR}`);

  for (const filePath of files) {
    const relativePath = path.relative(MANUALS_DIR, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const title = path.basename(filePath, ".md").replace(/-/g, " ");

    console.log(`Processing: ${relativePath}`);

    // Upsert Document
    const document = await prisma.document.upsert({
      where: { path: relativePath },
      create: { path: relativePath, title, content },
      update: { title, content },
    });

    // Delete existing chunks to recreate them
    await prisma.documentChunk.deleteMany({
      where: { documentId: document.id },
    });

    const chunks = chunkText(content);
    console.log(`  Split into ${chunks.length} chunks. Generating embeddings...`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];

      const result = await model.embedContent(chunkContent);
      const embedding = result.embedding.values;

      // Ensure embedding is formatted as pgvector string: '[0.1, 0.2, ...]'
      const vectorString = `[${embedding.join(",")}]`;

      // We use raw SQL to insert the vector properly
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt") 
             VALUES (gen_random_uuid()::text, $1, $2, $3::vector, NOW())`,
        document.id, chunkContent, vectorString
      );
    }

    console.log(`  Saved ${chunks.length} chunks to DB.`);
  }

  console.log("Sync complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
