import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Trash2, RefreshCw } from "lucide-react";
import { useRouter } from "@/lib/router";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api-client";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAY_NAMES = [
  { short: "T2", full: "Thứ Hai", color: "bg-blue-600 text-white shadow-blue-500/25" },
  { short: "T3", full: "Thứ Ba", color: "bg-purple-600 text-white shadow-purple-500/25" },
  { short: "T4", full: "Thứ Tư", color: "bg-teal-600 text-white shadow-teal-500/25" },
  { short: "T5", full: "Thứ Năm", color: "bg-orange-500 text-white shadow-orange-500/25" },
  { short: "T6", full: "Thứ Sáu", color: "bg-indigo-600 text-white shadow-indigo-500/25" },
  { short: "T7", full: "Thứ Bảy", color: "bg-pink-600 text-white shadow-pink-500/25" },
  { short: "CN", full: "Chủ Nhật", color: "bg-red-600 text-white shadow-red-500/25" },
];

const START_HOURS = Array.from({ length: 10 }, (_, i) => String(i + 8).padStart(2, "0")); // 08..17
const END_HOURS = Array.from({ length: 11 }, (_, i) => String(i + 11).padStart(2, "0")); // 11..21
const MINUTES = ["00", "15", "30", "45"];

const MORNING_PRESETS = [
  { label: "8h - 12h", sH: "08", sM: "00", eH: "12", eM: "00" },
  { label: "8h - 14h", sH: "08", sM: "00", eH: "14", eM: "00" },
  { label: "8h - 15h", sH: "08", sM: "00", eH: "15", eM: "00" },
  { label: "9h - 14h", sH: "09", sM: "00", eH: "14", eM: "00" },
  { label: "10h - 14h30", sH: "10", sM: "00", eH: "14", eM: "30" },
];

const AFTERNOON_PRESETS = [
  { label: "12h - 16h30", sH: "12", sM: "00", eH: "16", eM: "30" },
  { label: "12h - 17h", sH: "12", sM: "00", eH: "17", eM: "00" },
  { label: "12h30 - 17h", sH: "12", sM: "30", eH: "17", eM: "00" },
  { label: "13h - 17h", sH: "13", sM: "00", eH: "17", eM: "00" },
];

function formatShiftLabel(type?: string, start?: string, end?: string): string {
  if (type === "MORNING") return "Sáng (8:30 - 12:00)";
  if (type === "AFTERNOON") return "Chiều (13:30 - 17:30)";
  if (type === "FULL") return "Cả ngày (8:30 - 17:30)";
  if (start && end) {
    const s = new Date(start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const e = new Date(end).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return `${s} - ${e}`;
  }
  return type || "Ca tự do";
}

function calculateDuration(s: string, e: string): string | null {
  if (!s || !e) return null;
  const [sH, sM] = s.split(":").map(Number);
  const [eH, eM] = e.split(":").map(Number);
  const totalMinutes = eH * 60 + eM - (sH * 60 + sM);
  if (isNaN(totalMinutes) || totalMinutes <= 0) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h} tiếng`;
  return `${h} tiếng ${m} phút`;
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
  const [startHour, setStartHour] = useState("08");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("12");
  const [endMinute, setEndMinute] = useState("00");
  const [activePreset, setActivePreset] = useState<string | null>("8h - 12h");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTime = `${startHour}:${startMinute}`;
  const endTime = `${endHour}:${endMinute}`;

  const applyTimeRange = (sh: string, sm: string, eh: string, em: string, preset: string | null) => {
    setStartHour(sh);
    setStartMinute(sm);
    setEndHour(eh);
    setEndMinute(em);
    setActivePreset(preset);
  };

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(viewDate || new Date()));

  useEffect(() => {
    if (viewDate) {
      setWeekStart(getMonday(viewDate));
    }
  }, [viewDate]);

  // 7 days of the week starting from Monday (T2) down to Sunday (CN)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = weekDays[6];
  const isCurrentWeek = getMonday(new Date()).toDateString() === weekStart.toDateString();

  const safeShifts = Array.isArray(shifts) ? shifts : [];

  // Strict privacy: Staff only sees their own registered shifts
  const getMyShiftsForDate = (date: Date) => {
    return safeShifts.filter((s) => {
      if (!s) return false;
      if (s.userId !== currentUserId && s.user?.id !== currentUserId) return false;
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

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
    if (onMonthChange && prev.getMonth() !== weekStart.getMonth()) {
      onMonthChange(prev);
    }
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
    if (onMonthChange && next.getMonth() !== weekStart.getMonth()) {
      onMonthChange(next);
    }
  };

  const handleTodayWeek = () => {
    const todayMonday = getMonday(new Date());
    setWeekStart(todayMonday);
    if (onMonthChange && todayMonday.getMonth() !== weekStart.getMonth()) {
      onMonthChange(todayMonday);
    }
  };

  const handleOpenDate = (date: Date) => {
    setSelectedDate(date);
    applyTimeRange("08", "00", "12", "00", "8h - 12h");
    setShowAddForm(false);
  };

  const handleRegister = async () => {
    if (!selectedDate) return;
    if (!startTime || !endTime) {
      toast.error("Vui lòng chọn giờ bắt đầu và kết thúc");
      return;
    }
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    if (eH * 60 + eM <= sH * 60 + sM) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu!");
      return;
    }

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
          startTime,
          endTime,
          shift: activePreset || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Đăng ký giờ làm thành công!");
        setShowAddForm(false);
        if (onRefresh) onRefresh();
      } else {
        toast.error(json.error || "Không thể đăng ký ca làm");
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

  // Selected date shifts (only for current user)
  const selectedMyShifts = selectedDate ? getMyShiftsForDate(selectedDate) : [];
  const durationText = calculateDuration(startTime, endTime);

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

      {/* Weekly Vertical Schedule Card */}
      <Card className="rounded-3xl shadow-sm border border-orange-100/90 dark:border-stone-800 overflow-hidden bg-white/95 dark:bg-stone-900/90 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-3.5 bg-orange-50/70 dark:bg-stone-800/60 border-b border-orange-100/70 dark:border-stone-800">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevWeek}
              className="h-8 w-8 p-0 rounded-xl hover:bg-orange-100 text-stone-700 dark:text-stone-300 cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextWeek}
              className="h-8 w-8 p-0 rounded-xl hover:bg-orange-100 text-stone-700 dark:text-stone-300 cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center">
            <CardTitle className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {weekStart.getDate()}/{weekStart.getMonth() + 1} - {weekEnd.getDate()}/{weekEnd.getMonth() + 1}/{weekEnd.getFullYear()}
            </CardTitle>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
              Thứ 2 ➔ Chủ Nhật
            </span>
          </div>

          {!isCurrentWeek ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTodayWeek}
              className="h-7 text-[11px] px-2.5 rounded-xl border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-100/50 cursor-pointer"
            >
              Tuần này
            </Button>
          ) : (
            <div className="w-14 text-right">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                Hiện tại
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-2.5 sm:p-3 space-y-2">
          {weekDays.map((d, idx) => {
            const dayInfo = DAY_NAMES[idx];
            const myShifts = getMyShiftsForDate(d);
            const isToday = new Date().toDateString() === d.toDateString();
            const hasShift = myShifts.length > 0;

            return (
              <div
                key={d.toISOString()}
                onClick={() => handleOpenDate(d)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.99] flex items-center justify-between gap-3 ${
                  isToday
                    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-400/80 dark:border-amber-700/80 ring-1 ring-amber-400/40 shadow-xs"
                    : hasShift
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/90 dark:border-emerald-800/80 hover:border-emerald-300"
                    : "bg-[#fdfbf9] dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-50/80 dark:hover:bg-stone-800/50"
                }`}
              >
                {/* Left: Day info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-xs transition-transform active:scale-95 ${
                      dayInfo.color
                    } ${
                      isToday
                        ? "ring-2 ring-offset-2 ring-amber-400 dark:ring-offset-stone-900"
                        : ""
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                      {d.getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                        {dayInfo.full}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500">
                        ({dayInfo.short})
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-tight">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    {!hasShift && (
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 italic mt-0.5">
                        Chưa đăng ký ca
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Shifts list or Register action */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {hasShift ? (
                    <div className="flex flex-col items-end gap-1">
                      {myShifts.map((s, sIdx) => {
                        const shiftText = s.start && s.end
                          ? `${new Date(s.start).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${new Date(s.end).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : formatShiftLabel(s.shiftType || s.shift);
                        return (
                          <div
                            key={s.id || sIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-2xs"
                          >
                            <Clock className="w-3 h-3 text-emerald-200" />
                            <span>{shiftText}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold px-3 rounded-xl border-amber-300 dark:border-amber-700/80 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/60 cursor-pointer shadow-2xs"
                    >
                      + Đăng ký ca
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Date Detail / Registration Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-3.5 animate-in zoom-in-95 duration-150 border border-orange-100 max-h-[90vh] overflow-y-auto">
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

            {/* List of User's Registered Shifts on this Date */}
            {selectedMyShifts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">
                    Ca làm của bạn ({selectedMyShifts.length}):
                  </span>
                  {!showAddForm && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                      className="text-[11px] h-7 px-2 text-amber-700 hover:bg-amber-50 cursor-pointer font-semibold"
                    >
                      + Thêm ca khác
                    </Button>
                  )}
                </div>

                {selectedMyShifts.map((myShift) => (
                  <div
                    key={myShift.id}
                    className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">
                        {myShift.start && myShift.end
                          ? `${new Date(myShift.start).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${new Date(myShift.end).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : formatShiftLabel(myShift.shiftType || myShift.shift)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-semibold">
                        Đã xếp ca
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {myShift.start && myShift.end
                          ? `Thời lượng: ${
                              calculateDuration(
                                new Date(myShift.start).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Ho_Chi_Minh",
                                }),
                                new Date(myShift.end).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Ho_Chi_Minh",
                                })
                              ) || "Linh hoạt"
                            }`
                          : "Theo quy định ca"}
                      </span>
                    </div>

                    <div className="pt-1 flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleCancelShift(myShift.id)}
                        className="flex-1 text-xs h-8 cursor-pointer rounded-xl bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Hủy ca này
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Flexible Time Registration Form */}
            {(selectedMyShifts.length === 0 || showAddForm) && (
              <div className="space-y-3 pt-1 border-t border-orange-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-stone-700 font-bold">
                    {selectedMyShifts.length > 0 ? "Đăng ký thêm giờ làm:" : "Đăng ký giờ làm tự do:"}
                  </p>
                  {showAddForm && selectedMyShifts.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      className="text-[10px] h-6 px-1.5 text-stone-500"
                    >
                      Thu gọn
                    </Button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Gợi ý ca làm nhanh:
                  </span>

                  {/* Ca sáng */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      ☀️ Ca sáng:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {MORNING_PRESETS.map((p) => {
                        const isSelected = activePreset === p.label;
                        return (
                          <Button
                            key={p.label}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyTimeRange(p.sH, p.sM, p.eH, p.eM, p.label)}
                            className={`h-8 px-2.5 text-[11px] rounded-xl cursor-pointer ${
                              isSelected
                                ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                : "border-stone-200 text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            {p.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ca chiều */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      🌙 Ca chiều:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {AFTERNOON_PRESETS.map((p) => {
                        const isSelected = activePreset === p.label;
                        return (
                          <Button
                            key={p.label}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => applyTimeRange(p.sH, p.sM, p.eH, p.eM, p.label)}
                            className={`h-8 px-2.5 text-[11px] rounded-xl cursor-pointer ${
                              isSelected
                                ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                : "border-stone-200 text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            {p.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Free Custom Hours Inputs */}
                <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">
                        Bắt đầu (8h - 17h):
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          value={startHour}
                          onChange={(e) => {
                            setStartHour(e.target.value);
                            setActivePreset(null);
                          }}
                          className="h-9 flex-1 text-xs font-semibold bg-white rounded-xl border border-stone-200 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer text-stone-800"
                        >
                          {START_HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </select>
                        <span className="text-xs font-bold text-stone-400">:</span>
                        <select
                          value={startMinute}
                          onChange={(e) => {
                            setStartMinute(e.target.value);
                            setActivePreset(null);
                          }}
                          className="h-9 flex-1 text-xs font-semibold bg-white rounded-xl border border-stone-200 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer text-stone-800"
                        >
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}p
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-1">
                        Kết thúc (11h - 21h):
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          value={endHour}
                          onChange={(e) => {
                            setEndHour(e.target.value);
                            setActivePreset(null);
                          }}
                          className="h-9 flex-1 text-xs font-semibold bg-white rounded-xl border border-stone-200 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer text-stone-800"
                        >
                          {END_HOURS.map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </select>
                        <span className="text-xs font-bold text-stone-400">:</span>
                        <select
                          value={endMinute}
                          onChange={(e) => {
                            setEndMinute(e.target.value);
                            setActivePreset(null);
                          }}
                          className="h-9 flex-1 text-xs font-semibold bg-white rounded-xl border border-stone-200 px-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer text-stone-800"
                        >
                          {MINUTES.map((m) => (
                            <option key={m} value={m}>
                              {m}p
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {durationText && (
                    <div className="text-[11px] text-amber-800 font-bold flex items-center justify-between px-1">
                      <span>⏱️ Thời lượng:</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        {durationText}
                      </span>
                    </div>
                  )}

                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRegister}
                    className="w-full h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? "Đang lưu..." : "Xác nhận đăng ký giờ làm"}
                  </Button>
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
