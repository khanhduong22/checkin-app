import React, { useState } from "react";
import { X, Sparkles, Trophy, Gift } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface GachaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketCount: number;
  onUseTicket: () => void;
}

const PRIZES = [
  { id: "1", title: "Thưởng 50.000đ vào lương", icon: "💵", color: "from-emerald-500 to-green-600" },
  { id: "2", title: "Huy hiệu Vua Nhân Phẩm", icon: "👑", color: "from-amber-500 to-yellow-600" },
  { id: "3", title: "Trà sữa Koi Thé miễn phí", icon: "🧋", color: "from-orange-500 to-amber-600" },
  { id: "4", title: "Thưởng 20.000đ vào lương", icon: "🪙", color: "from-blue-500 to-indigo-600" },
  { id: "5", title: "Vé xem phim CGV cuối tuần", icon: "🎬", color: "from-purple-500 to-violet-600" },
  { id: "6", title: "Chúc bạn may mắn lần sau", icon: "🍀", color: "from-slate-600 to-slate-700" },
];

export const GachaModal: React.FC<GachaModalProps> = ({
  isOpen,
  onClose,
  ticketCount,
  onUseTicket,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof PRIZES[0] | null>(null);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (ticketCount <= 0) {
      toast.error("Bạn đã hết vé Gacha! Hãy duy trì streak chấm công để nhận thêm.");
      return;
    }

    setSpinning(true);
    setResult(null);

    // Decrement ticket
    onUseTicket();

    // Random spin animation
    setTimeout(() => {
      const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
      setResult(prize);
      setSpinning(false);

      if (prize.id !== "6") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success(`🎉 Chúc mừng bạn trúng: ${prize.title}!`);
      } else {
        toast.info("Chúc bạn may mắn lần sau nha! 🍀");
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Vòng Quay Gacha May Mắn</h3>
              <p className="text-xs text-slate-400">Bạn đang có: <span className="font-semibold text-amber-400">{ticketCount} Vé</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wheel Display */}
        <div className="py-6 flex flex-col items-center">
          <div
            className={`relative w-44 h-44 rounded-full border-4 border-amber-400/40 p-2 flex items-center justify-center bg-gradient-to-tr from-purple-900/60 to-indigo-900/60 shadow-[0_0_30px_rgba(168,85,247,0.3)] ${
              spinning ? "animate-spin" : ""
            }`}
          >
            <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/60 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-amber-300 animate-pulse" />
            </div>
            <div className="w-20 h-20 rounded-full bg-slate-950/90 border border-slate-700 flex flex-col items-center justify-center shadow-lg text-center p-1">
              <span className="text-xs font-bold text-amber-400">LimArt</span>
              <span className="text-[10px] text-slate-400">Gacha</span>
            </div>
          </div>

          {/* Reward Result Card */}
          {result && (
            <div className="mt-4 w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-center animate-in zoom-in-95">
              <div className="text-2xl mb-1">{result.icon}</div>
              <div className="font-bold text-sm text-amber-300">{result.title}</div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleSpin}
          disabled={spinning || ticketCount <= 0}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 ${
            ticketCount > 0
              ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white active:scale-98 shadow-purple-900/50"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{spinning ? "Đang quay thưởng..." : ticketCount > 0 ? "QUAY NGAY (1 Vé)" : "Hết vé quay"}</span>
        </button>
      </div>
    </div>
  );
};
