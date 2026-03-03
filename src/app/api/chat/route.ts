import { PrismaClient } from "@prisma/client";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Extract the latest user question
    const latestMessage = messages[messages.length - 1];
    const userQuery = latestMessage.content;

    // 1. Generate Embedding for the user's query
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(userQuery);
    const queryEmbedding = result.embedding.values;
    const queryVector = `[${queryEmbedding.join(",")}]`;

    // 2. Vector Search (Cosine Similarity) in PostgreSQL using pgvector
    // Limit to top 5 most relevant chunks
    const similarChunks: { content: string; path: string; title: string, distance: number }[] = await prisma.$queryRawUnsafe(
      `
      SELECT 
        c.content, 
        d.path, 
        d.title,
        c.embedding <=> $1::vector AS distance
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      ORDER BY distance ASC
      LIMIT 10;
      `,
      queryVector
    );

    // 3. Construct System Context
    let contextText = "Đây là thông tin trích xuất từ tài liệu cấu hình của phần mềm Checkin App:\n\n";
    similarChunks.forEach((chunk, index) => {
      // Only include reasonably close contexts (distance < 0.8 roughly depending on model)
      contextText += `--- TÀI LIỆU ${index + 1}: ${chunk.title} (${chunk.path}) ---\n`;
      contextText += `${chunk.content}\n\n`;
    });

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

    // 4. Send to LLM
    const geminiParams = {
      model: google("gemini-2.5-flash"),
      messages,
      system: systemPrompt,
    };

    const response = await streamText(geminiParams);

    return response.toTextStreamResponse();

  } catch (error) {
    console.error("[CHAT_API_ERROR]", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
