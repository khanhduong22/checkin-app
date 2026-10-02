import React, { useState } from "react";
import { X, PackageCheck, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface PackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogPacking: (packageCount: number, channel: string) => void;
}

export const PackingModal: React.FC<PackingModalProps> = ({
  isOpen,
  onClose,
  onLogPacking,
}) => {
  const [count, setCount] = useState<number>(5);
  const [channel, setChannel] = useState<string>("Shopee");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onLogPacking(count, channel);
      setSubmitting(false);
      toast.success(`📦 Đã ghi nhận đóng ${count} đơn hàng ${channel}!`);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Ghi Nhận Đóng Gói</h3>
              <p className="text-xs text-slate-400">Tích lũy KPI & thưởng năng suất</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kênh bán hàng:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Shopee", "TikTok Shop", "Trực Tiếp"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                    channel === ch
                      ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-900/40"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Số lượng đơn hàng hoàn thành:
            </label>
            <div className="flex items-center justify-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 5))}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm text-white flex items-center justify-center active:scale-95"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600 font-bold text-sm text-white flex items-center justify-center active:scale-95"
              >
                -1
              </button>
              <span className="text-2xl font-black text-indigo-400 w-12 text-center">
                {count}
              </span>
              <button
                type="button"
                onClick={() => setCount((c) => c + 1)}
                className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600 font-bold text-sm text-white flex items-center justify-center active:scale-95"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setCount((c) => c + 5)}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm text-white flex items-center justify-center active:scale-95"
              >
                +5
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
            Thưởng tạm tính (+2.000đ/đơn): <span className="font-bold text-indigo-300">{(count * 2000).toLocaleString("vi-VN")} VNĐ</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-sm tracking-wide shadow-lg shadow-indigo-900/40 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? "Đang lưu..." : "XÁC NHẬN ĐÓNG GÓI"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
