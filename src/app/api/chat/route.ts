/**
 * @file route.ts
 * @description Chat API endpoint with RAG (Retrieval-Augmented Generation).
 * Embeds the user query via Gemini, performs pgvector cosine similarity search
 * on DocumentChunk table, then streams a grounded LLM response.
 */

import { prisma } from "@/lib/prisma";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type SimilarChunk = {
  content: string;
  path: string;
  title: string;
  distance: number;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const userQuery = messages[messages.length - 1].content as string;

    // 1. Generate embedding for the user's query
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embeddingResult = await embeddingModel.embedContent(userQuery);
    const queryVector = `[${embeddingResult.embedding.values.join(",")}]`;

    // 2. pgvector cosine similarity search (raw SQL required for <=> operator)
    const similarChunks = await prisma.$queryRaw<SimilarChunk[]>`
      SELECT
        c.content,
        d.path,
        d.title,
        c.embedding <=> ${queryVector}::vector AS distance
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      ORDER BY distance ASC
      LIMIT 10
    `;

    // 3. Build RAG context from top relevant chunks
    const contextText = similarChunks.reduce((acc, chunk, index) => {
      return acc + `--- TÀI LIỆU ${index + 1}: ${chunk.title} (${chunk.path}) ---\n${chunk.content}\n\n`;
    }, "Đây là thông tin trích xuất từ tài liệu cấu hình của phần mềm Checkin App:\n\n");

    const systemPrompt = `Bạn là một trợ lý AI nội bộ cho phần mềm "Checkin App" của công ty LimArt. 
    Lợi thế của bạn là bạn biết rõ mọi tài liệu hướng dẫn kỹ thuật và cách sử dụng của hệ thống.
    
    NGUYÊN TẮC:
    1. Chỉ trả lời dựa vào Thông tin Ngữ cảnh (Context) bên dưới.
    2. Nếu thông tin không có trong Context, hãy nói rõ là "Tôi không tìm thấy thông tin này trong tài liệu hướng dẫn". KHÔNG ĐƯỢC bịa đặt.
    3. Hướng dẫn chi tiết, rõ ràng, gạch đầu dòng nếu cần thiết. 
    4. Cung cấp tên file tài liệu mà bạn tham khảo để người dùng có thể tự đọc thêm nếu phù hợp.
    5. Luôn trả lời bằng tiếng Việt.
    
    -----------
    NGỮ CẢNH TÀI LIỆU DỰA TRÊN CÂU HỎI:
    ${contextText}
    -----------
    `;

    // 4. Stream LLM response
    const response = await streamText({
      model: google("gemini-2.5-flash"),
      messages,
      system: systemPrompt,
    });

    return response.toTextStreamResponse();
  } catch (error) {
    console.error("[CHAT_API_ERROR]", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
