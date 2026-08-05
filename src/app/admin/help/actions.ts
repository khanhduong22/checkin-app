"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

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

export async function getDocuments() {
  try {
    const docs = await prisma.document.findMany({
      select: { id: true, title: true, path: true, content: true },
      orderBy: { title: 'asc' }
    });
    return docs;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function deleteDocument(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.document.delete({
      where: { id }
    });

    revalidatePath('/admin/help');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message || "Lỗi xóa tài liệu" };
  }
}

export async function uploadDocument(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const title = formData.get("title") as string;

    if (!file || !title) {
      return { success: false, error: "Thiếu file hoặc tiêu đề" };
    }

    const fileName = file.name;
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    let content = "";
    if (fileExtension === ".txt") {
      content = await file.text();
    } else if (fileExtension === ".docx") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else {
      return { success: false, error: "Chỉ hỗ trợ file .docx hoặc .txt" };
    }

    if (!content.trim()) {
      return { success: false, error: "Tài liệu không chứa nội dung văn bản hợp lệ" };
    }

    // Generate unique path
    const relativePath = `uploads/${Date.now()}-${fileName}`;

    // Create Document in Database
    const document = await prisma.document.create({
      data: {
        path: relativePath,
        title,
        content
      }
    });

    // Chunk text
    const chunks = chunkText(content);

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
      return { success: false, error: "Gemini API key is not configured" };
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    // Generate embeddings and save chunks
    for (const chunkContent of chunks) {
      const result = await model.embedContent(chunkContent);
      const embedding = result.embedding.values;
      const vectorString = `[${embedding.join(",")}]`;

      // Use raw SQL to insert pgvector
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt") 
         VALUES (gen_random_uuid()::text, $1, $2, $3::vector, NOW())`,
        document.id,
        chunkContent,
        vectorString
      );
    }

    revalidatePath('/admin/help');
    return { success: true };
  } catch (e: any) {
    console.error("Lỗi upload: ", e);
    return { success: false, error: e.message || "Lỗi xử lý file" };
  }
}
