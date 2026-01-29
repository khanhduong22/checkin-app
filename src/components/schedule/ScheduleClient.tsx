'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registerShift, cancelShift, toggleShiftSwap, takeShift } from "@/app/actions/shift";
import { useRouter } from "next/navigation";

// Helpers
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SHIFTS = [
    { value: 'MORNING', label: 'Sáng (8:30 - 12:00)' },
    { value: 'AFTERNOON', label: 'Chiều (13:30 - 17:30)' },
    { value: 'FULL', label: 'Cả ngày' }
];

export default function ScheduleClient({ shifts, availableSwaps = [] }: { shifts: any[], availableSwaps?: any[] }) {
    const router = useRouter();
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate Calendar Grid
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = firstDay.getDay(); // 0 = Sunday

    const calendarCells = [];
    // Padding
    for (let i = 0; i < startDayIndex; i++) calendarCells.push(null);
    // Days
    for (let i = 1; i <= daysInMonth; i++) calendarCells.push(new Date(year, month, i));

    // Shift Helper
    const getShiftForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return shifts.find(s => s.date.startsWith(dateStr));
    };

    const getSwapForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return availableSwaps?.find(s => s.date.startsWith(dateStr));
    };

    const handleRegister = async (shiftValue: string) => {
        if (!selectedDate) return;
        setIsSubmitting(true);
        const res = await registerShift(selectedDate.toISOString(), shiftValue);
        setIsSubmitting(false);
        if (res.success) {
            setSelectedDate(null); // Close modal
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm("Hủy ca này?")) return;
        await cancelShift(id);
        setSelectedDate(null);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <a href="/">
                    <Button variant="outline" size="sm">← Home</Button>
                </a>
                <h1 className="text-xl font-bold">Đăng ký lịch làm việc</h1>
                <div className="w-[80px]"></div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <Button onClick={() => setViewDate(new Date(year, month - 1, 1))} variant="ghost">◀</Button>
                    <CardTitle className="text-lg">Tháng {month + 1} / {year}</CardTitle>
                    <Button onClick={() => setViewDate(new Date(year, month + 1, 1))} variant="ghost">▶</Button>
                </CardHeader>
                <CardContent>
                    {/* Header Row */}
                    <div className="grid grid-cols-7 mb-2 text-center text-sm font-semibold text-muted-foreground">
                        {DAYS.map(d => <div key={d}>{d}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((date, idx) => {
                            if (!date) return <div key={idx} className="h-24 bg-gray-50/30 rounded-md" />;
                            
                            const shift = getShiftForDate(date);
                            const swap = getSwapForDate(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedDate(date)}
                                    className={`
                                        h-24 p-2 border rounded-md flex flex-col justify-between cursor-pointer transition-colors relative
                                        ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-300'}
                                        ${shift 
                                            ? (shift.shift === 'FULL' ? 'bg-emerald-50' : 'bg-orange-50') 
                                            : (swap ? 'bg-purple-50 ring-2 ring-purple-200 ring-inset' : '')}
                                    `}
                                >
                                    <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                                        {date.getDate()}
                                    </span>
                                    
                                    {shift && (
                                        <div className={`
                                            text-[10px] px-1 py-0.5 rounded font-medium truncate
                                            ${shift.shift === 'FULL' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
                                        `}>
                                            {shift.shift === 'FULL' ? 'Full' : (shift.shift === 'MORNING' ? 'Sáng' : 'Chiều')}
                                        </div>
                                    )}

                                    {!shift && swap && (
                                        <div className="bg-purple-100 text-purple-700 text-[10px] px-1 py-0.5 rounded font-bold animate-pulse truncate">
                                            🎁 {swap.shift === 'FULL' ? 'Full' : (swap.shift === 'MORNING' ? 'Sáng' : 'Chiều')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Modal Logic */}
            {selectedDate && (() => {
                const shift = getShiftForDate(selectedDate);
                const swap = getSwapForDate(selectedDate);
                const dateStr = selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="p-6">
                                <h3 className="text-lg font-bold mb-1">Đăng ký lịch làm</h3>
                                <p className="text-muted-foreground mb-4">{dateStr}</p>

                                {shift ? (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-md border text-center">
                                            Bạn đã đăng ký: <span className="font-bold">{shift.shift}</span>
                                            {shift.isOpenForSwap && <div className="text-emerald-600 font-bold text-sm mt-1">🔄 Đang treo trên chợ</div>}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                variant={shift.isOpenForSwap ? "secondary" : "default"} 
                                                className={shift.isOpenForSwap ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-blue-600 hover:bg-blue-700"}
                                                onClick={async () => {
                                                    if(confirm(shift.isOpenForSwap ? "Gỡ khỏi chợ?" : "Đăng lên chợ đổi ca?")) {
                                                        await toggleShiftSwap(shift.id, !shift.isOpenForSwap);
                                                        router.refresh();
                                                        setSelectedDate(null);
                                                    }
                                                }}
                                            >
                                                {shift.isOpenForSwap ? "Gỡ bài" : "🔄 Pass Ca"}
                                            </Button>
                                            <Button variant="destructive" onClick={() => handleCancel(shift.id)}>
                                                Hủy đăng ký
                                            </Button>
                                        </div>
                                    </div>
                                ) : swap ? (
                                    <div className="space-y-4 text-center">
                                         <div className="p-4 bg-purple-50 rounded-md border border-purple-200">
                                            <div className="text-sm text-purple-800 mb-1">Ca của <b>{swap.user?.name}</b> đang pass lại:</div>
                                            <div className="text-xl font-bold text-purple-900">{swap.shift}</div>
                                        </div>
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={async () => {
                                            if(confirm("Chốt nhận ca này nhé?")) {
                                                await takeShift(swap.id);
                                                router.refresh(); // Refresh to update My Shift
                                                setSelectedDate(null);
                                            }
                                        }}>
                                            ✅ Nhận Kèo Ngay
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {SHIFTS.map(s => (
                                            <Button 
                                                key={s.value} 
                                                onClick={() => handleRegister(s.value)} 
                                                disabled={isSubmitting}
                                                className="justify-start h-auto py-3"
                                                variant="outline"
                                            >
                                                <div className="flex flex-col items-start">
                                                    <span className="font-semibold">{s.label}</span>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                             </div>
                             <div className="p-4 bg-gray-50 flex justify-end">
                                 <Button variant="ghost" onClick={() => setSelectedDate(null)}>Đóng</Button>
                             </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
