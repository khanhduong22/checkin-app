import React, { useState } from "react";
import useSWR from "swr";
import {
  Calendar as CalendarIcon,
  Columns3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sun,
  Sunset,
  Moon,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useAdminData";
import { api, swrFetcher } from "@/lib/api";
import { toast } from "sonner";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import UploadScheduleButton from "@/components/schedule/UploadScheduleButton";
import ShiftHistoryDialog from "@/components/admin/ShiftHistoryDialog";

interface ShiftAssignment {
  id: string | number;
  name: string;
  department: string;
  role: string;
  start: string;
  end: string;
  userId: string;
}

interface DaySchedule {
  dayName: string;
  dateStr: string;
  fullDateStr: string;
  isToday: boolean;
  shifts: {
    morning: ShiftAssignment[];
    afternoon: ShiftAssignment[];
    evening: ShiftAssignment[];
  };
}

const DAY_NAMES = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateToDM(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${month}`;
}

export function SchedulePage() {
  const [viewMode, setViewMode] = useState<"visual" | "columns">("visual");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYMD(new Date()));
  const [shiftPreset, setShiftPreset] = useState<string>("MORNING");
  const [submitting, setSubmitting] = useState(false);

  const { employees } = useEmployees();

  // Fetch all shifts
  const { data: scheduleData, mutate, isLoading } = useSWR<any>(
    "/api/admin/schedule",
    swrFetcher,
    { revalidateOnFocus: true }
  );

  const { data: meData } = useSWR<any>("/api/me", swrFetcher);
  const currentUser = meData?.data || meData;

  const events = Array.isArray(scheduleData)
    ? scheduleData
    : Array.isArray(scheduleData?.data)
    ? scheduleData.data
    : [];

  // Data preparation for Column view
  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const todayStr = formatDateToYMD(new Date());

  const columnScheduleData: DaySchedule[] = weekDays.map((dateObj, i) => {
    const dateStr = formatDateToDM(dateObj);
    const fullDateStr = formatDateToYMD(dateObj);
    const isToday = fullDateStr === todayStr;

    const dayShifts = events.filter((s: any) => {
      const shiftDate = new Date(s.start);
      const shiftDateStr = shiftDate.toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      return shiftDateStr === fullDateStr;
    });

    const morning: ShiftAssignment[] = [];
    const afternoon: ShiftAssignment[] = [];
    const evening: ShiftAssignment[] = [];

    for (const s of dayShifts) {
      const startDate = new Date(s.start);
      const hour = parseInt(
        startDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        }),
        10
      );

      const assignment: ShiftAssignment = {
        id: s.id,
        name: s.user?.name || s.title || "Nhân sự",
        department: s.user?.department || (s.shiftType ? `Ca ${s.shiftType}` : "Trực ca"),
        role: s.user?.role === "ADMIN" ? "Quản lý" : "Nhân viên",
        start: s.start,
        end: s.end,
        userId: s.userId,
      };

      if (hour < 12) {
        morning.push(assignment);
      } else if (hour < 17) {
        afternoon.push(assignment);
      } else {
        evening.push(assignment);
      }
    }

    return {
      dayName: DAY_NAMES[i],
      dateStr,
      fullDateStr,
      isToday,
      shifts: {
        morning,
        afternoon,
        evening,
      },
    };
  });

  const formatTime = (d: string | Date | null) => {
    if (!d) return "--:--";
    return new Date(d).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const handlePrevWeek = () => {
    setCurrentDate((prev) => new Date(prev.getTime() - 7 * 24 * 3600 * 1000));
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => new Date(prev.getTime() + 7 * 24 * 3600 * 1000));
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    if (!selectedDate) {
      toast.error("Vui lòng chọn ngày");
      return;
    }

    setSubmitting(true);
    try {
      let startHour = 8;
      let startMin = 0;
      let endHour = 12;
      let endMin = 0;

      if (shiftPreset === "AFTERNOON") {
        startHour = 13;
        startMin = 0;
        endHour = 17;
        endMin = 0;
      } else if (shiftPreset === "EVENING") {
        startHour = 17;
        startMin = 30;
        endHour = 21;
        endMin = 30;
      } else if (shiftPreset === "FULL") {
        startHour = 8;
        startMin = 30;
        endHour = 17;
        endMin = 30;
      }

      const start = new Date(
        `${selectedDate}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00+07:00`
      ).toISOString();
      const end = new Date(
        `${selectedDate}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00+07:00`
      ).toISOString();

      await api.post("/api/admin/schedule", {
        userId: selectedUserId,
        start,
        end,
        shiftType: shiftPreset,
      });

      toast.success("Đã thêm ca trực thành công!");
      setIsAddOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err?.message || "Không thể tạo ca trực");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (shiftId: string | number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ca trực này?")) return;
    try {
      await api.delete(`/api/admin/schedule/${shiftId}`);
      toast.success("Đã xóa ca trực!");
      mutate();
    } catch (err: any) {
      toast.error(err?.message || "Không thể xóa ca trực");
    }
  };

  const sunday = weekDays[6];
  const weekRangeStr = `${formatDateToDM(monday)}/${monday.getFullYear()} - ${formatDateToDM(sunday)}/${sunday.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-emerald-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-emerald-600" />
            Quản lý Lịch làm việc
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem, quản lý và tải lên file Excel lịch làm hàng tuần.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === "visual"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Lịch trực quan (Lịch cũ)
            </button>
            <button
              type="button"
              onClick={() => setViewMode("columns")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === "columns"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Dạng cột tuần
            </button>
          </div>

          <ShiftHistoryDialog />
          <UploadScheduleButton onSuccess={mutate} />
        </div>
      </div>

      {/* Main Body */}
      {viewMode === "visual" ? (
        <ScheduleCalendar
          initialEvents={events}
          userId={currentUser?.id || "admin"}
          isAdmin={true}
          users={employees}
          onEventsChange={mutate}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCurrentWeek}>
                Tuần hiện tại
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-gray-700 ml-2">
                {weekRangeStr}
              </span>
            </div>

            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
            >
              <Plus className="h-4 w-4" />
              Thêm ca trực
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {columnScheduleData.map((day, idx) => (
              <Card
                key={idx}
                className={`overflow-hidden border flex flex-col ${
                  day.isToday
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "border-gray-200 shadow-xs"
                }`}
              >
                <div
                  className={`p-3 text-center border-b ${
                    day.isToday
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-50 text-gray-800"
                  }`}
                >
                  <span className="text-xs uppercase font-bold tracking-wider block opacity-90">
                    {day.dayName}
                  </span>
                  <span className="text-lg font-extrabold mt-0.5 block">
                    {day.dateStr}
                  </span>
                </div>

                <div className="p-2 flex-1 space-y-3 bg-white min-h-[300px]">
                  {/* Morning */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
                      <Sun className="h-3 w-3 text-amber-500" /> Ca Sáng
                    </span>
                    {day.shifts.morning.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic p-1 bg-gray-50 rounded text-center">
                        Trống
                      </div>
                    ) : (
                      day.shifts.morning.map((s) => (
                        <div
                          key={s.id}
                          className="p-1.5 bg-amber-50/70 border border-amber-200 rounded text-xs flex justify-between items-start group"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(s.start)} - {formatTime(s.end)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(s.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Afternoon */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-blue-700 uppercase flex items-center gap-1">
                      <Sunset className="h-3 w-3 text-blue-500" /> Ca Chiều
                    </span>
                    {day.shifts.afternoon.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic p-1 bg-gray-50 rounded text-center">
                        Trống
                      </div>
                    ) : (
                      day.shifts.afternoon.map((s) => (
                        <div
                          key={s.id}
                          className="p-1.5 bg-blue-50/70 border border-blue-200 rounded text-xs flex justify-between items-start group"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(s.start)} - {formatTime(s.end)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(s.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Evening */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1">
                      <Moon className="h-3 w-3 text-purple-500" /> Ca Tối
                    </span>
                    {day.shifts.evening.length === 0 ? (
                      <div className="text-[10px] text-gray-400 italic p-1 bg-gray-50 rounded text-center">
                        Trống
                      </div>
                    ) : (
                      day.shifts.evening.map((s) => (
                        <div
                          key={s.id}
                          className="p-1.5 bg-purple-50/70 border border-purple-200 rounded text-xs flex justify-between items-start group"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTime(s.start)} - {formatTime(s.end)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(s.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Shift Dialog for Columns Mode */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thêm Ca Trực Thủ Công</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateShift} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Chọn nhân sự</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhân viên" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ngày làm việc</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Ca trực</Label>
              <Select value={shiftPreset} onValueChange={setShiftPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khung giờ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MORNING">
                    Ca Sáng (08:00 - 12:00)
                  </SelectItem>
                  <SelectItem value="AFTERNOON">
                    Ca Chiều (13:00 - 17:00)
                  </SelectItem>
                  <SelectItem value="EVENING">
                    Ca Tối (17:30 - 21:30)
                  </SelectItem>
                  <SelectItem value="FULL">
                    Cả ngày (08:30 - 17:30)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? "Đang lưu..." : "Xác nhận tạo ca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SchedulePage;
