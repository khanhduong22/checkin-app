import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Trash2, Calendar as CalendarIcon, Users, RefreshCw } from "lucide-react";
import { useRouter } from "@/lib/router";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api-client";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const SHIFTS = [
  { value: "MORNING", label: "Sáng (8:30 - 12:00)" },
  { value: "AFTERNOON", label: "Chiều (13:30 - 17:30)" },
  { value: "FULL", label: "Cả ngày (8:30 - 17:30)" },
];

function formatShiftLabel(type?: string): string {
  if (type === "MORNING") return "Sáng";
  if (type === "AFTERNOON") return "Chiều";
  if (type === "FULL") return "Cả ngày";
  return type || "Ca trực";
}

interface ScheduleClientProps {
  shifts: any[];
  currentUserId?: string;
  viewDate?: Date;
  onMonthChange?: (date: Date) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function ScheduleClient({
  shifts = [],
  currentUserId,
  viewDate = new Date(),
  onMonthChange,
  onRefresh,
  isLoading = false,
}: ScheduleClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayIndex = firstDay.getDay();

  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) calendarCells.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push(new Date(year, month, i));

  const safeShifts = Array.isArray(shifts) ? shifts : [];

  const getShiftsForDate = (date: Date) => {
    return safeShifts.filter((s) => {
      if (!s) return false;
      const rawDate = s.start || s.date;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
  };

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    if (onMonthChange) onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (onMonthChange) onMonthChange(next);
  };

  const handleRegister = async (shiftValue: string) => {
    if (!selectedDate) return;
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/staff/schedule/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          dateStr: selectedDate.toISOString(),
          shift: shiftValue,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Đăng ký ca làm thành công!");
        setSelectedDate(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(json.error || "Không thể đăng ký ca");
      }
    } catch {
      toast.error("Lỗi kết nối khi đăng ký");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelShift = async (shiftId: number | string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy ca làm việc này?")) return;
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch("/api/staff/schedule/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ shiftId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã hủy ca làm việc.");
        setSelectedDate(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(json.error || "Không thể hủy ca");
      }
    } catch {
      toast.error("Lỗi kết nối khi hủy ca");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected date shifts
  const selectedDateShifts = selectedDate ? getShiftsForDate(selectedDate) : [];
  const selectedMyShift = selectedDateShifts.find(
    (s) => s.userId === currentUserId || s.user?.id === currentUserId
  );
  const selectedOtherShifts = selectedDateShifts.filter(
    (s) => s.userId !== currentUserId && s.user?.id !== currentUserId
  );

  return (
    <div className="space-y-3">
      {/* Header with Back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="h-8 w-8 rounded-full hover:bg-orange-100 text-stone-700 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-stone-900 tracking-tight">
            Lịch Làm Việc & Ca Trực
          </h1>
        </div>

        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 w-7 rounded-full text-stone-500 hover:text-amber-800"
            title="Làm mới lịch trực"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {/* Calendar Card */}
      <Card className="rounded-2xl shadow-xs border border-orange-100/90 overflow-hidden bg-white/95">
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-3 bg-orange-50/60 border-b border-orange-100/70">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-7 w-7 p-0 rounded-lg hover:bg-orange-100 text-stone-700 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-xs font-bold text-stone-900 tracking-tight">
            Tháng {month + 1} / {year}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-7 w-7 p-0 rounded-lg hover:bg-orange-100 text-stone-700 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-2 sm:p-3">
          {/* Days of week header */}
          <div className="grid grid-cols-7 mb-1.5 text-center text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            {DAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((date, idx) => {
              if (!date)
                return (
                  <div
                    key={idx}
                    className="min-h-14 bg-stone-50/40 rounded-xl border border-transparent"
                  />
                );

              const dateShifts = getShiftsForDate(date);
              const isToday = new Date().toDateString() === date.toDateString();
              const myShift = dateShifts.find(
                (s) => s.userId === currentUserId || s.user?.id === currentUserId
              );
              const otherShifts = dateShifts.filter(
                (s) => s.userId !== currentUserId && s.user?.id !== currentUserId
              );

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-14 p-1 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    isToday
                      ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/50"
                      : myShift
                      ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300"
                      : "bg-[#fdfbf9] border-orange-50 hover:bg-orange-50/50 hover:border-orange-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-[10px] ${
                        isToday
                          ? "bg-amber-500 text-white font-bold"
                          : myShift
                          ? "text-emerald-900 font-bold"
                          : "text-stone-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dateShifts.some((s) => s.isOpenForSwap) && (
                      <span className="text-[9px]" title="Có kèo pass ca">
                        🎁
                      </span>
                    )}
                  </div>

                  {/* Shift Tags */}
                  <div className="space-y-0.5 mt-0.5 overflow-hidden">
                    {myShift && (
                      <div className="bg-emerald-600 text-white text-[8px] px-1 py-0.2 rounded font-semibold truncate text-center">
                        {formatShiftLabel(myShift.shiftType || myShift.shift)}
                      </div>
                    )}
                    {otherShifts.length > 0 && (
                      <div className="text-[8px] text-stone-500 bg-stone-100/90 px-1 py-0.2 rounded truncate text-center">
                        +{otherShifts.length} bạn
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Date Detail / Registration Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-3.5 animate-in zoom-in-95 duration-150 border border-orange-100">
            {/* Modal Header */}
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Lịch chi tiết
              </span>
              <h3 className="text-sm font-bold text-stone-900">
                {selectedDate.toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
            </div>

            {/* If Current User Has Shift on this date */}
            {selectedMyShift ? (
              <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Ca của bạn: {formatShiftLabel(selectedMyShift.shiftType || selectedMyShift.shift)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold">
                    Đã xếp ca
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {selectedMyShift.start
                      ? `${new Date(selectedMyShift.start).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} - ${new Date(selectedMyShift.end).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Theo quy định ca"}
                  </span>
                </div>

                <div className="pt-1.5 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleCancelShift(selectedMyShift.id)}
                    className="flex-1 text-xs h-8 cursor-pointer rounded-xl bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Hủy ca này
                  </Button>
                </div>
              </div>
            ) : (
              /* If No Shift Registered: Registration options */
              <div className="space-y-2">
                <p className="text-xs text-stone-600 font-medium">
                  Chọn khung giờ bạn muốn đăng ký trực:
                </p>
                <div className="space-y-1.5">
                  {SHIFTS.map((s) => (
                    <Button
                      key={s.value}
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleRegister(s.value)}
                      className="w-full justify-start text-xs h-10 rounded-xl border-orange-100 hover:border-amber-400 hover:bg-amber-50/70 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                      <span className="font-bold text-stone-800">{s.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* List of Other Colleagues Working this Day */}
            {selectedOtherShifts.length > 0 && (
              <div className="pt-2 border-t border-orange-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span>Đồng nghiệp cùng trực ({selectedOtherShifts.length}):</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {selectedOtherShifts.map((os) => (
                    <div
                      key={os.id}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-stone-50 border border-stone-100"
                    >
                      <span className="font-semibold text-stone-800">
                        {os.user?.name || "Đồng nghiệp"}
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">
                        {formatShiftLabel(os.shiftType || os.shift)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Modal Button */}
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="text-xs h-8 rounded-xl text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
