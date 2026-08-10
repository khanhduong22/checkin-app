const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

const markdownContent = `# Bảng hạn mức tự giải quyết khiếu nại

| Tình huống khiếu nại | < 39k VND | 40k - 100k VND | 101k - 200k VND | > 200k VND |
| :--- | :--- | :--- | :--- | :--- |
| **Giao thiếu sản phẩm / Quà tặng** | - Chuyển khoản hoàn tiền sp thiếu.<br>- Nếu khách không chịu -> Lên đơn gửi bù sp thiếu (Phụ kiện kèm theo như khoen cửa sổ, móc bảng, đinh vít khung,... thì phải lên đơn gửi bù ngay). | - Lên đơn gửi bù sản phẩm thiếu cho khách. | - Lên đơn gửi bù sản phẩm thiếu cho khách. | - Lên đơn gửi bù sản phẩm thiếu cho khách. |
| **Hàng móp méo / Hỏng hóc** | - Chuyển khoản hoàn tiền sp bị bể vỡ.<br>- Nếu khách không chịu -> Lên đơn gửi bù sp bị hư. | - **Bể nhẹ (có thể sử dụng tiếp được)**: Đưa ra phương án chuyển khoản (CK) 50% tiền sp. Nếu khách không đồng ý -> Gửi sp mới cho khách.<br>- **Bể nặng (không thể sử dụng được)**: Lên đơn gửi sản phẩm mới cho khách. | - **Bể nhẹ (có thể sử dụng tiếp được)**: Đưa ra phương án chuyển khoản (CK) 1 phần tiền sp tùy thuộc độ bể vỡ (Hỏi ý kiến quản lý). Nếu khách không đồng ý -> Hướng dẫn khách bấm trả hàng hoàn tiền trên sàn.<br>- **Bể nặng (không thể sử dụng được)**: Hướng dẫn khách bấm trả hàng hoàn tiền luôn. | - **Bể nhẹ (có thể sử dụng tiếp được)**: Đưa ra phương án chuyển khoản (CK) 1 phần tiền sp tùy thuộc độ bể vỡ (Hỏi ý kiến quản lý). Nếu khách không đồng ý -> Hướng dẫn khách bấm trả hàng hoàn tiền.<br>- **Bể nặng (không thể sử dụng được)**: Hướng dẫn khách bấm trả hàng hoàn tiền luôn. |
| **Giao sai mẫu / Kích thước / Màu sắc** | - Chuyển khoản hoàn tiền sp sai + nói khách giữ lại dùng.<br>- Nếu khách không chịu -> Lên đơn gửi lại đúng sản phẩm. | - Lên đơn đổi trả cho khách. | - Lên đơn đổi trả cho khách. | - **Sản phẩm nhỏ**: Lên đơn đổi trả cho khách luôn.<br>- **Sản phẩm lớn**: Thương lượng khách giữ lại sản phẩm và bù thêm tiền (Hỏi ý kiến quản lý). |
| **Khách đặt sai mẫu/ kích thước muốn đổi lại** | - Báo khách phí ship 1 chiều đi, chiều về shop chịu. | - Báo khách phí ship 1 chiều đi, chiều về shop chịu. | - Báo khách phí ship 1 chiều đi, chiều về shop chịu. | - Báo khách phí ship 1 chiều đi, chiều về shop chịu. |
`;

async function main() {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!geminiApiKey) {
    console.error("Lỗi: GEMINI_API_KEY chưa được cấu hình.");
    process.exit(1);
  }

  console.log("Đang kết nối database...");
  
  // Tìm tài liệu theo path
  const targetPath = "uploads/1786354927058-Bảng hạn mức tự giải quyết khiếu nại.docx";
  let document = await prisma.document.findUnique({
    where: { path: targetPath }
  });

  if (!document) {
    console.log("Không tìm thấy tài liệu bằng path cũ. Tìm theo tiêu đề...");
    const docs = await prisma.document.findMany({
      where: {
        title: {
          contains: "Khiếu nại",
          mode: "insensitive"
        }
      }
    });
    if (docs.length > 0) {
      document = docs[0];
      console.log(`Tìm thấy tài liệu: ID=${document.id}, Title="${document.title}", Path="${document.path}"`);
    } else {
      console.error("Không tìm thấy tài liệu Bảng hạn mức khiếu nại trong DB.");
      process.exit(1);
    }
  } else {
    console.log(`Tìm thấy tài liệu: ID=${document.id}, Path="${document.path}"`);
  }

  // 1. Cập nhật nội dung tài liệu thành Markdown Table
  console.log("Cập nhật nội dung tài liệu...");
  await prisma.document.update({
    where: { id: document.id },
    data: {
      title: "Bảng hạn mức tự giải quyết khiếu nại",
      content: markdownContent
    }
  });

  // 2. Xóa các chunks cũ của tài liệu này
  console.log("Xóa các chunks cũ...");
  await prisma.documentChunk.deleteMany({
    where: { documentId: document.id }
  });

  // 3. Vì bảng Markdown này không quá dài (khoảng 2000 ký tự), chúng ta giữ nguyên bảng trong 1 chunk
  // để tránh việc bảng bị cắt đôi làm mất liên kết cột/dòng khi AI truy vấn RAG.
  const chunks = [markdownContent];

  // 4. Tạo embeddings và lưu chunks mới
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  for (const chunkContent of chunks) {
    console.log("Đang tạo embedding...");
    const result = await model.embedContent(chunkContent);
    const embedding = result.embedding.values;
    const vectorString = `[${embedding.join(",")}]`;

    console.log("Lưu chunk vào Database...");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding", "createdAt") 
       VALUES (gen_random_uuid()::text, $1, $2, $3::vector, NOW())`,
      document.id,
      chunkContent,
      vectorString
    );
  }

  console.log("Cập nhật dữ liệu thành công!");
}

main()
  .catch(e => {
    console.error("Lỗi khi chạy script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
