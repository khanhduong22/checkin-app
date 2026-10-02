import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Send, FileText, Sparkles, BookOpen, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "Xin chào Quản lý! Em là Capy AI - Trợ lý vận hành nội bộ LimArt 🍊. Em có thể hỗ trợ giải đáp về quy chế tính công, bảng lương, duyệt nghỉ phép hay vận hành hệ thống. Anh/chị cần em hỗ trợ gì ạ?",
  },
];

const PRESET_QUESTIONS = [
  "Quy định phạt đi muộn như thế nào?",
  "Điều kiện nhận thưởng chuyên cần 200k?",
  "Cách cấp quyền quay Vòng Quay May Mắn?",
  "Quy trình duyệt WFH và đóng gói hàng?",
];

const KNOWLEDGE_DOCS = [
  {
    id: "doc-1",
    title: "Quy chế Chấm công & Kỷ luật Vận hành LimArt 2026",
    category: "CHÍNH SÁCH",
    date: "15/01/2026",
    summary:
      "Quy định chấm công qua WiFi nội bộ, thời gian ân hạn 1 phút, phạt luỹ tiến số lần đi trễ và trừ giờ công.",
  },
  {
    id: "doc-2",
    title: "Cơ chế Thưởng Doanh số, OT & Điểm Đóng Gói",
    category: "TIỀN LƯƠNG",
    date: "01/02/2026",
    summary:
      "Top 1 giờ làm (≥130h) thưởng 200k. Đóng gói hàng bự >50đ thưởng 200k. Bưng hàng lên lầu ≥10đ có thưởng nóng.",
  },
  {
    id: "doc-3",
    title: "Hướng dẫn Quản trị viên: Quản lý IP, Khóa Sổ Lương & Backup",
    category: "HỆ THỐNG",
    date: "20/02/2026",
    summary:
      "Các bước thêm prefix IP văn phòng, cấu hình hệ số ngày Lễ x2/x3 và xuất backup toàn bộ dữ liệu Excel.",
  },
];

export function HelpPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(KNOWLEDGE_DOCS[0]);

  const handleSend = (text?: string) => {
    const query = (text || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!text) setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = "";
      if (query.includes("muộn") || query.includes("trễ")) {
        botResponse =
          "📌 **Quy định đi muộn:**\n- Có thời gian ân hạn **1 phút** so với giờ ca trực.\n- Mỗi lần muộn sẽ được ghi nhận vào Bảng Vi Phạm.\n- Phạt luỹ tiến theo công thức hệ thống: Muộn 1-3 lần nhắc nhở, từ lần 4 trở đi trừ theo giờ công quy đổi và cảnh báo đỏ nếu trên 5 lần.";
      } else if (query.includes("thưởng") || query.includes("200k") || query.includes("chuyên cần")) {
        botResponse =
          "🏆 **Điều kiện nhận thưởng:**\n- **Top 1 Chăm chỉ (Giờ làm):** Đạt tối thiểu **130 giờ công** trong tháng nhận thưởng ngay **+200.000 ₫**.\n- **Vua Đóng Hàng:** Đạt điểm tích luỹ >50đ nhận **+200.000 ₫**, Top 1 đạt chuẩn nhận **+100.000 ₫** cộng vào bảng lương.";
      } else if (query.includes("quay") || query.includes("Vòng Quay")) {
        botResponse =
          "🎰 **Vòng Quay May Mắn:**\n- Admin có thể cấp quyền trong tab **Nhân sự** (bật switch Vòng quay) hoặc trong tab **Vòng quay** > **Cấp quyền quay**.\n- Điều kiện quay: Nhân viên phải check-in thành công hôm nay và chưa quay trong ngày (mỗi ngày 1 lượt).";
      } else {
        botResponse = `Cảm ơn câu hỏi của bạn về "${query}". Hệ thống ghi nhận yêu cầu và đối chiếu với cẩm nang vận hành LimArt. Bạn cũng có thể xem chi tiết trong tab "Kho tài liệu nội bộ" bên cạnh!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "assistant",
          content: botResponse,
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center p-2 shadow-sm">
          <img
            src="/icons/capy_ai.png"
            alt="Capy AI"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/icons/capy_dashboard.png";
            }}
          />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Trợ lý Capy AI & Cẩm Nang Nội Bộ
          </h2>
          <p className="text-sm text-muted-foreground">
            Giải đáp thắc mắc chính sách, hỗ trợ tra cứu quy chuẩn công và hướng dẫn sử dụng phần mềm
          </p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-white border p-1 rounded-xl">
          <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-900 font-semibold">
            <Bot className="w-4 h-4 mr-2" /> Trò chuyện cùng Capy AI
          </TabsTrigger>
          <TabsTrigger value="docs" className="rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-900 font-semibold">
            <BookOpen className="w-4 h-4 mr-2" /> Kho tài liệu & Quy chế
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Chat */}
        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card className="border shadow-sm flex flex-col h-[560px]">
                {/* Chat feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
                          <Bot className="w-4 h-4 text-orange-700" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-orange-600 text-white font-medium rounded-br-none"
                            : "bg-gray-100 text-slate-800 rounded-bl-none whitespace-pre-line"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 items-center text-xs text-muted-foreground italic pl-11">
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-orange-500" /> Capy AI đang soạn câu trả lời...
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="p-3 border-t bg-gray-50/50">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Hỏi Capy AI về quy chế, ngày công, lương thưởng..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="bg-white text-sm"
                    />
                    <Button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                    >
                      <Send className="w-4 h-4 mr-1.5" /> Gửi
                    </Button>
                  </form>
                </div>
              </Card>
            </div>

            {/* Quick Suggestion Prompts */}
            <div className="space-y-4">
              <Card className="border shadow-sm bg-orange-50/40 border-orange-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-orange-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-600" /> Gợi ý câu hỏi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Bấm để gửi nhanh cho Capy AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {PRESET_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="w-full text-left p-2.5 rounded-xl bg-white border border-orange-200/60 hover:border-orange-400 hover:bg-orange-50 transition-all text-xs font-medium text-slate-700 shadow-2xs"
                    >
                      💬 {q}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Document Center */}
        <TabsContent value="docs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Danh mục tài liệu ({KNOWLEDGE_DOCS.length})
              </h3>
              {KNOWLEDGE_DOCS.map((doc) => (
                <Card
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 cursor-pointer transition-all border ${
                    selectedDoc.id === doc.id
                      ? "border-orange-500 bg-orange-50/50 shadow-sm"
                      : "hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px] text-orange-700 bg-orange-50 border-orange-200">
                      {doc.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{doc.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                    {doc.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {doc.summary}
                  </p>
                </Card>
              ))}
            </div>

            <div className="md:col-span-2">
              <Card className="border shadow-sm p-6 bg-white space-y-4 min-h-[400px]">
                <div className="border-b pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-orange-100 text-orange-900 border-orange-200">
                      {selectedDoc.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Hiệu lực từ: {selectedDoc.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDoc.title}</h3>
                </div>

                <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                  <p className="font-semibold text-slate-800">
                    Tóm tắt nội dung quy định:
                  </p>
                  <p>{selectedDoc.summary}</p>
                  <div className="bg-gray-50 p-4 rounded-xl border text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-800">Điều khoản áp dụng toàn bộ nhân viên LimArt:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Tất cả nhân sự cần tuân thủ chấm công đúng giờ theo lịch đã đăng ký.</li>
                      <li>Mọi sự cố kỹ thuật về mạng hoặc thiết bị cần báo ngay cho Quản lý ca để hỗ trợ chấm công hộ.</li>
                      <li>Bảng tổng hợp công sẽ chốt vào 23:59 ngày cuối cùng mỗi tháng.</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
