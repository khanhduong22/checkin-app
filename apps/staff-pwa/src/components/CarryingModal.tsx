import React, { useState } from "react";
import { X, ArrowUpCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface CarryingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogCarrying: (floors: number, note: string) => void;
}

export const CarryingModal: React.FC<CarryingModalProps> = ({
  isOpen,
  onClose,
  onLogCarrying,
}) => {
  const [floors, setFloors] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      onLogCarrying(floors, note);
      setSubmitting(false);
      toast.success(`🛗 Đã ghi nhận bưng ${floors} lượt lầu (+${(floors * 20000).toLocaleString("vi-VN")}đ)!`);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Ghi Nhận Bưng Lầu</h3>
              <p className="text-xs text-slate-400">Phụ cấp 20.000đ / lượt lầu</p>
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
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Số lượt / Số tầng đã bưng:
            </label>
            <div className="flex items-center justify-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setFloors((f) => Math.max(1, f - 1))}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center active:scale-95"
              >
                -
              </button>
              <span className="text-2xl font-black text-amber-400 w-12 text-center">
                {floors}
              </span>
              <button
                type="button"
                onClick={() => setFloors((f) => f + 1)}
                className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-lg text-white flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ghi chú hàng hóa (tuỳ chọn):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: 5 thùng phôi tranh lầu 3"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            Ước tính phụ cấp: <span className="font-bold text-amber-400">{(floors * 20000).toLocaleString("vi-VN")} VNĐ</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 text-sm tracking-wide shadow-lg shadow-amber-900/30 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? "Đang ghi nhận..." : "XÁC NHẬN BƯNG LẦU"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
