"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, Loader2, Volume2, VolumeX, Mic, MicOff, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Làm sao để check-in?",
  "Quy trình xin giải trình?",
  "Cách đăng ký lịch làm việc?",
  "Cách xem chi tiết lương?",
];

export default function CapyAssistant({ currentUser }: { currentUser: any }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
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
            prev.map((m) => (m.id === aiMessageId ? { ...m, content: accumulated } : m))
          );
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: "❌ Đã xảy ra lỗi khi kết nối với Trợ lí Capy. Vui lòng thử lại sau." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm("Bạn muốn xóa lịch sử hội thoại hiện tại?")) {
      setMessages([]);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    }
  };

  const handleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Chrome hoặc Edge.");
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
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingId(null);
      };
      audio.play();
    } catch (err) {
      console.error(err);
      setPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col bg-white/70 backdrop-blur-md rounded-2xl border border-orange-100 shadow-sm overflow-hidden h-[420px] transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-400 text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              Trợ lí Capy
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-bounce" />
            </h4>
            <p className="text-[10px] text-gray-500 font-medium">Hỗ trợ nội bộ 24/7</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearChat}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="Xóa cuộc trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-orange-50/10">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">Xin chào, {currentUser?.name || "bạn"}! 👋</p>
                <p className="text-xs text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                  Tôi là **Trợ lí Capy**. Hãy hỏi tôi về hướng dẫn, chấm công, quy trình, hoặc bảng lương!
                </p>
              </div>
              
              {/* Suggestions */}
              <div className="w-full max-w-[260px] pt-2 space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 text-left pl-1">Gợi ý câu hỏi:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-left text-xs bg-white hover:bg-orange-50/50 border border-gray-100 hover:border-orange-200 p-2.5 rounded-xl transition-all shadow-2xs hover:scale-[1.01] text-gray-700 font-medium"
                    >
                      💡 {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 pb-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex w-full",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2.5 text-xs shadow-3xs leading-relaxed",
                      m.role === "user"
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-tr-none"
                        : "bg-white border border-orange-100 text-gray-800 rounded-tl-none"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1 gap-4 opacity-80">
                      <span className="font-bold text-[10px] tracking-wide uppercase">
                        {m.role === "user" ? "Bạn" : "Trợ lí Capy"}
                      </span>
                      {m.role === "assistant" && m.content && (
                        <button
                          onClick={() => handleTTS(m.id, m.content)}
                          className="hover:text-orange-500 transition-colors p-0.5 rounded"
                          title={playingId === m.id ? "Dừng đọc" : "Nghe đọc"}
                        >
                          {playingId === m.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-orange-500" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="prose prose-xs max-w-none dark:prose-invert font-medium">
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap m-0 font-sans">{m.content}</p>
                      ) : m.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-400 py-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Capy đang trả lời...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input panel */}
      <div className="p-3 border-t border-orange-100 bg-white shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "🎙️ Capy đang lắng nghe..." : "Hỏi Capy điều gì đó..."}
            className="flex-1 bg-gray-50/50 border-orange-100/60 focus-visible:ring-orange-400 focus-visible:border-orange-400 text-xs rounded-full py-1.5 h-9"
            disabled={isLoading}
          />
          
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            onClick={handleMic}
            disabled={isLoading}
            className={cn(
              "w-9 h-9 p-0 rounded-full border-orange-100/60 shrink-0",
              isListening && "animate-pulse bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
            )}
            title={isListening ? "Dừng nghe" : "Nói câu hỏi"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-gray-500" />}
          </Button>

          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 p-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shrink-0 shadow-sm transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
