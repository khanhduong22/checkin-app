'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rollGacha } from "@/app/actions/gacha";
import { Dices } from "lucide-react";

export default function GachaButton({ userId, hasCheckedIn }: { userId: string, hasCheckedIn: boolean }) {
    const [loading, setLoading] = useState(false);

    const handleRoll = async () => {
        if (!hasCheckedIn) {
            alert("Chấm công đi đã rồi quay!");
            return;
        }
        setLoading(true);
        const res = await rollGacha(userId);
        setLoading(false);

        if (res.success) {
            alert(`🎉 ${res.reward?.message} ${res.reward?.value ? '(+' + res.reward.value + 'đ)' : ''}`);
        } else {
            alert(res.message);
        }
    };

    return (
        <Button 
            variant="outline" 
            className="w-full bg-gradient-to-r from-pink-100 to-purple-100 border-purple-200 hover:from-pink-200 hover:to-purple-200 text-purple-700 font-bold"
            onClick={handleRoll}
            disabled={loading}
        >
            <Dices className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang quay...' : 'Vòng Quay Nhân Phẩm'}
        </Button>
    );
}
