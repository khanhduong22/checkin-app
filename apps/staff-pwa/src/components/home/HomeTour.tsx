import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, ChevronLeft, X } from "lucide-react";

interface Step {
  target?: string;
  title: string;
  content: string;
}

const TOUR_STEPS: Step[] = [
  {
    title: "👋 Chào mừng bạn!",
    content: "Chào mừng bạn đến với LimArt Staff PWA! Cùng lướt nhanh các tính năng quan trọng nhé.",
  },
  {
    target: "home-special-days",
    title: "🎉 Special Days",
    content: "Nơi hiển thị lời chúc Sinh nhật & Kỷ niệm làm việc. Confetti sẽ bung lụa vào ngày đặc biệt của bạn!",
  },
  {
    target: "home-announcement",
    title: "📢 Bảng tin thông báo",
    content: "Cập nhật các thông báo mới nhất từ công ty. Đừng bỏ lỡ nhé!",
  },
  {
    target: "home-user-info",
    title: "👤 Thông tin nhân viên",
    content: "Thông tin cá nhân, danh hiệu vinh danh và cấp bậc của bạn.",
  },
  {
    target: "home-privacy-stats",
    title: "💰 Thống kê & Thực nhận",
    content: "Xem nhanh lương tạm tính và số công trong tháng. Bạn có thể bấm để ẩn/hiện nếu muốn riêng tư.",
  },
  {
    target: "home-checkin-buttons",
    title: "📍 Nút Chấm Công",
    content: "Khu vực quan trọng nhất! Hãy Check-in đúng giờ và Check-out khi ra về.",
  },
  {
    target: "home-shift-duties",
    title: "📋 Nhiệm vụ ca làm",
    content: "Danh sách công việc trong ca của bạn và đồng đội cùng ca.",
  },
  {
    target: "home-sticky",
    title: "🦫 Trợ lý Capybara",
    content: "Linh vật Capy luôn sẵn sàng giải đáp thắc mắc về nội quy, chấm công và công việc.",
  },
  {
    target: "home-nav",
    title: "⚡ Phím tắt tác vụ",
    content: "Truy cập nhanh vào Lịch sử, Bảng lương, Đăng ký lịch, Job WFH, Đóng gói và Bưng lầu.",
  },
  {
    target: "home-gacha",
    title: "🎁 Vòng quay nhân phẩm",
    content: "Điểm danh hàng ngày để nhận lượt quay gacha rinh quà hấp dẫn!",
  },
];

export default function HomeTour({ forceRun = false }: { forceRun?: boolean }) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (forceRun) {
      setCurrentStepIndex(0);
      return;
    }
    try {
      const hasSeen = localStorage.getItem("tour_seen:/home:v1.8.0");
      if (!hasSeen) {
        const timer = setTimeout(() => setCurrentStepIndex(0), 600);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [forceRun]);

  const handleFinish = () => {
    try {
      localStorage.setItem("tour_seen:/home:v1.8.0", "true");
    } catch {}
    setCurrentStepIndex(null);
  };

  const handleNext = () => {
    if (currentStepIndex === null) return;
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const targetId = TOUR_STEPS[nextIndex].target;
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex === null || currentStepIndex === 0) return;
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    const targetId = TOUR_STEPS[prevIndex].target;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (currentStepIndex === null) return null;

  const step = TOUR_STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-amber-200 p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <button
          onClick={handleFinish}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-amber-600">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Hướng dẫn ({currentStepIndex + 1}/{TOUR_STEPS.length})
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{step.content}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFinish}
            className="text-xs text-stone-600 hover:text-stone-900 font-medium"
          >
            Bỏ qua
          </Button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="text-xs h-8 px-2.5 border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200 hover:text-stone-900 font-semibold shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1 text-stone-700" />
                Trước
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 shadow-xs"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? "Hoàn tất" : "Tiếp tục"}
              {currentStepIndex < TOUR_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
