'use client';

import { performCheckIn } from "@/app/actions";
import { useState } from "react";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Simple UI to show history

function HistoryList({ checkins }: { checkins: any[] }) {
    if (checkins.length === 0) return null;
    return (
        <div className="mt-8">
             <h3 className="mb-4 text-sm font-medium text-muted-foreground">Lịch sử hôm nay</h3>
             <div className="rounded-md border">
                {checkins.map((c, i) => (
                    <div key={c.id} className={cn("flex items-center justify-between p-4", i !== checkins.length - 1 && "border-b")}>
                        <div className="flex items-center gap-4">
                             <div className={cn("h-2.5 w-2.5 rounded-full", c.type === 'checkin' ? "bg-emerald-500" : "bg-orange-500")} />
                             <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                    {c.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                </span>
                             </div>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">
                             {new Date(c.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
             </div>
        </div>
    )
}

export default function CheckInButtons({ userId, todayCheckins }: { userId: string, todayCheckins: any[] }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleAction = async (type: 'checkin' | 'checkout') => {
        setLoading(true);
        setMessage(null);
        
        try {
            const result = await performCheckIn(userId, type);
            setMessage({
                text: result.message,
                type: result.success ? 'success' : 'error'
            });
        } catch (e) {
            setMessage({ text: 'Lỗi kết nối server', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={() => handleAction('checkin')}
                    disabled={loading}
                    className="h-16 text-md font-semibold bg-emerald-600 hover:bg-emerald-700"
                >
                    📍 Check-in
                </Button>
                <Button
                    onClick={() => handleAction('checkout')}
                    disabled={loading}
                    variant="outline"
                    className="h-16 text-md font-semibold border-2"
                >
                    👋 Check-out
                </Button>
            </div>

            {loading && <div className="mt-4 text-center text-xs text-muted-foreground animate-pulse">Đang xử lý...</div>}

            {message && (
                <div className={cn("mt-4 rounded-md p-3 text-sm font-medium", 
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' 
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900'
                )}>
                    {message.text}
                </div>
            )}

            <HistoryList checkins={todayCheckins} />
        </div>
    );
}
