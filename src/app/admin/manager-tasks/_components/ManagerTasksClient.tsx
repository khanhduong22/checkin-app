"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getManagerDailyChecklist,
  toggleManagerChecklistItem,
  createManagerChecklistTask,
  updateManagerChecklistTask,
  deleteManagerChecklistTask,
  getManagerStatsHistory,
} from "@/actions/manager-checklist-actions";

interface ManagerTasksClientProps {
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  }>;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  completed: boolean;
  completedAt: Date | null;
}

export function ManagerTasksClient({ currentUser, users }: ManagerTasksClientProps) {
  const [activeTab, setActiveTab] = useState<"checklist" | "templates" | "history">("checklist");
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Data states
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [templates, setTemplates] = useState<ChecklistItem[]>([]);
  const [historyStats, setHistoryStats] = useState<any>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ChecklistItem | null>(null);
  
  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  // Filters
  const adminUsers = users.filter(u => u.role === "ADMIN");

  // Load Checklist for Selected User and Date
  const loadChecklist = async () => {
    setLoading(true);
    try {
      const res = await getManagerDailyChecklist(selectedUserId, selectedDate);
      if (res.success && res.data) {
        // Sort active templates
        setChecklist(res.data as ChecklistItem[]);
      } else {
        toast.error(res.error || "Gặp lỗi tải checklist");
      }
    } catch (e) {
      toast.error("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Load Templates (Tasks defined for Selected User)
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await getManagerDailyChecklist(selectedUserId, new Date().toISOString().split("T")[0]);
      if (res.success && res.data) {
        setTemplates(res.data as ChecklistItem[]);
      } else {
        toast.error(res.error || "Gặp lỗi tải danh sách mẫu");
      }
    } catch (e) {
      toast.error("Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  // Load History Stats for Selected User
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const targetDate = new Date(selectedDate);
      const res = await getManagerStatsHistory(selectedUserId, targetDate);
      if (res.success && res.data) {
        setHistoryStats(res.data);
      } else {
        toast.error(res.error || "Gặp lỗi tải lịch sử chấm công & checklist");
      }
    } catch (e) {
      toast.error("Không thể tải lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Trigger loads based on tab and selections
  useEffect(() => {
    if (activeTab === "checklist") {
      loadChecklist();
    } else if (activeTab === "templates") {
      loadTemplates();
    } else if (activeTab === "history") {
      loadHistory();
    }
  }, [selectedUserId, selectedDate, activeTab]);

  // Toggle checklist check state
  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    
    // Optimistic UI updates
    setChecklist(prev => prev.map(item => item.id === taskId ? {
      ...item,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date() : null
    } : item));

    try {
      const res = await toggleManagerChecklistItem(taskId, selectedDate, nextCompleted);
      if (res.success) {
        toast.success(nextCompleted ? "Đã hoàn thành nhiệm vụ!" : "Đã hủy hoàn thành");
      } else {
        toast.error(res.error || "Gặp lỗi cập nhật");
        // Rollback
        setChecklist(prev => prev.map(item => item.id === taskId ? {
          ...item,
          completed: currentCompleted,
          completedAt: currentCompleted ? new Date() : null
        } : item));
      }
    } catch (e) {
      toast.error("Lỗi kết nối máy chủ");
      // Rollback
      setChecklist(prev => prev.map(item => item.id === taskId ? {
        ...item,
        completed: currentCompleted,
        completedAt: currentCompleted ? new Date() : null
      } : item));
    }
  };

  // Handle template actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    
    setActionLoading(true);
    try {
      const res = await createManagerChecklistTask(taskTitle.trim(), taskDesc.trim(), selectedUserId);
      if (res.success) {
        toast.success("Tạo nhiệm vụ mẫu thành công!");
        setIsCreateOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        loadTemplates();
      } else {
        toast.error(res.error || "Gặp lỗi tạo nhiệm vụ");
      }
    } catch (e) {
      toast.error("Không thể kết nối");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !taskTitle.trim()) return;

    setActionLoading(true);
    try {
      const res = await updateManagerChecklistTask(editingTask.id, taskTitle.trim(), taskDesc.trim(), editingTask.active);
      if (res.success) {
        toast.success("Cập nhật nhiệm vụ thành công!");
        setIsEditOpen(false);
        setEditingTask(null);
        setTaskTitle("");
        setTaskDesc("");
        loadTemplates();
      } else {
        toast.error(res.error || "Gặp lỗi cập nhật");
      }
    } catch (e) {
      toast.error("Không thể kết nối");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTaskActive = async (task: ChecklistItem) => {
    try {
      const nextActive = !task.active;
      const res = await updateManagerChecklistTask(task.id, task.title, task.description, nextActive);
      if (res.success) {
        toast.success(nextActive ? "Đã kích hoạt nhiệm vụ mẫu" : "Đã tạm dừng nhiệm vụ mẫu");
        loadTemplates();
      } else {
        toast.error(res.error || "Lỗi cập nhật trạng thái");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhiệm vụ mẫu này? Lịch sử chấm điểm liên quan cũng sẽ bị xóa.")) return;
    
    try {
      const res = await deleteManagerChecklistTask(taskId);
      if (res.success) {
        toast.success("Đã xóa nhiệm vụ mẫu!");
        loadTemplates();
      } else {
        toast.error(res.error || "Lỗi xóa nhiệm vụ");
      }
    } catch (e) {
      toast.error("Lỗi kết nối");
    }
  };

  const handleOpenEdit = (task: ChecklistItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setIsEditOpen(true);
  };

  // UI calculations
  const totalTasks = checklist.filter(t => t.active).length;
  const completedTasks = checklist.filter(t => t.active && t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const isFullyCompleted = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <div className="space-y-6">
      {/* Selection row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50 p-4 rounded-2xl border">
        {/* User Selection */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 sm:flex-initial">
            <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Nhân sự phụ trách</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-white border rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              {adminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email?.split("@")[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selection & Tabs Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-slate-700 outline-hidden border-0 p-0 w-32 focus:ring-0 focus:border-0"
            />
          </div>

          <div className="flex bg-slate-200/80 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "checklist"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Checklist
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "templates"
                  ? "bg-white text-indigo-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="h-3.5 w-3.5" /> Nhiệm vụ mẫu
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
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

      {/* --- TAB 1: DAILY CHECKLIST --- */}
      {activeTab === "checklist" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Checklist Card */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-indigo-100 shadow-md">
              <CardHeader className="pb-3 border-b bg-indigo-50/20">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Checklist công việc</CardTitle>
                    <CardDescription className="text-xs">
                      Ngày {new Date(selectedDate).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadChecklist}
                    disabled={loading}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                    Đang tải dữ liệu checklist...
                  </div>
                ) : checklist.filter(t => t.active).length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-amber-500" />
                    <p className="text-sm font-medium text-slate-800">Chưa có nhiệm vụ nào được cấu hình.</p>
                    <p className="text-xs">Vui lòng chuyển qua tab "Nhiệm vụ mẫu" để tạo danh sách công việc hàng ngày.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {checklist
                      .filter(t => t.active)
                      .map((task) => (
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
                                task.completed ? "line-through text-slate-400 font-normal" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className={`text-xs text-muted-foreground mt-0.5 ${task.completed ? "text-slate-300" : ""}`}>
                                {task.description}
                              </p>
                            )}
                            {task.completed && task.completedAt && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                                <Clock className="h-3 w-3" />
                                Đã tích lúc {new Date(task.completedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress Widget Card */}
          <div className="space-y-4">
            <Card className="border-indigo-100 shadow-md overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-100/40 to-transparent rounded-bl-full pointer-events-none" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-wider">Tiến Độ Hoàn Thành</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-extrabold text-indigo-950 font-mono tracking-tight">
                    {progressPercent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Đã hoàn thành: <b className="text-indigo-600 font-mono text-sm">{completedTasks}</b> / {totalTasks}
                  </span>
                </div>

                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyCompleted ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {isFullyCompleted ? (
                  <div className="border border-emerald-100 bg-emerald-50/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-xs animate-in fade-in duration-300">
                    <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">Tuyệt vời! Hoàn thành 100%</h4>
                      <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5">
                        Ngày làm việc này đã được ghi nhận hoàn chỉnh quy trình, không phát sinh lỗi hoặc thiếu sót.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-amber-100 bg-amber-50/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-xs">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">Chưa hoàn thành đầy đủ</h4>
                      <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                        Bạn bắt buộc phải hoàn thành toàn bộ các nhiệm vụ trên để tránh việc ngày hôm nay bị đánh giá là <b>"Thiếu sót trong quy trình làm việc"</b> trên bảng chấm công.
                      </p>
                    </div>
                  </div>
                )}
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
              <CardTitle className="text-lg font-bold text-slate-800">Quản lý nhiệm vụ mẫu</CardTitle>
              <CardDescription className="text-xs">
                Thiết lập các nhiệm vụ lặp lại hàng ngày bắt buộc phải tích chọn cho từng nhân sự.
              </CardDescription>
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Thêm Nhiệm Vụ Mới
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
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
                {templates.map((task) => (
                  <div key={task.id} className="flex justify-between items-center p-4 hover:bg-slate-50 gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${task.active ? "bg-green-500" : "bg-slate-300"}`} />
                        <h4 className={`text-sm font-semibold text-slate-800 break-words ${!task.active ? "text-slate-400 font-normal" : ""}`}>
                          {task.title}
                        </h4>
                      </div>
                      {task.description && (
                        <p className={`text-xs text-muted-foreground mt-1 ml-4 ${!task.active ? "text-slate-300" : ""}`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleTaskActive(task)}
                        className={`p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors`}
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
              <CardTitle className="text-lg font-bold text-slate-800">Lịch sử hoàn thành checklist</CardTitle>
              <CardDescription className="text-xs">
                Đối chiếu trạng thái hoàn thành checklist và số lỗi quy trình tính theo tháng.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={historyLoading}
              className="font-semibold text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${historyLoading ? "animate-spin" : ""}`} /> Tải lại
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            {historyLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                Đang đối chiếu dữ liệu lịch sử...
              </div>
            ) : !historyStats || !historyStats.dailyDetails || historyStats.dailyDetails.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu chấm công hoặc làm việc tháng này để đối chiếu lịch sử checklist.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border">
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ngày đi làm</span>
                    <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">{historyStats.daysWorked} ngày</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Giờ công</span>
                    <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">{historyStats.totalHours?.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Đi muộn</span>
                    <span className="text-xl font-extrabold text-amber-600 font-mono mt-0.5 block">{historyStats.lateCount} lần</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lỗi Quy Trình</span>
                    <span className="text-xl font-extrabold text-rose-600 font-mono mt-0.5 block">{historyStats.totalDeficiencies} ngày</span>
                  </div>
                </div>

                {/* Grid table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y text-sm">
                    <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Ngày</th>
                        <th className="px-4 py-3 text-center">Ca làm việc</th>
                        <th className="px-4 py-3 text-center">Giờ công</th>
                        <th className="px-4 py-3 text-right">Trạng thái Checklist</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y">
                      {historyStats.dailyDetails.map((day: any, idx: number) => {
                        const hasChecklistError = day.error && day.error.includes("Thiếu checklist");
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {new Date(day.date).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground text-xs">{day.shift || "N/A"}</td>
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Tạo nhiệm vụ checklist mẫu</DialogTitle>
              <DialogDescription className="text-xs">
                Thêm nhiệm vụ lặp lại hàng ngày mới gán cho quản lý.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">Tên nhiệm vụ (Bắt buộc)</Label>
                <Input
                  id="title"
                  placeholder="Ví dụ: Kiểm tra vệ sinh shop đầu ngày"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-700">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả các đầu việc cụ thể cần làm..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={actionLoading}>
                {actionLoading && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateTask}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Chỉnh sửa nhiệm vụ mẫu</DialogTitle>
              <DialogDescription className="text-xs">
                Sửa đổi tiêu đề hoặc mô tả của nhiệm vụ mẫu lặp lại hàng ngày.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-xs font-bold text-slate-700">Tên nhiệm vụ (Bắt buộc)</Label>
                <Input
                  id="edit-title"
                  placeholder="Ví dụ: Kiểm tra vệ sinh shop đầu ngày"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description" className="text-xs font-bold text-slate-700">Mô tả chi tiết</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Mô tả các đầu việc cụ thể cần làm..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsEditOpen(false); setEditingTask(null); }}>
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={actionLoading}>
                {actionLoading && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
