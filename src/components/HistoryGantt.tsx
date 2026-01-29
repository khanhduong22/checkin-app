'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { Button } from "./ui/button";

type CheckInRaw = {
    id: number;
    type: string;
    timestamp: Date | string;
};

type Session = {
    start: Date;
    end: Date | null;
    duration: number; // hours
};

type DailyData = {
    date: Date;
    sessions: Session[];
    totalHours: number;
};

function getDaysInMonth(year: number, month: number) {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}

export default function HistoryGantt({ checkins }: { checkins: CheckInRaw[] }) {
    const [viewMonth, setViewMonth] = useState(new Date());

    const processedData = useMemo(() => {
        const daysMap = new Map<string, DailyData>();
        
        // Initialize days for the current view month
        const daysInMonth = getDaysInMonth(viewMonth.getFullYear(), viewMonth.getMonth());
        daysInMonth.forEach(d => {
            const key = d.toLocaleDateString('vi-VN');
            daysMap.set(key, { date: d, sessions: [], totalHours: 0 });
        });

        // Group checkins by day (Filter by month first)
        // Note: checkins coming in might be strings from serialized props
        const sortedCheckins = [...checkins]
             .map(c => ({...c, timestamp: new Date(c.timestamp)}))
             .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        sortedCheckins.forEach(c => {
            const key = c.timestamp.toLocaleDateString('vi-VN');
            if (!daysMap.has(key)) return; // Skip if not in view month (or expand view)

            const dayData = daysMap.get(key)!;
            const lastSession = dayData.sessions[dayData.sessions.length - 1];

            if (c.type === 'checkin') {
                // New session
                dayData.sessions.push({ start: c.timestamp, end: null, duration: 0 });
            } else if (c.type === 'checkout' && lastSession && !lastSession.end) {
                // Close session
                lastSession.end = c.timestamp;
                lastSession.duration = (lastSession.end.getTime() - lastSession.start.getTime()) / (1000 * 60 * 60);
                dayData.totalHours += lastSession.duration;
            }
        });

        return Array.from(daysMap.values()).reverse(); // Newest days top
    }, [checkins, viewMonth]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewMonth(newDate);
    };

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-base font-medium">Biểu đồ làm việc tháng {viewMonth.getMonth() + 1}/{viewMonth.getFullYear()}</CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>←</Button>
                    <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>→</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    {/* Time Scale Header */}
                    <div className="flex text-[10px] text-muted-foreground pb-2 border-b pl-[80px]">
                        <div className="flex-1 relative h-4">
                            {[6, 9, 12, 15, 18, 21].map(h => (
                                <div key={h} className="absolute top-0 -translate-x-1/2" style={{ left: `${(h/24)*100}%` }}>
                                    {h}h
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Days Rows */}
                    {processedData.map((day) => {
                         const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                         // Highlight Today
                         const isToday = new Date().toDateString() === day.date.toDateString();
                         
                         return (
                            <div key={day.date.toISOString()} className={`flex items-center h-10 hover:bg-muted/50 rounded-sm group ${isWeekend ? 'bg-muted/20' : ''}`}>
                                {/* Date Label */}
                                <div className="w-[80px] text-xs px-2 flex flex-col justify-center border-r shrink-0">
                                    <span className={`font-semibold ${isToday ? 'text-primary' : ''}`}>
                                        {day.date.getDate()}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase">
                                        {day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                                    </span>
                                </div>

                                {/* Gantt Bar Area (0h - 24h) */}
                                <div className="flex-1 relative h-full mx-2">
                                     {/* Background Grid Lines */}
                                     {[6, 12, 18].map(h => (
                                        <div key={h} className="absolute top-0 bottom-0 border-l border-dashed border-muted-foreground/10" style={{ left: `${(h/24)*100}%` }} />
                                     ))}

                                     {/* Sessions */}
                                     {day.sessions.map((session, i) => {
                                        const startH = session.start.getHours() + session.start.getMinutes()/60;
                                        const endH = session.end 
                                            ? session.end.getHours() + session.end.getMinutes()/60 
                                            : (isToday ? new Date().getHours() + new Date().getMinutes()/60 : startH + 0.5); // If running, extend to Now, else +30m dot

                                        const left = (startH / 24) * 100;
                                        const width = Math.max(((endH - startH) / 24) * 100, 0.5); // Min width
                                        
                                        const isRunning = !session.end; 

                                        return (
                                            <div 
                                                key={i}
                                                className={`absolute top-2 bottom-2 rounded-md shadow-sm text-[10px] flex items-center justify-center text-white overflow-hidden transition-all duration-300
                                                    ${isRunning ? 'bg-orange-400 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}
                                                `}
                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                title={`${session.start.toLocaleTimeString()} - ${session.end?.toLocaleTimeString() || 'Đang làm'}`}
                                            >
                                                {width > 5 && (session.duration.toFixed(1) + 'h')}
                                            </div>
                                        )
                                     })}
                                </div>
                                <div className="w-[50px] text-right text-xs pr-2 font-mono text-muted-foreground shrink-0">
                                    {day.totalHours > 0 && day.totalHours.toFixed(1) + 'h'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
