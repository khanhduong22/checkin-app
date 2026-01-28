'use client';

import { performCheckIn } from "@/app/actions";
import { useState } from "react";

// Simple UI to show history
function HistoryList({ checkins }: { checkins: any[] }) {
    if (checkins.length === 0) return null;
    return (
        <div className="mt-6 rounded-xl bg-white/50 p-4 text-sm">
            <h3 className="mb-2 font-semibold text-gray-700">Lịch sử hôm nay</h3>
            <div className="space-y-2">
                {checkins.map((c) => (
                    <div key={c.id} className="flex justify-between border-b border-gray-200 pb-1 last:border-0">
                        <span className={c.type === 'checkin' ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
                            {c.type === 'checkin' ? '📍 Check-in' : '👋 Check-out'}
                        </span>
                        <span className="text-gray-500">
                            {new Date(c.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
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
                <button
                    onClick={() => handleAction('checkin')}
                    disabled={loading}
                    className="btn btn-primary disabled:opacity-50"
                >
                    📍 Check-in
                </button>
                <button
                    onClick={() => handleAction('checkout')}
                    disabled={loading}
                    className="btn btn-secondary disabled:opacity-50"
                >
                    👋 Check-out
                </button>
            </div>

            {loading && <div className="mt-4 text-center text-sm text-gray-500">⏳ Đang xử lý...</div>}

            {message && (
                <div className={`mt-4 rounded-lg p-3 text-sm border ${
                    message.type === 'success' 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-red-100 text-red-700 border-red-200'
                } animate-[fadeIn_0.5s]`}>
                    {message.text}
                </div>
            )}

            <HistoryList checkins={todayCheckins} />
        </div>
    );
}
