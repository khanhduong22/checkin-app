"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, FileText, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDocuments } from "./actions";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function HelpCenterPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocuments().then((docs: any[]) => {
      setDocuments(docs);
      if (docs.length > 0) setSelectedDoc(docs[0]);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    // Add placeholder AI message
    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId ? { ...m, content: accumulated } : m
            )
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: "❌ Có lỗi xảy ra, vui lòng thử lại." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Trung tâm Trợ giúp & AI</h2>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-4">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Trợ lý AI
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Tài liệu HDSD
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="h-[calc(100vh-220px)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b shrink-0 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <span>Trợ lý AI Hướng dẫn nội bộ</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
              <ScrollArea className="flex-1 p-6">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4 py-20">
                    <Bot className="w-16 h-16 opacity-20" />
                    <div>
                      <p>Chào bạn! Tôi là trợ lý AI nội bộ của dự án.</p>
                      <p className="text-sm">Hãy đặt câu hỏi về cách sử dụng phần mềm, quy trình, hoặc các tính năng.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-20">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg p-4 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div className="font-semibold mb-1 text-sm opacity-70">
                            {m.role === "user" ? "Bạn" : "AI Assistant"}
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {m.role === "user" ? (
                              <p className="whitespace-pre-wrap m-0">{m.content}</p>
                            ) : m.content ? (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                            ) : (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t bg-background shrink-0 absolute bottom-0 w-full">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ví dụ: Làm sao để xuất bảng lương hàng tháng?"
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-2">Gửi</span>
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="h-[calc(100vh-220px)]">
          <Card className="h-full flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/30 shrink-0 flex flex-col">
              <div className="p-4 border-b font-medium text-sm">Danh mục tài liệu</div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedDoc?.id === doc.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      {doc.title}
                    </button>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3">Chưa có tài liệu nào. Hãy chạy script đồng bộ.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedDoc ? (
                <ScrollArea className="flex-1 p-8">
                  <div className="max-w-3xl mx-auto">
                    <p className="text-sm text-muted-foreground mb-4">Đường dẫn: {selectedDoc.path}</p>
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.content}</ReactMarkdown>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Chọn một tài liệu để xem
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
