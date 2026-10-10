import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { History, Search, Loader2, Calendar } from "lucide-react";
import { api } from "@/lib/api";

type FilterType = "7_days" | "today" | "this_week" | "last_week" | "custom_date" | "all";

function getVnNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

function getVnDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${vnTime.getFullYear()}-${pad(vnTime.getMonth() + 1)}-${pad(vnTime.getDate())}`;
}

function getVnDateLabel(dateKey: string): { title: string; isToday: boolean; isYesterday: boolean } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const targetDate = new Date(y, m - 1, d);
  const vnNow = getVnNow();
  const pad = (n: number) => n.toString().padStart(2, "0");

  const todayKey = `${vnNow.getFullYear()}-${pad(vnNow.getMonth() + 1)}-${pad(vnNow.getDate())}`;

  const yesterdayDate = new Date(vnNow);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = `${yesterdayDate.getFullYear()}-${pad(yesterdayDate.getMonth() + 1)}-${pad(yesterdayDate.getDate())}`;

  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayOfWeek = daysOfWeek[targetDate.getDay()];
  const formattedDate = `${pad(d)}/${pad(m)}/${y}`;

  const isToday = dateKey === todayKey;
  const isYesterday = dateKey === yesterdayKey;

  if (isToday) {
    return { title: `Hôm nay - ${dayOfWeek}, ${formattedDate}`, isToday: true, isYesterday: false };
  }
  if (isYesterday) {
    return { title: `Hôm qua - ${dayOfWeek}, ${formattedDate}`, isToday: false, isYesterday: true };
  }
  return { title: `${dayOfWeek}, ${formattedDate}`, isToday: false, isYesterday: false };
}

function getDateRange(type: FilterType, customDate?: string): { startDate?: string; endDate?: string } {
  const vnNow = getVnNow();

  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const endOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  switch (type) {
    case "7_days": {
      const start = new Date(vnNow);
      start.setDate(start.getDate() - 6);
      return {
        startDate: startOfDay(start).toISOString(),
        endDate: endOfDay(vnNow).toISOString(),
      };
    }
    case "today": {
      return {
        startDate: startOfDay(vnNow).toISOString(),
        endDate: endOfDay(vnNow).toISOString(),
      };
    }
    case "this_week": {
      const day = vnNow.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(vnNow);
      monday.setDate(monday.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return {
        startDate: startOfDay(monday).toISOString(),
        endDate: endOfDay(sunday).toISOString(),
      };
    }
    case "last_week": {
      const day = vnNow.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(vnNow);
      monday.setDate(monday.getDate() + diffToMonday - 7);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return {
        startDate: startOfDay(monday).toISOString(),
        endDate: endOfDay(sunday).toISOString(),
      };
    }
    case "custom_date": {
      if (!customDate) return {};
      const [y, m, d] = customDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return {
        startDate: startOfDay(date).toISOString(),
        endDate: endOfDay(date).toISOString(),
      };
    }
    case "all":
    default:
      return {};
  }
}

export default function ShiftHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>("7_days");
  const [customDate, setCustomDate] = useState<string>("");

  const fetchLogs = async (
    pageNum: number,
    append = false,
    type: FilterType = filterType,
    cDate: string = customDate
  ) => {
    setLoading(true);
    try {
      const range = getDateRange(type, cDate);
      let url = `/api/admin/schedule/history?page=${pageNum}&pageSize=100`;
      if (range.startDate) url += `&startDate=${encodeURIComponent(range.startDate)}`;
      if (range.endDate) url += `&endDate=${encodeURIComponent(range.endDate)}`;

      const result = await api.get<any>(url);
      const list = result?.logs || result?.data || (Array.isArray(result) ? result : []);
      if (append) {
        setLogs((prev) => [...prev, ...list]);
      } else {
        setLogs(list);
      }
      setHasMore(list.length === 100);
    } catch (e) {
      console.error("Failed to load shift history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPage(1);
      setFilterType("7_days");
      setCustomDate("");
      fetchLogs(1, false, "7_days", "");
    }
  }, [open]);

  const handleFilterChange = (type: FilterType, cDate?: string) => {
    setFilterType(type);
    if (type !== "custom_date") {
      setCustomDate("");
    } else if (cDate) {
      setCustomDate(cDate);
    }
    setPage(1);
    fetchLogs(1, false, type, cDate || (type === "custom_date" ? customDate : ""));
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true, filterType, customDate);
  };

  const formatShiftDateTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayName = days[vnTime.getDay()];
    const day = pad(vnTime.getDate());
    const month = pad(vnTime.getMonth() + 1);
    const hours = pad(vnTime.getHours());
    const minutes = pad(vnTime.getMinutes());

    return `${dayName} ${day}/${month} ${hours}:${minutes}`;
  };

  const formatLogTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(vnTime.getDate());
    const month = pad(vnTime.getMonth() + 1);
    const year = vnTime.getFullYear();
    const hours = pad(vnTime.getHours());
    const minutes = pad(vnTime.getMinutes());

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  };

  const formatTimeOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const vnTime = new Date(utc + 3600000 * 7);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const hours = pad(vnTime.getHours());
    const minutes = pad(vnTime.getMinutes());

    return `${hours}:${minutes}`;
  };

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <Badge className="bg-emerald-100 hover:bg-emerald-100 text-emerald-700 border-emerald-200">
            Thêm mới
          </Badge>
        );
      case "UPDATE":
        return (
          <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-700 border-amber-200">
            Cập nhật
          </Badge>
        );
      case "DELETE":
        return (
          <Badge className="bg-rose-100 hover:bg-rose-100 text-rose-700 border-rose-200">
            Hủy/Xóa
          </Badge>
        );
      case "IMPORT":
        return (
          <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 border-blue-200">
            Import Excel
          </Badge>
        );
      case "TAKE_SWAP":
        return (
          <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 border-purple-200">
            Nhận đổi ca
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatLogDetail = (log: any) => {
    switch (log.action) {
      case "CREATE":
        return (
          <span>
            Gán ca:{" "}
            <span className="font-semibold text-slate-700 dark:text-stone-300">
              {formatShiftDateTime(log.newStart)} -{" "}
              {formatShiftDateTime(log.newEnd).split(" ").slice(2).join(" ")}
            </span>
          </span>
        );
      case "DELETE":
        return (
          <span>
            Hủy ca:{" "}
            <span className="font-semibold text-rose-700 dark:text-rose-400 line-through">
              {formatShiftDateTime(log.oldStart)} -{" "}
              {formatShiftDateTime(log.oldEnd).split(" ").slice(2).join(" ")}
            </span>
          </span>
        );
      case "UPDATE":
        return (
          <div className="flex flex-col text-xs space-y-0.5">
            <span className="text-slate-400 line-through">
              Cũ: {formatShiftDateTime(log.oldStart)} -{" "}
              {formatShiftDateTime(log.oldEnd).split(" ").slice(2).join(" ")}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              Mới: {formatShiftDateTime(log.newStart)} -{" "}
              {formatShiftDateTime(log.newEnd).split(" ").slice(2).join(" ")}
            </span>
          </div>
        );
      case "IMPORT":
        return (
          <span>
            Import từ file Excel:{" "}
            <span className="font-semibold text-slate-700 dark:text-stone-300">
              {formatShiftDateTime(log.newStart)} -{" "}
              {formatShiftDateTime(log.newEnd).split(" ").slice(2).join(" ")}
            </span>
          </span>
        );
      case "TAKE_SWAP":
        return (
          <span>
            Nhận ca đổi từ chợ ca:{" "}
            <span className="font-semibold text-slate-700 dark:text-stone-300">
              {formatShiftDateTime(log.newStart)} -{" "}
              {formatShiftDateTime(log.newEnd).split(" ").slice(2).join(" ")}
            </span>
          </span>
        );
      default:
        return <span>Hành động khác</span>;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const userName = (log.user?.name || "").toLowerCase();
      const userEmail = (log.user?.email || "").toLowerCase();
      const changedByName = (log.changedBy?.name || "").toLowerCase();
      const changedByEmail = (log.changedBy?.email || "").toLowerCase();
      const query = search.toLowerCase();

      return (
        userName.includes(query) ||
        userEmail.includes(query) ||
        changedByName.includes(query) ||
        changedByEmail.includes(query)
      );
    });
  }, [logs, search]);

  const groupedLogs = useMemo(() => {
    const groupsMap = new Map<string, any[]>();
    for (const log of filteredLogs) {
      const key = getVnDateKey(log.createdAt);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(log);
    }

    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => {
      const { title, isToday, isYesterday } = getVnDateLabel(key);
      return {
        dateKey: key,
        title,
        isToday,
        isYesterday,
        logs: groupsMap.get(key)!,
      };
    });
  }, [filteredLogs]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-emerald-200 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
        >
          <History className="w-4 h-4" />
          Lịch sử thay đổi ca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-4 sm:p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-stone-100 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Lịch sử Thay đổi Đăng ký Ca làm
          </DialogTitle>
          <DialogDescription className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm">
            Xem toàn bộ nhật ký thêm, sửa, xóa ca làm việc của nhân viên trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Tìm theo tên nhân viên hoặc người thực hiện..."
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-800/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Toolbar: Presets & Custom Date */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={filterType === "7_days" ? "default" : "outline"}
              onClick={() => handleFilterChange("7_days")}
              className={`h-7 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterType === "7_days"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              7 ngày gần nhất
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterType === "today" ? "default" : "outline"}
              onClick={() => handleFilterChange("today")}
              className={`h-7 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterType === "today"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Hôm nay
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterType === "this_week" ? "default" : "outline"}
              onClick={() => handleFilterChange("this_week")}
              className={`h-7 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterType === "this_week"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Tuần này
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterType === "last_week" ? "default" : "outline"}
              onClick={() => handleFilterChange("last_week")}
              className={`h-7 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterType === "last_week"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Tuần trước
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => handleFilterChange("all")}
              className={`h-7 px-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterType === "all"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                  : "border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              Tất cả
            </Button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] text-stone-500 font-medium">Lọc ngày:</span>
            <Input
              type="date"
              value={customDate}
              onChange={(e) => {
                const val = e.target.value;
                setCustomDate(val);
                if (val) {
                  handleFilterChange("custom_date", val);
                } else {
                  handleFilterChange("7_days");
                }
              }}
              className="h-7 w-34 text-xs px-2 py-0 border-stone-200 dark:border-stone-700 rounded-lg cursor-pointer bg-transparent"
            />
            {customDate && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCustomDate("");
                  handleFilterChange("7_days");
                }}
                className="h-7 w-7 p-0 text-stone-400 hover:text-stone-700 text-xs"
                title="Bỏ lọc ngày"
              >
                ✕
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
          <Table>
            <TableHeader className="bg-stone-50 dark:bg-stone-800/90 sticky top-0 z-20 shadow-2xs">
              <TableRow className="border-b border-stone-200 dark:border-stone-700">
                <TableHead className="w-[100px] text-xs font-bold">Thời gian</TableHead>
                <TableHead className="w-[140px] text-xs font-bold">Người thực hiện</TableHead>
                <TableHead className="w-[140px] text-xs font-bold">Nhân viên</TableHead>
                <TableHead className="w-[110px] text-xs font-bold">Thao tác</TableHead>
                <TableHead className="text-xs font-bold">Chi tiết ca làm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      <span>Đang tải lịch sử thay đổi ca...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : groupedLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-40 text-center text-muted-foreground"
                  >
                    Không tìm thấy bản ghi lịch sử nào trong khoảng thời gian này.
                  </TableCell>
                </TableRow>
              ) : (
                groupedLogs.map((group) => (
                  <React.Fragment key={group.dateKey}>
                    {/* Date Group Header */}
                    <TableRow className="bg-stone-100/90 dark:bg-stone-800/90 hover:bg-stone-100/90 dark:hover:bg-stone-800/90 border-t-2 border-stone-200 dark:border-stone-700">
                      <TableCell colSpan={5} className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                              {group.title}
                            </span>
                            {group.isToday && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-tight">
                                Hôm nay
                              </span>
                            )}
                            {group.isYesterday && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 leading-tight">
                                Hôm qua
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                            {group.logs.length} thao tác
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Rows in this date group */}
                    {group.logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="hover:bg-stone-50/70 dark:hover:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800/60"
                      >
                        <TableCell
                          className="font-mono text-xs font-semibold text-stone-600 dark:text-stone-400"
                          title={formatLogTime(log.createdAt)}
                        >
                          {formatTimeOnly(log.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium text-stone-800 dark:text-stone-200 text-xs">
                          {log.changedBy?.name || log.changedBy?.email?.split("@")[0]}
                          <span className="block text-[10px] text-stone-400 dark:text-stone-500 font-normal">
                            {log.changedBy?.role === "ADMIN" ? "Admin" : "Staff"}
                          </span>
                        </TableCell>
                        <TableCell className="text-stone-800 dark:text-stone-200 font-semibold text-xs">
                          {log.user?.name || log.user?.email?.split("@")[0]}
                        </TableCell>
                        <TableCell>{renderActionBadge(log.action)}</TableCell>
                        <TableCell className="text-stone-700 dark:text-stone-300 text-xs">
                          {formatLogDetail(log)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {hasMore && !loading && (
          <div className="flex justify-center mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              className="text-xs rounded-xl border-stone-200 dark:border-stone-700 cursor-pointer"
            >
              Tải thêm dữ liệu
            </Button>
          </div>
        )}

        {loading && logs.length > 0 && (
          <div className="flex justify-center mt-3 text-xs text-muted-foreground items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-amber-600" /> Đang tải thêm...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
