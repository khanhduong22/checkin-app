"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, FileText, Bot, Loader2, Volume2, VolumeX, Mic, MicOff, Plus, Trash, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDocuments, uploadDocument, deleteDocument } from "./actions";

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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDocuments().then((docs: any[]) => {
      setDocuments(docs);
      if (docs.length > 0) setSelectedDoc(docs[0]);
    });
  }, []);

  const reloadDocs = async () => {
    const docs = await getDocuments();
    setDocuments(docs);
    if (docs.length > 0) {
      if (!docs.some(d => d.id === selectedDoc?.id)) {
        setSelectedDoc(docs[0]);
      }
    } else {
      setSelectedDoc(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim() || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);

      const res = await uploadDocument(formData);
      if (res.success) {
        setUploadTitle("");
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setShowUpload(false);
        await reloadDocs();
        alert("Tải tài liệu lên thành công!");
      } else {
        alert(res.error || "Gặp lỗi khi tải tài liệu lên.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi mạng.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${title}"? Tất cả các đoạn dữ liệu AI đã lưu của tài liệu này cũng sẽ bị xóa bỏ.`)) return;

    try {
      const res = await deleteDocument(id);
      if (res.success) {
        await reloadDocs();
        alert("Xóa tài liệu thành công!");
      } else {
        alert(res.error || "Không thể xóa tài liệu.");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi thực hiện thao tác xóa.");
    }
  };

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
            prev.map((m) => m.id === aiMessageId ? { ...m, content: accumulated } : m)
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

  const handleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    recognition.start();
  };

  const handleTTS = async (messageId: string, text: string) => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === messageId) {
      setPlayingId(null);
      return;
    }

    setPlayingId(messageId);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlayingId(null); };
      audio.play();
    } catch {
      setPlayingId(null);
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
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-semibold text-sm opacity-70">
                              {m.role === "user" ? "Bạn" : "AI Assistant"}
                            </span>
                            {m.role === "assistant" && m.content && (
                              <button
                                onClick={() => handleTTS(m.id, m.content)}
                                className="opacity-50 hover:opacity-100 transition-opacity"
                                title={playingId === m.id ? "Dừng đọc" : "Nghe AI đọc"}
                              >
                                {playingId === m.id
                                  ? <VolumeX className="w-4 h-4 text-indigo-500" />
                                  : <Volume2 className="w-4 h-4" />
                                }
                              </button>
                            )}
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
                    placeholder={isListening ? "🎙️ Đang nghe..." : "Ví dụ: Làm sao để xuất bảng lương hàng tháng?"}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant={isListening ? "destructive" : "outline"}
                    onClick={handleMic}
                    disabled={isLoading}
                    title={isListening ? "Dừng nghe" : "Nói câu hỏi"}
                    className={isListening ? "animate-pulse" : ""}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
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
            <div className="w-80 border-r bg-muted/30 shrink-0 flex flex-col">
              <div className="p-4 border-b font-semibold text-sm flex justify-between items-center bg-white shrink-0">
                <span>Danh mục tài liệu</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUpload(!showUpload)}
                  className="h-8 w-8 p-0"
                  title="Tải tài liệu mới lên"
                >
                  {showUpload ? <X className="w-4 h-4 text-red-500" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                </Button>
              </div>

              {showUpload && (
                <div className="p-4 border-b bg-indigo-50/50 space-y-3 shrink-0">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Tải tài liệu mới (.docx, .txt)</h4>
                  <form onSubmit={handleUploadSubmit} className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Tiêu đề tài liệu..."
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      required
                      className="bg-white h-8 text-xs"
                    />
                    <Input
                      type="file"
                      ref={fileInputRef}
                      accept=".docx,.txt"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      required
                      className="bg-white h-8 text-xs file:mr-2 file:py-0 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <Button type="submit" size="sm" className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Tải lên
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between group rounded-md transition-colors hover:bg-muted/60 pr-1">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate ${selectedDoc?.id === doc.id ? "bg-primary text-primary-foreground font-medium" : ""}`}
                      >
                        {doc.title}
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa tài liệu"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3">Chưa có tài liệu nào.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
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
