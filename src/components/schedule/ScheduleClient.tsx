'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registerShift, cancelShift } from "@/app/actions/shift";
import { useRouter } from "next/navigation";

// Helpers
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SHIFTS = [
    { value: 'MORNING', label: 'Sáng (8:30 - 12:00)' },
    { value: 'AFTERNOON', label: 'Chiều (13:30 - 17:30)' },
    { value: 'FULL', label: 'Cả ngày' }
];

export default function ScheduleClient({ shifts }: { shifts: any[] }) {
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
                            const isToday = new Date().toDateString() === date.toDateString();
                            const isPast = date < new Date() && !isToday;

                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedDate(date)}
                                    className={`
                                        h-24 p-2 border rounded-md flex flex-col justify-between cursor-pointer transition-colors relative
                                        ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-300'}
                                        ${shift ? (shift.shift === 'FULL' ? 'bg-emerald-50' : 'bg-orange-50') : ''}
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
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Modal Logic */}
            {selectedDate && (() => {
                const shift = getShiftForDate(selectedDate);
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
                                        </div>
                                        <Button variant="destructive" className="w-full" onClick={() => handleCancel(shift.id)}>
                                            Hủy đăng ký
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
