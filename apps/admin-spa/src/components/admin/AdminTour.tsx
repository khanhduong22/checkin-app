import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Sparkles } from "lucide-react";

interface Step {
  title: string;
  content: string;
  target?: string;
}

const TOUR_STEPS: Record<string, Step[]> = {
  "/": [
    {
      title: "👋 Chào mừng đến với Admin Panel!",
      content: "Bảng điều khiển quản trị tập trung dành cho ban quản lý LimArt.",
    },
    {
      title: "📊 Thống kê Lương & Chấm công",
      content: "Theo dõi tổng lương tạm tính, số đơn cần duyệt và số lượt check-in/out trong ngày.",
      target: "#dashboard-salary-card",
    },
    {
      title: "⏱️ Giám sát Hoạt động",
      content: "Theo dõi tình hình chấm công ra vào thời gian thực, tự động tính toán số phút đi trễ hoặc về sớm.",
      target: "#dashboard-checkin-activity",
    },
    {
      title: "📅 Ca trực hôm nay",
      content: "Nắm bắt danh sách nhân viên có lịch phân ca trong ngày.",
      target: "#dashboard-today-schedule",
    },
  ],
  "/employees": [
    {
      title: "👥 Quản lý Nhân sự",
      content: "Danh sách toàn bộ nhân viên. Bạn có thể chỉnh sửa tên, mức lương giờ, lương cứng, hoặc cấp quyền Admin.",
      target: "#user-manager-card",
    },
  ],
  "/requests": [
    {
      title: "📩 Duyệt Yêu Cầu",
      content: "Danh sách các đơn xin nghỉ phép, WFH hoặc giải trình chấm công. Bạn có thể duyệt 1-click hoặc từ chối kèm lý do.",
      target: "#request-admin-list",
    },
  ],
  "/payroll": [
    {
      title: "💰 Bảng Lương & Công",
      content: "Bảng lương chi tiết từng nhân sự. Có thể điều chỉnh thưởng phạt (±), tính % thưởng tháng và xuất file Excel.",
      target: "#payroll-table-container",
    },
  ],
  "/settings": [
    {
      title: "⚙️ Cấu hình Hệ thống",
      content: "Thiết lập IP văn phòng được phép check-in, cấu hình hệ số ngày lễ và sao lưu dữ liệu.",
      target: "#ip-manager-card",
    },
  ],
};

export default function AdminTour() {
  const location = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const pathname = location.pathname;
  const steps = TOUR_STEPS[pathname] || [];

  useEffect(() => {
    if (steps.length > 0) {
      const storageKey = `tour_seen:${pathname}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setCurrentStepIndex(0);
          setIsOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } else {
      setIsOpen(false);
    }
  }, [pathname, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    const storageKey = `tour_seen:${pathname}`;
    localStorage.setItem(storageKey, "true");
    setIsOpen(false);
  };

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl border-2 border-orange-200 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Hướng dẫn ({currentStepIndex + 1}/{steps.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-gray-700"
          onClick={handleFinish}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="py-3">
        <h4 className="font-bold text-slate-800 text-sm mb-1">
          {currentStep.title}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {currentStep.content}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFinish}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Bỏ qua
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs gap-1"
        >
          {currentStepIndex < steps.length - 1 ? (
            <>
              Tiếp theo <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : (
            "Hoàn thành"
          )}
        </Button>
      </div>
    </div>
  );
}
