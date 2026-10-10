import React, { useState, useEffect } from "react";
import { X, Smartphone, Download, Info } from "lucide-react";
import { usePwaInstallPrompt, STORAGE_KEY_DISMISSED } from "@/lib/pwa/usePwaInstallPrompt";
import { PwaStepCards } from "./PwaStepCards";

export interface PwaInstallModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ forceOpen, onClose }) => {
  const {
    isOpen: autoOpen,
    platform: detectedPlatform,
    canInstallNative,
    closeModal,
    dismissPermanently,
    triggerNativeInstall,
  } = usePwaInstallPrompt();

  const [activeTab, setActiveTab] = useState<"ios" | "android">(() =>
    detectedPlatform === "android" ? "android" : "ios"
  );

  useEffect(() => {
    if (detectedPlatform === "android") {
      setActiveTab("android");
    } else if (detectedPlatform === "ios") {
      setActiveTab("ios");
    }
  }, [detectedPlatform]);

  const isVisible = forceOpen !== undefined ? forceOpen : autoOpen;

  if (!isVisible) return null;

  const handleClose = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
      } catch (err) {
        console.error("[PWA] Error persisting dismissal:", err);
      }
    }
    closeModal();
    onClose?.();
  };

  const handleDismissPermanently = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
      } catch (err) {
        console.error("[PWA] Error persisting dismissal:", err);
      }
    }
    dismissPermanently();
    onClose?.();
  };

  const isIos = activeTab === "ios";

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div
        className="relative w-full max-w-[420px] rounded-3xl bg-white dark:bg-[#1c1917] text-stone-900 dark:text-stone-100 border border-orange-100 dark:border-stone-800 shadow-2xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 pr-2">
            <h2 id="pwa-install-title" className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Cài đặt LimArt Staff lên màn hình chính
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Truy cập LimArt Staff nhanh hơn như một ứng dụng độc lập ngay trên màn hình chính điện thoại của bạn.
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Đóng hướng dẫn"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform Switcher */}
        <div className="flex rounded-2xl bg-stone-100 dark:bg-stone-800/80 p-1 text-xs font-semibold border border-orange-100/50 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isIos
                ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs font-bold"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isIos
                ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs font-bold"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android / Chrome</span>
          </button>
        </div>

        {/* Instruction Container */}
        <div className="rounded-2xl bg-[#faf6f0] dark:bg-stone-900/60 border border-orange-100 dark:border-stone-800 p-3.5 flex flex-col gap-3">
          <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
            {isIos ? "Hướng dẫn trên iPhone / iPad (Safari)" : "Hướng dẫn trên Android (Chrome / Cốc Cốc)"}
          </div>

          <PwaStepCards isIos={isIos} />
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            {isIos
              ? "Lưu ý: Trên iOS Safari, nhấn biểu tượng Chia sẻ (hộp có mũi tên lên), sau đó cuộn xuống chọn 'Thêm vào Màn hình chính' (Add to Home Screen)."
              : "Lưu ý: Bạn cũng có thể mở menu trình duyệt (biểu tượng 3 chấm ⋮) và chọn 'Cài đặt ứng dụng' hoặc 'Thêm vào Màn hình chính'."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {canInstallNative && !isIos && (
            <button
              type="button"
              onClick={triggerNativeInstall}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Cài Đặt Ngay (1 Chạm)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm flex items-center justify-center shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            Đã hiểu
          </button>

          <button
            type="button"
            onClick={handleDismissPermanently}
            className="w-full min-h-[38px] py-2 text-center text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium transition-colors cursor-pointer flex items-center justify-center"
          >
            Không hiển thị lại nữa
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallModal;
