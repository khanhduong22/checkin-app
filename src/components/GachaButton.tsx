'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rollGacha } from "@/app/actions/gacha";
import { Dices, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner";

export default function GachaButton({ userId, hasCheckedIn }: { userId: string, hasCheckedIn: boolean }) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [reward, setReward] = useState<any>(null);

    const handleRoll = async () => {
        if (loading) return;
        setLoading(true);
        // Fake delay for suspense
        await new Promise(r => setTimeout(r, 1500)); 
        
        const res = await rollGacha(userId);
        setLoading(false);

        if (res.success) {
            setReward(res.reward);
        } else {
            toast.error(res.message);
            setIsOpen(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!hasCheckedIn && open) {
            toast.error("Vui lòng Check-in trước khi quay!");
            return;
        }
        setIsOpen(open);
        if(!open) {
            setReward(null); // Reset when close
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="w-full bg-gradient-to-r from-pink-100 to-purple-100 border-purple-200 hover:from-pink-200 hover:to-purple-200 text-purple-700 font-bold shadow-sm"
                >
                    <Dices className="mr-2 h-4 w-4" />
                    Vòng Quay Nhân Phẩm
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader>
                    <DialogTitle className="text-center text-purple-700 text-xl font-bold flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Gacha Time
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-8 flex flex-col items-center justify-center min-h-[200px]">
                    {!reward ? (
                        <>
                             {loading ? (
                                 <div className="space-y-4 animate-pulse">
                                     <div className="text-6xl animate-spin">🎲</div>
                                     <p className="text-purple-600 font-medium">Đang cầu nguyện...</p>
                                 </div>
                             ) : (
                                 <div className="space-y-6">
                                     <div className="text-6xl animate-bounce">🎁</div>
                                     <Button 
                                        size="lg" 
                                        onClick={handleRoll} 
                                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold px-8 shadow-lg scale-110 transition-transform active:scale-95"
                                     >
                                         QUAY NGAY
                                     </Button>
                                     <p className="text-xs text-muted-foreground italic">Mỗi ngày 1 lượt - Nhân phẩm là chính</p>
                                 </div>
                             )}
                        </>
                    ) : (
                        <div className="space-y-4 animate-in zoom-in duration-500">
                             <div className="text-7xl mb-4">
                                 {reward.type === 'MONEY' ? '💰' : (reward.type === 'TITLE' ? '👑' : '🍀')}
                             </div>
                             
                             <div className="space-y-1">
                                <h3 className="text-lg font-bold text-gray-900">{reward.message}</h3>
                                {reward.value > 0 && (
                                    <div className="text-2xl font-black text-emerald-600">
                                        +{new Intl.NumberFormat('vi-VN').format(reward.value)}đ
                                    </div>
                                )}
                             </div>

                             <div className="pt-6">
                                 <Button variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                             </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
