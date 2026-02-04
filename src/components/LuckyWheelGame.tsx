'use client';

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { spinWheel } from "@/app/actions/lucky-wheel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Frown, Sparkles } from "lucide-react";
import confetti from 'canvas-confetti';

interface Prize {
    id: string;
    name: string;
    type: string;
    active: boolean;
    remaining: number;
    color?: string; // We'll generate this
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#DDA0DD', '#FFD700', '#87CEEB'];

export default function LuckyWheelGame({ prizes }: { prizes: Prize[] }) {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [showResult, setShowResult] = useState(false);
    
    // Normalize prizes for the wheel (even slices for visual simplicity, or we could weight them visualy too but usually wheels are even slices and prob is hidden)
    // Let's assume even slices for the visual wheel.
    const sliceAngle = 360 / prizes.length;

    const handleSpin = async () => {
        if (spinning) return;
        setSpinning(true);

        // Reset previous result state visually if needed, but we keep rotation
        
        try {
            const res = await spinWheel();
            
            if (!res.success) {
                alert(res.message);
                setSpinning(false);
                return;
            }

            const winningPrize = res.prize;
            if (!winningPrize) {
                 alert("Lỗi dữ liệu vòng quay");
                 setSpinning(false);
                 return;
            }
            const winningIndex = prizes.findIndex(p => p.id === winningPrize.id);
            
            if (winningIndex === -1) {
                // Fallback for logic mismatch
                alert("Có lỗi xảy ra, vui lòng tải lại trang.");
                setSpinning(false);
                return;
            }

            // Calculate rotation
            // We want to land on the winningIndex.
            // The pointer is usually at top (0deg) or right (90deg).
            // Let's assume pointer is at Top (0deg in CSS transform).
            // To land on index i, we need to rotate so that segment i is at 0deg.
            // Segment i covers [i*slice, (i+1)*slice]. Center is (i+0.5)*slice.
            // We want (i+0.5)*slice to equal 360 - (final_rotation % 360) roughly.
            // Actually: Rotation = TotalSpins + TargetOffset.
            // Target angle from 0: - (winningIndex * sliceAngle)
            
            // Add some full spins (e.g., 5 spins)
            const fullSpins = 5 * 360; 
            
            // Random jitter within the slice to avoid always landing center
            const jitter = Math.random() * (sliceAngle - 10) + 5; // padding 5deg
            
            // Current rotation
            const currentRot = rotation % 360;
            
            // Target angle (where the slice starts)
            // If pointer is at top, and we rotate clockwise.
            // Index 0 is at 0-sliceAngle.
            // To get Index 0 to top, we rotate 0 (or 360).
            // To get Index 1 to top, we rotate 360 - 1*sliceAngle.
            
            // Using slightly randomized landing position
            const targetAngle = (360 - (winningIndex * sliceAngle)) + fullSpins; 
            // Add jitter? No, let's just aim for center of slice for simplicity first or standard CSS.
            
            // Let's retry math:
            // 0 deg = Prize 0.
            // 360/N deg = Prize N-1 (Counter clockwise? No).
            // Let's just generate a huge rotation that ends at the right spot.
            
            // Visual Index:
            // 0: [0, 30]
            // 1: [30, 60]
            // ...
            // If we rotate Container Clockwise by X degrees.
            // The item at Top (270deg or -90deg usually in CSS circle) is the winner.
            // Let's assume standard CSS: 0deg is Right (3 o'clock). 270deg is Top.
            // To make Prize 0 (at 0deg initially) go to Top (270deg), we rotate -90 or +270.
            
            // Easier way:
            // Logic: 
            // 1. Calculate angle where prize resides. `prizeAngle = winningIndex * sliceAngle`
            // 2. We want this angle to align with the Pointer (say at Top).
            // 3. `finalRotation = 360 * 5 + (360 - prizeAngle)`. (Plus offset for pointer).
            
            const prizeCenterAngle = winningIndex * sliceAngle + (sliceAngle / 2);
            
            // If pointer is at Top (270deg relative to 0 being Right), or simply:
            // We rotate the wheel so the prize hits the mark.
            // Let's add an offset.
            
            const newRotation = rotation + 1800 + (360 - prizeCenterAngle); 
            // 1800 = 5 spins. 
            // (360 - prizeCenterAngle) brings the prize to the 0-degree mark.
            // If we want it at Top (usually 0 in my CSS setup below), this works.
            
            setRotation(newRotation);
            
            // Wait for animation (e.g. 5s)
            setTimeout(() => {
                setResult(winningPrize);
                setShowResult(true);
                setSpinning(false);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }, 5000);

        } catch (e) {
            setSpinning(false);
            alert("Lỗi kết nối.");
        }
    };

    return (
        <div className="flex flex-col items-center gap-8 py-10">
            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 w-8 h-10">
                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-600 drop-shadow-md"></div>
                </div>

                {/* Wheel */}
                <div 
                    className="w-full h-full rounded-full border-4 border-gray-300 shadow-xl overflow-hidden relative transition-transform cubic-bezier(0.2, 0.8, 0.2, 1)"
                    style={{ 
                        transform: `rotate(${rotation}deg)`,
                        transitionDuration: '5s'
                    }}
                >
                    {prizes.map((prize, idx) => {
                        const rotate = idx * sliceAngle;
                        // Skew is needed for cone slices if using background-image conic-gradient is harder logic.
                        // Im using conic-gradient for background and absolute div for text easiest?
                        // Let's use simple absolute positioning with rotation.
                        return (
                            <div 
                                key={prize.id}
                                className="absolute top-0 left-1/2 w-1/2 h-full origin-left"
                                style={{ 
                                    transform: `rotate(${rotate}deg)`,
                                    transformOrigin: '0% 50%', // Rotate around center
                                    // Actually doing slices with divs is tricky for background color.
                                    // Let's use the parent conic-gradient for colors, and this for text.
                                }}
                            >
                                {/* We need a text container rotated back or positioned correctly */}
                            </div>
                        )
                    })}
                    
                    {/* SVG Wheel for easier slices */}
                    <svg viewBox="0 0 100 100" className="w-full h-full absolute top-0 left-0 -rotate-90">
                        {prizes.map((prize, idx) => {
                            // Calculate SVG Path for slice
                            // x = r + r*cos(a)
                            // y = r + r*sin(a)
                            // center 50,50 radius 50
                            const startAngle = (idx * sliceAngle * Math.PI) / 180;
                            const endAngle = ((idx + 1) * sliceAngle * Math.PI) / 180;
                            
                            const x1 = 50 + 50 * Math.cos(startAngle);
                            const y1 = 50 + 50 * Math.sin(startAngle);
                            const x2 = 50 + 50 * Math.cos(endAngle);
                            const y2 = 50 + 50 * Math.sin(endAngle);
                            
                            const largeArc = sliceAngle > 180 ? 1 : 0;
                            
                            const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            return (
                                <g key={prize.id}>
                                    <path d={pathData} fill={COLORS[idx % COLORS.length]} stroke="white" strokeWidth="0.5" />
                                    {/* Text Label */}
                                    <text 
                                        x="50" 
                                        y="50" 
                                        fill="white" 
                                        fontSize="4"
                                        fontWeight="bold"
                                        textAnchor="end"
                                        alignmentBaseline="middle"
                                        transform={`rotate(${(idx * sliceAngle) + (sliceAngle/2)}, 50, 50) translate(45, 0)`}
                                    >
                                        {prize.name.substring(0, 15) + (prize.name.length>15?'...':'')}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
                
                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg z-10 flex items-center justify-center font-bold text-gray-700">
                    LIM
                </div>
            </div>

            <Button 
                size="lg" 
                className="text-lg px-8 py-6 rounded-full shadow-lg bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-4 border-white ring-2 ring-pink-200"
                onClick={handleSpin}
                disabled={spinning}
            >
                {spinning ? 'Đang quay...' : 'QUAY NGAY!'}
            </Button>
            
            <p className="text-muted-foreground text-sm italic">
                * Mỗi ngày bạn có thể nhận được thêm lượt quay từ admin.
            </p>

            <Dialog open={showResult} onOpenChange={setShowResult}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl flex flex-col items-center gap-2">
                            {result?.type === 'BETTER_LUCK_NEXT_TIME' ? (
                                <Frown className="h-16 w-16 text-gray-400" />
                            ) : (
                                <Trophy className="h-16 w-16 text-yellow-500 animate-bounce" />
                            )}
                            {result?.type === 'BETTER_LUCK_NEXT_TIME' ? 'Tiếc quá' : 'Chúc mừng!'}
                        </DialogTitle>
                        <div className="text-center py-4">
                            <p className="text-lg text-gray-600">Bạn đã quay vào ô:</p>
                            <h3 className="text-xl font-bold text-primary mt-2">{result?.name}</h3>
                            {result?.description && <p className="text-sm text-gray-500 mt-1">{result.description}</p>}
                        </div>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowResult(false)} className="w-full">Xác nhận</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
