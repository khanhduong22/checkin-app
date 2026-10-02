import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { spinWheel } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trophy, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface Prize {
  id: string;
  name: string;
  type: string;
  remaining: number;
}

const DEFAULT_PRIZES: Prize[] = [
  { id: "1", name: "+10,000đ Tiền Mặt", type: "MONEY", remaining: 5 },
  { id: "2", name: "+20,000đ Tiền Mặt", type: "MONEY", remaining: 3 },
  { id: "3", name: "Danh hiệu: Bàn Tay Vàng", type: "TITLE", remaining: 1 },
  { id: "4", name: "+50,000đ Thưởng Nóng", type: "MONEY", remaining: 1 },
  { id: "5", name: "Chúc bạn may mắn lần sau", type: "LUCK", remaining: 10 },
  { id: "6", name: "+15,000đ Cà Phê Sáng", type: "MONEY", remaining: 4 },
];

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98FB98",
  "#DDA0DD",
  "#FFD700",
  "#87CEEB",
];

export default function LuckyWheelGame({
  prizes = DEFAULT_PRIZES,
}: {
  prizes?: Prize[];
}) {
  const wheelPrizes = prizes.length > 0 ? prizes : DEFAULT_PRIZES;
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const sliceAngle = 360 / wheelPrizes.length;

  const handleSpin = async () => {
    if (spinning) return;
    setSpinning(true);

    try {
      const res = await spinWheel();
      if (!res.success) {
        alert(res.message || "Không thể quay");
        setSpinning(false);
        return;
      }

      const winningPrize = res.prize || wheelPrizes[0];
      const winningIndex = wheelPrizes.findIndex((p) => p.name === winningPrize.name);
      const targetIdx = winningIndex >= 0 ? winningIndex : 0;

      // 5 full spins + target angle offset
      const extraSpins = 5 * 360;
      const targetAngle = 360 - (targetIdx * sliceAngle + sliceAngle / 2);
      const newRotation = rotation + extraSpins + (targetAngle - (rotation % 360));

      setRotation(newRotation);

      setTimeout(() => {
        setResult(winningPrize);
        setShowResult(true);
        setSpinning(false);
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      }, 4000);
    } catch {
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4">
      {/* Visual Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none">
        {/* Pointer Pin at Top */}
        <div className="absolute top-0 z-30 -translate-y-2 flex flex-col items-center">
          <div className="w-6 h-8 bg-amber-500 clip-triangle shadow-md" style={{ clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)" }} />
          <div className="w-3 h-3 rounded-full bg-amber-600 -mt-1 shadow" />
        </div>

        {/* Rotating Wheel SVG */}
        <div
          className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
            {wheelPrizes.map((p, i) => {
              const startAngle = (i * 360) / wheelPrizes.length;
              const endAngle = ((i + 1) * 360) / wheelPrizes.length;
              const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
              const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
              const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
              const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

              const color = COLORS[i % COLORS.length];
              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

              const textAngle = startAngle + sliceAngle / 2;

              return (
                <g key={p.id || i}>
                  <path d={pathData} fill={color} stroke="#ffffff" strokeWidth="0.5" />
                  <text
                    x="50"
                    y="22"
                    fill="#1e293b"
                    fontSize="3.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    transform={`rotate(${textAngle} 50 50)`}
                  >
                    {p.name.length > 18 ? p.name.slice(0, 16) + "..." : p.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Wheel Center Cap */}
          <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white border-4 border-amber-400 shadow-md flex items-center justify-center font-black text-amber-600 text-xs">
            LIMART
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <Button
        size="lg"
        onClick={handleSpin}
        disabled={spinning}
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold px-10 h-12 rounded-2xl shadow-lg active:scale-95 text-base cursor-pointer"
      >
        <Sparkles className="w-5 h-5 mr-2 animate-bounce" />
        {spinning ? "Đang quay..." : "QUAY NGAY"}
      </Button>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm text-center rounded-2xl p-6">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mb-2">
              🏆
            </div>
            <DialogTitle className="text-xl font-black text-amber-700">
              Chúc mừng bạn!
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <p className="text-xs text-muted-foreground">Bạn đã quay trúng phần quà:</p>
            <h3 className="text-lg font-bold text-gray-900 bg-amber-50 py-2.5 px-4 rounded-xl border border-amber-200">
              {result?.name}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold">
              Phần thưởng sẽ được tự động cộng vào bảng lương kỳ này!
            </p>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
              onClick={() => setShowResult(false)}
            >
              Nhận Thưởng & Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
