import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadDocument } from "@/app/admin/help/actions";
import { getServerSession } from "next-auth";
import mammoth from "mammoth";
import { prisma } from "@/lib/prisma";

// Mock NextAuth/getServerSession
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock mammoth
vi.mock("mammoth", () => ({
  default: {
    convertToHtml: vi.fn(),
    extractRawText: vi.fn(),
  },
}));

// Khai báo hoisted variables và mock class để Vitest hoist lên hàng đầu
const { mockEmbedContent, mockGenerateContent, mockGetGenerativeModel, MockGoogleGenerativeAI } = vi.hoisted(() => {
  const embedContent = vi.fn().mockResolvedValue({
    embedding: { values: [0.1, 0.2, 0.3] }
  });
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => "Formatted Markdown text"
    }
  });
  const getGenerativeModel = vi.fn().mockImplementation(() => {
    return {
      embedContent,
      generateContent,
    };
  });

  class GoogleGenerativeAI {
    constructor(apiKey: string) {}
    getGenerativeModel(config: any) {
      return getGenerativeModel(config);
    }
  }

  return {
    mockEmbedContent: embedContent,
    mockGenerateContent: generateContent,
    mockGetGenerativeModel: getGenerativeModel,
    MockGoogleGenerativeAI: GoogleGenerativeAI,
  };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
  };
});

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
  },
}));

describe("uploadDocument()", () => {
  let envBackup: typeof process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    envBackup = { ...process.env };
    process.env.GEMINI_API_KEY = "test-api-key";

    // Setup mặc định cho mocks
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "Formatted Markdown text"
      }
    });
    mockEmbedContent.mockResolvedValue({
      embedding: { values: [0.1, 0.2, 0.3] }
    });
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("returns success: false if unauthorized (no session)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const formData = new FormData();
    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns success: false if not an ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "USER" },
    } as any);
    const formData = new FormData();
    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns success: false if file or title is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "ADMIN" },
    } as any);
    const formData = new FormData();
    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: false, error: "Thiếu file hoặc tiêu đề" });
  });

  it("returns success: false for unsupported file extensions", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "ADMIN" },
    } as any);
    const formData = new FormData();
    const dummyFile = new File(["content"], "test.pdf", { type: "application/pdf" });
    formData.append("file", dummyFile);
    formData.append("title", "Test Title");

    const result = await uploadDocument(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Chỉ hỗ trợ file .docx hoặc .txt");
  });

  it("successfully parses txt file and saves to DB", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "ADMIN" },
    } as any);
    
    const formData = new FormData();
    const dummyFile = new File(["hello world"], "test.txt", { type: "text/plain" });
    formData.append("file", dummyFile);
    formData.append("title", "Test Title");

    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-123" } as any);

    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: true });
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        path: expect.stringContaining("uploads/"),
        title: "Test Title",
        content: "hello world",
      },
    });
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it("successfully parses docx, structures via Gemini and saves to DB", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "ADMIN" },
    } as any);

    const formData = new FormData();
    const dummyFile = new File(["dummy docx content"], "test.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    formData.append("file", dummyFile);
    formData.append("title", "Test Title");

    vi.mocked(mammoth.convertToHtml).mockResolvedValue({ value: "<table><tr><td>cell</td></tr></table>" } as any);
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-456" } as any);

    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: true });
    expect(mammoth.convertToHtml).toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        path: expect.stringContaining("uploads/"),
        title: "Test Title",
        content: "Formatted Markdown text",
      },
    });
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it("falls back to extractRawText on Gemini error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "ADMIN" },
    } as any);

    const formData = new FormData();
    const dummyFile = new File(["dummy docx content"], "test.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    formData.append("file", dummyFile);
    formData.append("title", "Test Title");

    vi.mocked(mammoth.convertToHtml).mockResolvedValue({ value: "<table><tr><td>cell</td></tr></table>" } as any);
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: "Fallback raw text content" } as any);
    vi.mocked(prisma.document.create).mockResolvedValue({ id: "doc-789" } as any);

    // Force mockGenerateContent to reject (simulate Gemini API error)
    mockGenerateContent.mockRejectedValueOnce(new Error("API Overloaded"));

    const result = await uploadDocument(formData);
    expect(result).toEqual({ success: true });
    expect(mammoth.extractRawText).toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        path: expect.stringContaining("uploads/"),
        title: "Test Title",
        content: "Fallback raw text content",
      },
    });
  });
});
