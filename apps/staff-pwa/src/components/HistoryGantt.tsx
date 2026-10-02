import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CheckInRaw = {
  id: string | number;
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

export default function HistoryGantt({ checkins = [] }: { checkins: CheckInRaw[] }) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const processedData = useMemo(() => {
    const daysMap = new Map<string, DailyData>();

    const daysInMonth = getDaysInMonth(viewMonth.getFullYear(), viewMonth.getMonth());
    daysInMonth.forEach((d) => {
      const key = d.toLocaleDateString("vi-VN");
      daysMap.set(key, { date: d, sessions: [], totalHours: 0 });
    });

    const sortedCheckins = [...checkins]
      .map((c) => ({ ...c, timestamp: new Date(c.timestamp) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    sortedCheckins.forEach((c) => {
      const key = c.timestamp.toLocaleDateString("vi-VN");
      if (!daysMap.has(key)) return;

      const dayData = daysMap.get(key)!;
      const lastSession = dayData.sessions[dayData.sessions.length - 1];

      if (c.type === "checkin") {
        dayData.sessions.push({ start: c.timestamp, end: null, duration: 0 });
      } else if (c.type === "checkout" && lastSession && !lastSession.end) {
        lastSession.end = c.timestamp;
        lastSession.duration =
          (lastSession.end.getTime() - lastSession.start.getTime()) / (1000 * 60 * 60);
        dayData.totalHours += lastSession.duration;
      }
    });

    return Array.from(daysMap.values()).reverse();
  }, [checkins, viewMonth]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setViewMonth(newDate);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-sm font-bold text-gray-800">
          Biểu đồ làm việc tháng {viewMonth.getMonth() + 1}/{viewMonth.getFullYear()}
        </CardTitle>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(-1)}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeMonth(1)}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            →
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-1">
          {/* Time Scale Header */}
          <div className="flex text-[10px] text-muted-foreground pb-2 border-b pl-[60px]">
            <div className="flex-1 relative h-4">
              {[8, 10, 12, 14, 16, 18, 20].map((h) => (
                <div
                  key={h}
                  className="absolute top-0 -translate-x-1/2 font-mono"
                  style={{ left: `${((h - 7) / 14) * 100}%` }}
                >
                  {h}h
                </div>
              ))}
            </div>
          </div>

          {/* Daily Rows */}
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pt-1">
            {processedData.map((d, i) => {
              const hasWork = d.sessions.length > 0;
              const dateStr = d.date.toLocaleDateString("vi-VN", {
                weekday: "short",
                day: "2-digit",
              });

              return (
                <div key={i} className="flex items-center h-7 py-1">
                  <div className="w-[60px] text-[10px] font-medium text-gray-500 truncate">
                    {dateStr}
                  </div>

                  <div className="flex-1 relative h-4 bg-gray-50 rounded-sm">
                    {d.sessions.map((s, idx) => {
                      const startHour = s.start.getHours() + s.start.getMinutes() / 60;
                      const endHour = s.end
                        ? s.end.getHours() + s.end.getMinutes() / 60
                        : startHour + 1; // provisional 1h

                      const leftPct = Math.max(0, Math.min(100, ((startHour - 7) / 14) * 100));
                      const widthPct = Math.max(
                        3,
                        Math.min(100 - leftPct, ((endHour - startHour) / 14) * 100)
                      );

                      return (
                        <div
                          key={idx}
                          title={`${s.start.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} - ${
                            s.end
                              ? s.end.toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Đang làm"
                          }`}
                          className="absolute top-0.5 bottom-0.5 rounded-sm bg-gradient-to-r from-emerald-500 to-teal-500 shadow-2xs cursor-pointer hover:opacity-90"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="w-[45px] text-right font-mono text-[10px] font-bold text-slate-700 pl-1">
                    {hasWork ? `${d.totalHours.toFixed(1)}h` : "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
