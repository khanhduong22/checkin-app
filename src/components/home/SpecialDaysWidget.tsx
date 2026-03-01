'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useEffect, useState } from "react";

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

const SimpleConfetti = () => {
    const pieces = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: '-20px',
                        width: '10px',
                        height: '10px',
                        backgroundColor: p.color,
                        transform: `rotate(${p.rotation}deg)`,
                        animation: `fall 3s linear ${p.delay}s infinite`,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                    }
                }
            `}</style>
        </div>
    );
};

export interface SpecialEvent {
    id: string;
    userId?: string;
    type: 'BIRTHDAY' | 'ANNIVERSARY' | 'HOLIDAY';
    date: number;
    month: number;
    name: string;
    title: string;
    image?: string | null;
    details?: string;
    isToday: boolean;
}

export default function SpecialDaysWidget({
    specialUsers: events = [], // Prop renamed to 'events' conceptually but kept as 'specialUsers' for parent compatibility or updated. 
    // Actually let's assume parent might still pass it as 'specialUsers'.
    // But we changed the backend return type, so the passed data IS SpecialEvent[].
    enableCalendar = false,
    currentUserId
}: {
    specialUsers: SpecialEvent[],
    enableCalendar?: boolean,
    currentUserId?: string
}) {
    const [showConfetti, setShowConfetti] = useState(false);

    // Filter for TODAY's celebration
    const todayEvents = events.filter(e =>
        e.isToday && (
            e.type === 'HOLIDAY' || // Holidays for everyone
            (currentUserId ? e.userId === currentUserId : true) // Personal events for owner only
        )
    );

    useEffect(() => {
        if (todayEvents.length > 0) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [todayEvents.length]);

    if (!events || events.length === 0) return null;

    // Helper for rendering the event icon/color
    const getEventStyle = (type: string, isToday: boolean) => {
        switch (type) {
            case 'BIRTHDAY':
                return {
                    bg: isToday ? 'bg-yellow-50' : 'bg-white',
                    border: isToday ? 'border-yellow-200 shadow-sm' : 'border-slate-100',
                    iconBg: isToday ? 'bg-yellow-100' : 'bg-slate-100',
                    iconColor: isToday ? 'text-yellow-700' : 'text-slate-500',
                    barColor: 'bg-yellow-500',
                    emoji: '🎂'
                };
            case 'ANNIVERSARY':
                return {
                    bg: isToday ? 'bg-purple-50' : 'bg-white',
                    border: isToday ? 'border-purple-200 shadow-sm' : 'border-slate-100',
                    iconBg: isToday ? 'bg-purple-100' : 'bg-slate-100',
                    iconColor: isToday ? 'text-purple-700' : 'text-slate-500',
                    barColor: 'bg-purple-500',
                    emoji: '🏆'
                };
            case 'HOLIDAY':
                return {
                    bg: isToday ? 'bg-red-50' : 'bg-white',
                    border: isToday ? 'border-red-200 shadow-sm' : 'border-slate-100',
                    iconBg: isToday ? 'bg-red-100' : 'bg-slate-100',
                    iconColor: isToday ? 'text-red-700' : 'text-slate-500',
                    barColor: 'bg-red-500',
                    emoji: '🎉'
                };
            default: return { bg: 'bg-white', border: 'border-slate-100', iconBg: 'bg-slate-100', iconColor: 'text-slate-500', barColor: 'bg-slate-500', emoji: '📅' };
        }
    };

    return (
        <div id="home-special-days" className="mb-4 space-y-4">
            {showConfetti && <SimpleConfetti />}

            {/* 1. SECTION: TODAY CELEBRATION (Big Card) */}
            {todayEvents.map((event) => {
                // Personal birthday banner — only for the logged-in user themselves
                const isMyBirthday = event.type === 'BIRTHDAY' && event.userId === currentUserId;

                if (isMyBirthday) {
                    return (
                        <div
                            key={`today-${event.id}`}
                            className="relative overflow-hidden rounded-2xl animate-in zoom-in duration-500"
                            style={{
                                background: 'linear-gradient(135deg, #ff6ec7 0%, #ff9a3c 40%, #ffd700 70%, #ff6ec7 100%)',
                                backgroundSize: '200% 200%',
                                animation: 'gradientShift 4s ease infinite, zoom-in 0.5s ease',
                                padding: '3px',
                            }}
                        >
                            <style>{`
                                @keyframes gradientShift {
                                    0%   { background-position: 0% 50%; }
                                    50%  { background-position: 100% 50%; }
                                    100% { background-position: 0% 50%; }
                                }
                                @keyframes float {
                                    0%, 100% { transform: translateY(0px) rotate(-3deg); }
                                    50%       { transform: translateY(-8px) rotate(3deg); }
                                }
                            `}</style>
                            <div className="relative rounded-2xl bg-white/10 backdrop-blur-sm p-6 text-center overflow-hidden">
                                {/* Background decorations */}
                                <div className="absolute top-2 left-4 text-4xl opacity-20" style={{ animation: 'float 3s ease-in-out infinite' }}>🎂</div>
                                <div className="absolute top-3 right-6 text-3xl opacity-20" style={{ animation: 'float 3.5s ease-in-out infinite 0.5s' }}>🎁</div>
                                <div className="absolute bottom-2 left-8 text-2xl opacity-20" style={{ animation: 'float 4s ease-in-out infinite 1s' }}>✨</div>
                                <div className="absolute bottom-3 right-4 text-3xl opacity-20" style={{ animation: 'float 3s ease-in-out infinite 1.5s' }}>🌟</div>

                                {/* Main content */}
                                <div className="relative z-10 space-y-3">
                                    <div className="text-5xl" style={{ animation: 'float 2.5s ease-in-out infinite' }}>🎂</div>
                                    <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight tracking-tight">
                                        Chúc mừng sinh nhật!
                                    </h2>
                                    <p className="text-white/90 font-semibold text-base drop-shadow-sm">
                                        🎁 Bạn đã nhận được phần quà sinh nhật từ shop
                                    </p>
                                    <div className="flex justify-center gap-1 pt-1 text-xl">
                                        <span>🎉</span><span>🥳</span><span>🎊</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                // Default card for other events (holidays, anniversaries, someone else's birthday)
                return (
                    <Card key={`today-${event.id}`} className="p-4 border-2 border-yellow-200 bg-yellow-50/50 relative overflow-hidden animate-in zoom-in duration-500">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <span className="text-6xl">🎉</span>
                        </div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="h-14 w-14 rounded-full border-2 border-yellow-400 p-0.5 bg-white shadow-sm shrink-0">
                                {event.image ? (
                                    <Image
                                        src={event.image}
                                        alt={event.name}
                                        width={56}
                                        height={56}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-xl">
                                        {event.name?.[0]}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="font-bold text-lg text-yellow-800 leading-tight">
                                    {event.type === 'HOLIDAY' ? `Chào mừng ${event.name}! 🎉` :
                                        event.type === 'BIRTHDAY' ? "Happy Birthday! 🎂" : "Work Anniversary! 🏆"}
                                </h3>
                                <p className="text-sm text-yellow-700 mt-1">
                                    {event.type === 'HOLIDAY' && "Chúc mọi người một ngày lễ vui vẻ và hạnh phúc! ❤️"}
                                    {event.type === 'BIRTHDAY' && <span>Chúc mừng sinh nhật <b>{event.name}</b>! 🌟</span>}
                                    {event.type === 'ANNIVERSARY' && <span>Kỷ niệm <b>{event.details}</b> đồng hành cùng Lim Art!</span>}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}

            {/* 2. SECTION: MONTHLY CALENDAR (Compact List) - ADMIN ONLY */}
            {enableCalendar && (
                <Card className="p-4 border-dashed bg-slate-50/50">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <span>📅</span> Sự kiện tháng {new Date().getMonth() + 1}
                    </h4>
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {events.map((event) => {
                            const style = getEventStyle(event.type, event.isToday);

                            return (
                                <div key={event.id} className={`flex items-center gap-3 text-sm p-2 rounded-md border ${style.bg} ${style.border}`}>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-mono text-xs ${style.iconBg} ${style.iconColor}`}>
                                        {event.date < 10 ? `0${event.date}` : event.date}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium flex items-center gap-1">
                                            {event.name}
                                            {event.isToday && <span className={`flex h-2 w-2 rounded-full ${style.barColor}`} />}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span>{style.emoji} {event.title}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
