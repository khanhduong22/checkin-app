import React, { useState, useEffect } from "react";
import { Megaphone, Info, AlertTriangle, Check } from "lucide-react";
import { AnnouncementItem } from "@/lib/api-client";

export default function AnnouncementBar({
  announcements,
}: {
  announcements: AnnouncementItem[];
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<AnnouncementItem[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    if (!announcements || announcements.length === 0) return;

    try {
      const readIdsStr = localStorage.getItem("read_announcement_ids");
      const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];
      const unread = announcements.filter((a) => !readIds.includes(a.id));

      if (unread.length > 0) {
        setUnreadAnnouncements(unread);
        setShowPopup(true);
      }
    } catch {}
  }, [announcements]);

  useEffect(() => {
    if (showPopup) {
      setCountdown(10);
      setIsAgreed(false);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showPopup]);

  const handleMarkAsRead = () => {
    if (countdown > 0 || !isAgreed) return;

    try {
      const readIdsStr = localStorage.getItem("read_announcement_ids");
      const readIds: string[] = readIdsStr ? JSON.parse(readIdsStr) : [];
      const newReadIds = [...new Set([...readIds, ...unreadAnnouncements.map((a) => a.id)])];
      localStorage.setItem("read_announcement_ids", JSON.stringify(newReadIds));
    } catch {}

    setShowPopup(false);
  };

  if (!showPopup || unreadAnnouncements.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-100 flex flex-col animate-in zoom-in-95 duration-300">
        {/* Vibrant Gradient Header */}
        <div className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 p-6 text-white flex items-center gap-4 relative overflow-hidden">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm animate-pulse">
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-wider drop-shadow-md">
              THÔNG BÁO MỚI NHẤT
            </h2>
            <p className="text-xs text-white/80 mt-0.5 font-medium">
              Bạn có {unreadAnnouncements.length} thông báo chưa đọc
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-gray-50/50">
          {unreadAnnouncements.map((a) => {
            const Icon = a.type === "WARNING" ? AlertTriangle : Info;
            const badgeStyle =
              a.type === "WARNING"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-blue-100 text-blue-700 border-blue-200";

            return (
              <div
                key={a.id}
                className="p-4 rounded-xl border bg-white border-slate-100 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                    {a.type === "WARNING" ? "Cảnh báo" : "Thông tin"}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug">{a.title}</h3>
                <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                  {a.content}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer with Countdown and Confirmation */}
        <div className="p-4 bg-white border-t space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              disabled={countdown > 0}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
            />
            <span>Tôi đã đọc và hiểu rõ nội dung các thông báo trên</span>
          </label>

          <button
            onClick={handleMarkAsRead}
            disabled={countdown > 0 || !isAgreed}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              countdown > 0 || !isAgreed
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md active:scale-98"
            }`}
          >
            {countdown > 0 ? (
              <span>Vui lòng đọc ({countdown}s)...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Đã hiểu & Xác nhận</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
