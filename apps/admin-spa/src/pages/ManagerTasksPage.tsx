import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  History,
  Settings,
  Clock,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, swrFetcher } from "@/lib/api";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  targetDate: string | null;
  order?: number;
  createdAt: string | Date;
  completed: boolean;
  completedAt: string | Date | null;
}

interface WeeklyTaskItem {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string;
  weekStart: string;
  weekEnd: string;
  completed: boolean;
  completedAt: string | null;
  explanation: string | null;
  isCarriedOver: boolean;
}

interface StatsHistoryData {
  daysWorked: number;
  totalHours: number;
  lateCount: number;
  totalDeficiencies: number;
  dailyDetails: Array<{
    date: string;
    shift: string;
    hours: number;
    error?: string;
    isChecklistIncomplete?: boolean;
  }>;
}

function getTodayVN(): string {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const year = vnNow.getUTCFullYear();
  const month = String(vnNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnNow.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ManagerTasksPage() {
  const [activeTab, setActiveTab] = useState<"checklist" | "templates" | "history">("checklist");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayVN());

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);

  // Weekly Dialog states
  const [isWeeklyCreateOpen, setIsWeeklyCreateOpen] = useState(false);
  const [isWeeklyEditOpen, setIsWeeklyEditOpen] = useState(false);
  const [isWeeklyCarryOverOpen, setIsWeeklyCarryOverOpen] = useState(false);
  const [editingWeeklyTask, setEditingWeeklyTask] = useState<WeeklyTaskItem | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskTargetDate, setTaskTargetDate] = useState("");

  // Weekly Form states
  const [weeklyTaskTitle, setWeeklyTaskTitle] = useState("");
  const [weeklyTaskDesc, setWeeklyTaskDesc] = useState("");
  const [carryOverExplanation, setCarryOverExplanation] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  // SWR: Fetch users
  const { data: rawUsers } = useSWR<any>("/api/manager-tasks/users", swrFetcher);
  const users: UserItem[] = Array.isArray(rawUsers)
    ? rawUsers
    : rawUsers?.data || [];

  // Filter admin users for priority display
  const adminUsers = users.filter(
    (u) =>
      u.role === "ADMIN" ||
      u.email?.includes("maithina4040") ||
      u.name?.toLowerCase() === "na"
  );
  const selectableUsers = adminUsers.length > 0 ? adminUsers : users;

  // Auto-select default user (prioritize Na or first admin)
  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      const defaultUser =
        users.find(
          (u) =>
            u.role === "ADMIN" &&
            (u.email?.includes("maithina4040") || u.name?.toLowerCase() === "na")
        ) ||
        users.find((u) => u.role === "ADMIN") ||
        users[0];
      if (defaultUser) {
        setSelectedUserId(defaultUser.id);
      }
    }
  }, [users, selectedUserId]);

  // SWR: Daily Checklist
  const {
    data: rawChecklist,
    error: checklistError,
    isLoading: checklistLoading,
    mutate: mutateChecklist,
  } = useSWR<any>(
    selectedUserId
      ? `/api/manager-tasks/checklist?userId=${selectedUserId}&date=${selectedDate}`
      : null,
    swrFetcher
  );
  const checklist: ChecklistItem[] = Array.isArray(rawChecklist)
    ? rawChecklist
    : rawChecklist?.data || [];

  // SWR: Weekly Tasks
  const {
    data: rawWeekly,
    error: weeklyError,
    isLoading: weeklyLoading,
    mutate: mutateWeekly,
  } = useSWR<any>(
    selectedUserId
      ? `/api/manager-tasks/weekly?userId=${selectedUserId}&date=${selectedDate}`
      : null,
    swrFetcher
  );
  const weeklyTasks: WeeklyTaskItem[] = Array.isArray(rawWeekly)
    ? rawWeekly
    : rawWeekly?.data || [];

  // SWR: Templates (loaded when on templates tab)
  const {
    data: rawTemplates,
    isLoading: templatesLoading,
    mutate: mutateTemplates,
  } = useSWR<any>(
    activeTab === "templates" && selectedUserId
      ? `/api/manager-tasks/templates?userId=${selectedUserId}`
      : null,
    swrFetcher
  );
  const templates: ChecklistItem[] = Array.isArray(rawTemplates)
    ? rawTemplates
    : rawTemplates?.data || [];

  // SWR: Stats History (loaded when on history tab)
  const {
    data: rawHistory,
    isLoading: historyLoading,
    mutate: mutateHistory,
  } = useSWR<any>(
    activeTab === "history" && selectedUserId
      ? `/api/manager-tasks/stats-history?userId=${selectedUserId}&date=${selectedDate}`
      : null,
    swrFetcher
  );
  const historyStats: StatsHistoryData | null = rawHistory?.data || rawHistory || null;

  // Toggle Daily Task Completion
  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;

    // Optimistic UI update
    await mutateChecklist(
      checklist.map((item) =>
        item.id === taskId
          ? {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date() : null,
            }
          : item
      ),
      false
    );

    try {
      await api.post("/api/manager-tasks/checklist/toggle", {
        taskId,
        date: selectedDate,
        completed: nextCompleted,
      });
      toast.success(
        nextCompleted ? "Đã hoàn thành nhiệm vụ!" : "Đã hủy hoàn thành"
      );
      mutateChecklist();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi kết nối máy chủ");
      mutateChecklist();
    }
  };

  // Toggle Weekly Task Completion
  const handleToggleWeekly = async (taskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;

    // Optimistic UI update
    await mutateWeekly(
      weeklyTasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : item
      ),
      false
    );

    try {
      await api.post(`/api/manager-tasks/weekly/${taskId}/toggle`, {
        completed: nextCompleted,
      });
      toast.success(
        nextCompleted ? "Đã hoàn thành việc tuần!" : "Đã hủy hoàn thành việc tuần"
      );
      mutateWeekly();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi kết nối máy chủ");
      mutateWeekly();
    }
  };

  // Template Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setActionLoading(true);
    try {
      await api.post("/api/manager-tasks/checklist", {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        assigneeId: selectedUserId,
        targetDate: taskTargetDate || null,
      });
      toast.success("Tạo nhiệm vụ mẫu thành công!");
      setIsCreateOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskTargetDate("");
      mutateTemplates();
      mutateChecklist();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi tạo nhiệm vụ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) return;

    setActionLoading(true);
    try {
      await api.patch(`/api/manager-tasks/checklist/${editingTask.id}`, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        active: editingTask.active,
        targetDate: taskTargetDate || null,
      });
      toast.success("Cập nhật nhiệm vụ thành công!");
      setIsEditOpen(false);
      setEditingTask(null);
      setTaskTitle("");
      setTaskDesc("");
      setTaskTargetDate("");
      mutateTemplates();
      mutateChecklist();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi cập nhật");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTaskActive = async (task: ChecklistItem) => {
    try {
      const nextActive = !task.active;
      await api.patch(`/api/manager-tasks/checklist/${task.id}`, {
        active: nextActive,
      });
      toast.success(
        nextActive ? "Đã kích hoạt nhiệm vụ mẫu" : "Đã tạm dừng nhiệm vụ mẫu"
      );
      mutateTemplates();
      mutateChecklist();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi cập nhật trạng thái");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa nhiệm vụ mẫu này? Lịch sử hoàn thành liên quan cũng sẽ bị xóa."
      )
    )
      return;

    try {
      await api.delete(`/api/manager-tasks/checklist/${taskId}`);
      toast.success("Đã xóa nhiệm vụ mẫu!");
      mutateTemplates();
      mutateChecklist();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi xóa nhiệm vụ");
    }
  };

  const handleMoveTask = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === templates.length - 1) return;

    const newTemplates = [...templates];
    const swapWithIndex = direction === "up" ? index - 1 : index + 1;

    const temp = newTemplates[index];
    newTemplates[index] = newTemplates[swapWithIndex];
    newTemplates[swapWithIndex] = temp;

    await mutateTemplates(newTemplates, false);

    try {
      const orderedIds = newTemplates.map((t) => t.id);
      await api.post("/api/manager-tasks/checklist/reorder", {
        userId: selectedUserId,
        taskIds: orderedIds,
      });
      toast.success("Đã thay đổi thứ tự nhiệm vụ");
      mutateTemplates();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi cập nhật thứ tự");
      mutateTemplates();
    }
  };

  const handleOpenEdit = (task: ChecklistItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskTargetDate(task.targetDate || "");
    setIsEditOpen(true);
  };

  // Weekly Task Actions
  const handleCreateWeeklyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weeklyTaskTitle.trim()) return;

    setActionLoading(true);
    try {
      await api.post("/api/manager-tasks/weekly", {
        title: weeklyTaskTitle.trim(),
        description: weeklyTaskDesc.trim() || null,
        assigneeId: selectedUserId,
        dateStr: selectedDate,
      });
      toast.success("Tạo việc hằng tuần thành công!");
      setIsWeeklyCreateOpen(false);
      setWeeklyTaskTitle("");
      setWeeklyTaskDesc("");
      mutateWeekly();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi tạo nhiệm vụ tuần");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWeeklyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeeklyTask || !weeklyTaskTitle.trim()) return;

    setActionLoading(true);
    try {
      await api.patch(`/api/manager-tasks/weekly/${editingWeeklyTask.id}`, {
        title: weeklyTaskTitle.trim(),
        description: weeklyTaskDesc.trim() || null,
      });
      toast.success("Cập nhật nhiệm vụ tuần thành công!");
      setIsWeeklyEditOpen(false);
      setEditingWeeklyTask(null);
      setWeeklyTaskTitle("");
      setWeeklyTaskDesc("");
      mutateWeekly();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi cập nhật");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWeeklyTask = async (taskId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhiệm vụ hằng tuần này?")) return;

    try {
      await api.delete(`/api/manager-tasks/weekly/${taskId}`);
      toast.success("Đã xóa nhiệm vụ tuần!");
      mutateWeekly();
    } catch (e: any) {
      toast.error(e?.message || "Lỗi xóa nhiệm vụ");
    }
  };

  const handleCarryOverWeeklyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeeklyTask || !carryOverExplanation.trim()) {
      toast.error("Vui lòng nhập lý do giải trình!");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/api/manager-tasks/weekly/${editingWeeklyTask.id}/carry-over`, {
        explanation: carryOverExplanation.trim(),
      });
      toast.success("Đã nộp giải trình và chuyển việc sang tuần sau!");
      setIsWeeklyCarryOverOpen(false);
      setEditingWeeklyTask(null);
      setCarryOverExplanation("");
      mutateWeekly();
    } catch (e: any) {
      toast.error(e?.message || "Gặp lỗi nộp giải trình");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenWeeklyEdit = (task: WeeklyTaskItem) => {
    setEditingWeeklyTask(task);
    setWeeklyTaskTitle(task.title);
    setWeeklyTaskDesc(task.description || "");
    setIsWeeklyEditOpen(true);
  };

  const handleOpenWeeklyCarryOver = (task: WeeklyTaskItem) => {
    setEditingWeeklyTask(task);
    setCarryOverExplanation("");
    setIsWeeklyCarryOverOpen(true);
  };

  // Calculations
  const activeChecklist = checklist.filter((t) => t.active);
  const totalTasks = activeChecklist.length;
  const completedTasks = activeChecklist.filter((t) => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const isFullyCompleted = totalTasks > 0 && completedTasks === totalTasks;

  const weeklyTotal = weeklyTasks.length;
  const weeklyCompleted = weeklyTasks.filter((t) => t.completed || t.explanation).length;
  const weeklyPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 100;

  const getSelectedWeekRangeStr = () => {
    try {
      if (!selectedDate) return "";
      const parts = selectedDate.split("-");
      if (parts.length !== 3) return "";
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) return "";

      const currentDay = date.getDay(); // 0 = Sun, 1 = Mon... 6 = Sat
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const monday = new Date(date);
      monday.setDate(date.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const format = (d: Date) =>
        d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      return `${format(monday)} - ${format(sunday)}`;
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Checklist Quản Lý
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Hệ thống checklist công việc hàng ngày bắt buộc dành cho nhân sự quản lý và vận hành.
        </p>
      </div>

      {/* Selection Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-50 p-3 sm:p-4 rounded-2xl border">
        {/* User Selector */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 shrink-0">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 lg:flex-initial min-w-0">
            <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
              Nhân sự phụ trách
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              aria-label="Chọn nhân sự quản lý phụ trách"
              className="bg-white border rounded-lg px-3 py-1.5 h-10 sm:h-9 text-base sm:text-sm font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none w-full lg:w-auto"
            >
              {selectableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email?.split("@")[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Picker & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 h-10 sm:h-9 shadow-xs w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Chọn ngày xem checklist quản lý"
              className="text-base sm:text-sm font-semibold text-slate-700 outline-none border-0 p-0 w-full sm:w-32 focus:ring-0 focus:border-0"
            />
          </div>

          <div className="flex bg-slate-200/80 rounded-xl p-1 gap-1 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "checklist"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Checklist
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "templates"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="h-3.5 w-3.5" /> Nhiệm vụ mẫu
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="h-3.5 w-3.5" /> Lịch sử
            </button>
          </div>
        </div>
      </div>

      {/* --- TAB 1: DAILY & WEEKLY CHECKLIST --- */}
      {activeTab === "checklist" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Checklist Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Tasks Checklist Card */}
            <Card className="border-indigo-100 shadow-md">
              <CardHeader className="pb-3 border-b bg-indigo-50/20">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">
                      Checklist công việc hằng ngày
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ngày{" "}
                      {new Date(selectedDate).toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => mutateChecklist()}
                    disabled={checklistLoading}
                    className="h-8 w-8 p-0"
                    title="Tải lại checklist"
                  >
                    <RefreshCw
                      className={`h-4 w-4 text-slate-500 ${
                        checklistLoading ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {checklistLoading ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                    Đang tải dữ liệu checklist hằng ngày...
                  </div>
                ) : activeChecklist.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                    <p className="text-sm font-medium text-slate-800">
                      Chưa có nhiệm vụ nào được cấu hình.
                    </p>
                    <p className="text-xs">
                      Vui lòng chuyển qua tab "Nhiệm vụ mẫu" để tạo danh sách công việc hàng ngày.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activeChecklist.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggle(task.id, task.completed)}
                        className={`flex items-start gap-4 p-4 transition-all hover:bg-slate-50 cursor-pointer select-none ${
                          task.completed ? "bg-emerald-50/20" : ""
                        }`}
                      >
                        <div className="pt-0.5">
                          <div
                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                              task.completed
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 hover:border-indigo-500"
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-semibold text-slate-800 break-words ${
                              task.completed
                                ? "line-through text-slate-400 font-normal"
                                : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p
                              className={`text-xs text-muted-foreground mt-0.5 ${
                                task.completed ? "text-slate-300" : ""
                              }`}
                            >
                              {task.description}
                            </p>
                          )}
                          {task.completed && task.completedAt && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                              <Clock className="h-3 w-3" />
                              Đã tích lúc{" "}
                              {new Date(task.completedAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Tasks Checklist Card */}
            <Card className="border-indigo-100 shadow-md">
              <CardHeader className="pb-3 border-b bg-purple-50/20">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                      📅 Checklist công việc hằng tuần ({getSelectedWeekRangeStr()})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Công việc bắt buộc hoàn thành trong tuần này
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 text-xs"
                      onClick={() => setIsWeeklyCreateOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Thêm việc tuần
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => mutateWeekly()}
                      disabled={weeklyLoading}
                      className="h-8 w-8 p-0"
                      title="Tải lại việc tuần"
                    >
                      <RefreshCw
                        className={`h-4 w-4 text-slate-500 ${
                          weeklyLoading ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {weeklyLoading ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
                    Đang tải dữ liệu việc tuần...
                  </div>
                ) : weeklyTasks.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                    <p className="text-sm font-medium text-slate-800">
                      Chưa có nhiệm vụ tuần nào.
                    </p>
                    <p className="text-xs">
                      Hãy bấm nút "Thêm việc tuần" ở trên để tạo nhiệm vụ cho tuần này.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {weeklyTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start justify-between p-4 transition-all hover:bg-slate-50/50 gap-4 ${
                          task.completed ? "bg-emerald-50/10" : ""
                        }`}
                      >
                        <div
                          className="flex items-start gap-4 flex-1 cursor-pointer select-none min-w-0"
                          onClick={() => handleToggleWeekly(task.id, task.completed)}
                        >
                          <div className="pt-0.5">
                            <div
                              className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                task.completed
                                  ? "bg-purple-500 border-purple-500 text-white"
                                  : "border-slate-300 hover:border-purple-500"
                              }`}
                            >
                              {task.completed && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`text-sm font-semibold text-slate-800 break-words ${
                                  task.completed
                                    ? "line-through text-slate-400 font-normal"
                                    : ""
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.isCarriedOver && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  Chuyển tiếp
                                </span>
                              )}
                              {task.explanation && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                  Đã giải trình chuyển tuần
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p
                                className={`text-xs text-muted-foreground mt-0.5 ${
                                  task.completed ? "text-slate-300" : ""
                                }`}
                              >
                                {task.description}
                              </p>
                            )}
                            {task.explanation && (
                              <p className="text-xs text-blue-700 bg-blue-50/50 border border-blue-100 rounded-md p-1.5 mt-2 font-medium">
                                💬 <b>Giải trình:</b> {task.explanation}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!task.completed && !task.explanation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWeeklyCarryOver(task);
                              }}
                            >
                              Chuyển tuần
                            </Button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenWeeklyEdit(task);
                            }}
                            className="p-1.5 rounded-md hover:bg-purple-50 hover:text-purple-600 text-slate-400 transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWeeklyTask(task.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress Widget Sidebar */}
          <div className="space-y-4">
            {/* Daily progress */}
            <Card className="border-indigo-100 shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-100/40 to-transparent rounded-bl-full pointer-events-none" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Tiến Độ Hằng Ngày
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-extrabold text-indigo-950 font-mono tracking-tight">
                    {progressPercent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Đã hoàn thành:{" "}
                    <b className="text-indigo-600 font-mono text-sm">
                      {completedTasks}
                    </b>{" "}
                    / {totalTasks}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyCompleted
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-indigo-500 to-violet-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {isFullyCompleted ? (
                  <div className="border border-emerald-100 bg-emerald-50/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-xs animate-in fade-in duration-300">
                    <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">
                        Tuyệt vời! Hoàn thành 100%
                      </h4>
                      <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5">
                        Ngày làm việc này đã được ghi nhận hoàn chỉnh quy trình, không phát sinh lỗi hoặc thiếu sót.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-amber-100 bg-amber-50/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-xs">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">
                        Chưa hoàn thành đầy đủ
                      </h4>
                      <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                        Bạn bắt buộc phải hoàn thành toàn bộ các nhiệm vụ trên để tránh việc ngày hôm nay bị đánh giá là{" "}
                        <b>"Thiếu sót trong quy trình làm việc"</b> trên bảng chấm công.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly progress */}
            <Card className="border-indigo-100 shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-100/40 to-transparent rounded-bl-full pointer-events-none" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                  Tiến Độ Tuần Này
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-extrabold text-purple-950 font-mono tracking-tight">
                    {weeklyPercent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Đã hoàn thành:{" "}
                    <b className="text-purple-600 font-mono text-sm">
                      {weeklyCompleted}
                    </b>{" "}
                    / {weeklyTotal}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weeklyCompleted === weeklyTotal && weeklyTotal > 0
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-purple-500 to-pink-500"
                    }`}
                    style={{ width: `${weeklyPercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- TAB 2: TEMPLATE MANAGEMENT --- */}
      {activeTab === "templates" && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="pb-3 border-b flex flex-row justify-between items-center gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Quản lý nhiệm vụ mẫu
              </CardTitle>
              <CardDescription className="text-xs">
                Thiết lập các nhiệm vụ lặp lại hàng ngày bắt buộc phải tích chọn cho từng nhân sự.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={() => {
                setTaskTitle("");
                setTaskDesc("");
                setTaskTargetDate("");
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Thêm Nhiệm Vụ Mới
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {templatesLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                Đang tải danh sách mẫu...
              </div>
            ) : templates.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                Chưa có nhiệm vụ mẫu nào được cấu hình cho quản lý này.
              </div>
            ) : (
              <div className="divide-y">
                {templates.map((task, idx) => (
                  <div
                    key={task.id}
                    className="flex justify-between items-center p-4 hover:bg-slate-50 gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            task.active ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                        <h4
                          className={`text-sm font-semibold text-slate-800 break-words ${
                            !task.active ? "text-slate-400 font-normal" : ""
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.targetDate ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] py-0.5 px-1.5 font-bold"
                          >
                            Chỉ ngày: {task.targetDate}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] py-0.5 px-1.5 font-semibold"
                          >
                            Hằng ngày
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p
                          className={`text-xs text-muted-foreground mt-1 ml-4 ${
                            !task.active ? "text-slate-300" : ""
                          }`}
                        >
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Move Up */}
                      <button
                        onClick={() => handleMoveTask(idx, "up")}
                        disabled={idx === 0}
                        className={`p-1.5 rounded-md text-slate-400 transition-colors ${
                          idx === 0
                            ? "opacity-25 cursor-not-allowed"
                            : "hover:bg-slate-100 hover:text-slate-700"
                        }`}
                        title="Di chuyển lên"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => handleMoveTask(idx, "down")}
                        disabled={idx === templates.length - 1}
                        className={`p-1.5 rounded-md text-slate-400 transition-colors ${
                          idx === templates.length - 1
                            ? "opacity-25 cursor-not-allowed"
                            : "hover:bg-slate-100 hover:text-slate-700"
                        }`}
                        title="Di chuyển xuống"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleTaskActive(task)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                        title={task.active ? "Tạm dừng hoạt động" : "Kích hoạt"}
                      >
                        {task.active ? (
                          <ToggleRight className="h-6 w-6 text-green-600 stroke-[2.5]" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-400 stroke-[2.5]" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(task)}
                        className="p-1.5 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- TAB 3: HISTORY LIST --- */}
      {activeTab === "history" && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="pb-3 border-b flex justify-between items-center flex-row flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Lịch sử hoàn thành checklist
              </CardTitle>
              <CardDescription className="text-xs">
                Đối chiếu trạng thái hoàn thành checklist và số lỗi quy trình tính theo tháng.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutateHistory()}
              disabled={historyLoading}
              className="font-semibold text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`}
              />{" "}
              Tải lại
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {historyLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                Đang đối chiếu dữ liệu lịch sử...
              </div>
            ) : !historyStats ||
              !historyStats.dailyDetails ||
              historyStats.dailyDetails.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu chấm công hoặc làm việc tháng này để đối chiếu lịch sử checklist.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Ngày đi làm
                    </span>
                    <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">
                      {historyStats.daysWorked} ngày
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Giờ công
                    </span>
                    <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">
                      {historyStats.totalHours?.toFixed(1)}h
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Đi muộn
                    </span>
                    <span className="text-xl font-extrabold text-amber-600 font-mono mt-0.5 block">
                      {historyStats.lateCount} lần
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Lỗi Quy Trình
                    </span>
                    <span className="text-xl font-extrabold text-rose-600 font-mono mt-0.5 block">
                      {historyStats.totalDeficiencies} ngày
                    </span>
                  </div>
                </div>

                {/* Grid table */}
                <div className="border rounded-lg overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
                  <table className="min-w-full divide-y text-sm min-w-[550px]">
                    <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Ngày</th>
                        <th className="px-4 py-3 text-center">Ca làm việc</th>
                        <th className="px-4 py-3 text-center">Giờ công</th>
                        <th className="px-4 py-3 text-right">Trạng thái Checklist</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                      {historyStats.dailyDetails.map((day, idx) => {
                        const hasChecklistError =
                          day.error && day.error.includes("Thiếu checklist");
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {new Date(day.date).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                              {day.shift || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-xs">
                              {day.hours > 0 ? day.hours.toFixed(1) + "h" : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {day.hours === 0 && !day.error?.includes("WFH") ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border">
                                  Nghỉ làm
                                </span>
                              ) : hasChecklistError ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                  ⚠️ Thiếu sót quy trình
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Hoàn chỉnh
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* --- DIALOGS --- */}

      {/* Create Checklist Task Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Tạo nhiệm vụ checklist mẫu
              </DialogTitle>
              <DialogDescription className="text-xs">
                Thêm nhiệm vụ lặp lại hàng ngày mới gán cho quản lý.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                  Tên nhiệm vụ (Bắt buộc)
                </Label>
                <Input
                  id="title"
                  placeholder="Ví dụ: Kiểm tra vệ sinh shop đầu ngày"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-700">
                  Mô tả chi tiết
                </Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả các đầu việc cụ thể cần làm..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-date" className="text-xs font-bold text-slate-700">
                  Ngày áp dụng (Bỏ trống nếu muốn lặp lại hằng ngày)
                </Label>
                <Input
                  id="target-date"
                  type="date"
                  value={taskTargetDate}
                  onChange={(e) => setTaskTargetDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                disabled={actionLoading}
              >
                {actionLoading && (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Checklist Task Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Chỉnh sửa nhiệm vụ mẫu
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sửa đổi tiêu đề hoặc mô tả của nhiệm vụ mẫu lặp lại hàng ngày.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs font-bold text-slate-700">
                  Tên nhiệm vụ (Bắt buộc)
                </Label>
                <Input
                  id="edit-title"
                  placeholder="Ví dụ: Kiểm tra vệ sinh shop đầu ngày"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description" className="text-xs font-bold text-slate-700">
                  Mô tả chi tiết
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Mô tả các đầu việc cụ thể cần làm..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-target-date" className="text-xs font-bold text-slate-700">
                  Ngày áp dụng (Bỏ trống nếu muốn lặp lại hằng ngày)
                </Label>
                <Input
                  id="edit-target-date"
                  type="date"
                  value={taskTargetDate}
                  onChange={(e) => setTaskTargetDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingTask(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                disabled={actionLoading}
              >
                {actionLoading && (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Weekly Task Dialog */}
      <Dialog open={isWeeklyCreateOpen} onOpenChange={setIsWeeklyCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateWeeklyTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Tạo nhiệm vụ hằng tuần
              </DialogTitle>
              <DialogDescription className="text-xs">
                Thêm nhiệm vụ bắt buộc hoàn thành trong tuần ({getSelectedWeekRangeStr()}) cho quản lý.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="weekly-title" className="text-xs font-bold text-slate-700">
                  Tên nhiệm vụ (Bắt buộc)
                </Label>
                <Input
                  id="weekly-title"
                  placeholder="Ví dụ: Hoàn tất báo cáo doanh thu tuần"
                  value={weeklyTaskTitle}
                  onChange={(e) => setWeeklyTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly-description" className="text-xs font-bold text-slate-700">
                  Mô tả chi tiết
                </Label>
                <Textarea
                  id="weekly-description"
                  placeholder="Mô tả công việc cụ thể..."
                  value={weeklyTaskDesc}
                  onChange={(e) => setWeeklyTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWeeklyCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 font-bold text-white"
                disabled={actionLoading}
              >
                {actionLoading && (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Weekly Task Dialog */}
      <Dialog open={isWeeklyEditOpen} onOpenChange={setIsWeeklyEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateWeeklyTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Sửa nhiệm vụ hằng tuần
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sửa đổi tên hoặc mô tả việc tuần ({getSelectedWeekRangeStr()}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="weekly-edit-title" className="text-xs font-bold text-slate-700">
                  Tên nhiệm vụ (Bắt buộc)
                </Label>
                <Input
                  id="weekly-edit-title"
                  placeholder="Ví dụ: Hoàn tất báo cáo doanh thu tuần"
                  value={weeklyTaskTitle}
                  onChange={(e) => setWeeklyTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly-edit-description" className="text-xs font-bold text-slate-700">
                  Mô tả chi tiết
                </Label>
                <Textarea
                  id="weekly-edit-description"
                  placeholder="Mô tả công việc cụ thể..."
                  value={weeklyTaskDesc}
                  onChange={(e) => setWeeklyTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsWeeklyEditOpen(false);
                  setEditingWeeklyTask(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 font-bold text-white"
                disabled={actionLoading}
              >
                {actionLoading && (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Weekly Carry Over / Explanation Dialog */}
      <Dialog open={isWeeklyCarryOverOpen} onOpenChange={setIsWeeklyCarryOverOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCarryOverWeeklyTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Giải trình & Chuyển sang tuần sau
              </DialogTitle>
              <DialogDescription className="text-xs">
                Nhập lý do chưa hoàn thành để chuyển công việc sang tuần tiếp theo và được mở chặn Check-out. Báo cáo giải trình sẽ được gửi cho Admin Dung duyệt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Tên nhiệm vụ</Label>
                <div className="text-sm bg-slate-50 border rounded-lg p-3 font-semibold text-slate-800">
                  {editingWeeklyTask?.title}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carryover-explanation" className="text-xs font-bold text-slate-700">
                  Lý do giải trình (Bắt buộc)
                </Label>
                <Textarea
                  id="carryover-explanation"
                  placeholder="Ví dụ: Đối tác gửi số liệu trễ nên chưa thể đối soát xong..."
                  value={carryOverExplanation}
                  onChange={(e) => setCarryOverExplanation(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsWeeklyCarryOverOpen(false);
                  setEditingWeeklyTask(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={actionLoading}
              >
                {actionLoading && (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Xác nhận & Chuyển tuần
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ManagerTasksPage;
