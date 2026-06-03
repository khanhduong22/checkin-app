"use client";

import { useState, useEffect } from "react";
import { type StaffTask, COLUMNS, type StaffPerformanceStats } from "./types";
import { 
  createStaffTask, 
  updateStaffTask, 
  deleteStaffTask, 
  getStaffTaskPerformanceStats 
} from "@/actions/staff-task-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, User, Plus, Edit2, Trash2, Check, RotateCcw, Filter, UserCheck, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserOption {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  staffTasksAllowed: boolean;
}

export default function AdminStaffTaskClient({ 
  initialTasks, 
  users 
}: { 
  initialTasks: StaffTask[]; 
  users: UserOption[]; 
}) {
  const allowedUsers = users.filter(u => u.staffTasksAllowed);

  const [tasks, setTasks] = useState<StaffTask[]>(initialTasks);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("ALL");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<"THIS_WEEK" | "NEXT_WEEK" | "ALL">("THIS_WEEK");
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states for creating/editing
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assigneeId: allowedUsers[0]?.id || "",
    startDate: "",
    deadline: "",
    adminNote: ""
  });

  // Performance stats per employee
  const [userStats, setUserStats] = useState<Record<string, {
    monthly: StaffPerformanceStats;
    weekly: StaffPerformanceStats;
  }>>({});

  const fetchStatsForAll = async () => {
    const statsMap: any = {};
    for (const u of allowedUsers) {
      const res = await getStaffTaskPerformanceStats(u.id);
      if (res.success && res.data) {
        statsMap[u.id] = res.data;
      }
    }
    setUserStats(statsMap);
  };

  useEffect(() => {
    fetchStatsForAll();
  }, [tasks]);

  const handleOpenCreate = () => {
    setFormMode("CREATE");
    setTaskForm({
      title: "",
      description: "",
      assigneeId: allowedUsers[0]?.id || "",
      startDate: "",
      deadline: "",
      adminNote: ""
    });
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (task: StaffTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode("EDIT");
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      assigneeId: task.assigneeId,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
      deadline: task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",
      adminNote: task.adminNote || ""
    });
    setShowCreateDialog(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    if (!taskForm.assigneeId) {
      toast.error("Vui lòng chọn nhân sự");
      return;
    }

    setLoading(true);
    const dataInput = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      assigneeId: taskForm.assigneeId,
      startDate: taskForm.startDate ? new Date(taskForm.startDate) : null,
      deadline: taskForm.deadline ? new Date(taskForm.deadline) : null,
      adminNote: taskForm.adminNote.trim() || null
    };

    if (formMode === "CREATE") {
      const res = await createStaffTask(dataInput);
      setLoading(false);
      if (res.success && res.data) {
        toast.success("Tạo nhiệm vụ thành công!");
        setTasks(prev => [res.data as StaffTask, ...prev]);
        setShowCreateDialog(false);
      } else {
        toast.error(res.error || "Gặp lỗi tạo nhiệm vụ");
      }
    } else {
      if (!selectedTask) return;
      const res = await updateStaffTask(selectedTask.id, dataInput);
      setLoading(false);
      if (res.success && res.data) {
        toast.success("Cập nhật nhiệm vụ thành công!");
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? (res.data as StaffTask) : t));
        setShowCreateDialog(false);
        setSelectedTask(null);
      } else {
        toast.error(res.error || "Gặp lỗi cập nhật");
      }
    }
  };

  const handleDelete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa nhiệm vụ này không?")) return;
    setLoading(true);
    const res = await deleteStaffTask(taskId);
    setLoading(false);
    if (res.success) {
      toast.success("Xóa nhiệm vụ thành công!");
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } else {
      toast.error(res.error || "Gặp lỗi xóa nhiệm vụ");
    }
  };

  const handleApprove = async (task: StaffTask, e: React.MouseEvent | React.FormEvent) => {
    if (e.stopPropagation) e.stopPropagation();
    setLoading(true);
    const res = await updateStaffTask(task.id, { status: "APPROVED", adminNote: taskForm.adminNote || task.adminNote });
    setLoading(false);
    if (res.success && res.data) {
      toast.success("Đã duyệt hoàn thành!");
      setTasks(prev => prev.map(t => t.id === task.id ? (res.data as StaffTask) : t));
      setSelectedTask(res.data as StaffTask);
    } else {
      toast.error(res.error || "Lỗi phê duyệt");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectNote.trim()) {
      toast.error("Vui lòng nhập yêu cầu chỉnh sửa");
      return;
    }
    if (!selectedTask) return;

    setLoading(true);
    const res = await updateStaffTask(selectedTask.id, { status: "REJECTED", adminNote: rejectNote.trim() });
    setLoading(false);
    
    if (res.success && res.data) {
      toast.success("Đã gửi yêu cầu làm lại cho nhân viên");
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? (res.data as StaffTask) : t));
      setSelectedTask(res.data as StaffTask);
      setShowRejectDialog(false);
      setRejectNote("");
    } else {
      toast.error(res.error || "Lỗi xử lý yêu cầu chỉnh sửa");
    }
  };

  // Weekly range boundary calculations (Mon-Sun in Vietnam time)
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);

  const currentDay = vnNow.getUTCDay(); // 0 = Sun, 1 = Mon... 6 = Sat
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const thisWeekStartLocal = new Date(vnNow);
  thisWeekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
  thisWeekStartLocal.setUTCHours(0, 0, 0, 0);
  const thisWeekStart = new Date(thisWeekStartLocal.getTime() - VN_OFFSET_MS);

  const thisWeekEndLocal = new Date(thisWeekStartLocal);
  thisWeekEndLocal.setUTCDate(thisWeekStartLocal.getUTCDate() + 6);
  thisWeekEndLocal.setUTCHours(23, 59, 59, 999);
  const thisWeekEnd = new Date(thisWeekEndLocal.getTime() - VN_OFFSET_MS);

  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(thisWeekStart.getDate() + 7);

  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const filteredTasks = tasks.filter(t => {
    // 1. User Filter
    if (selectedUserFilter !== "ALL" && t.assigneeId !== selectedUserFilter) {
      return false;
    }
    
    // 2. Week Filter
    const taskStart = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
    const taskEnd = t.deadline ? new Date(t.deadline) : taskStart;
    
    if (selectedWeekFilter === "THIS_WEEK") {
      return taskStart <= thisWeekEnd && taskEnd >= thisWeekStart;
    }
    if (selectedWeekFilter === "NEXT_WEEK") {
      return taskStart <= nextWeekEnd && taskEnd >= nextWeekStart;
    }
    return true;
  });

  const fPercent = (val: number) => `${Math.round((val || 0) * 100)}%`;

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Filter className="h-4 w-4" /> Lọc nhân sự:
          </div>
          <select
            value={selectedUserFilter}
            onChange={e => setSelectedUserFilter(e.target.value)}
            className="border rounded-lg text-sm px-3 py-2 bg-white outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả nhân sự được giao việc</option>
            {allowedUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-0 md:ml-4">
            <Calendar className="h-4 w-4 text-indigo-500" /> Lọc thời gian:
          </div>
          <select
            value={selectedWeekFilter}
            onChange={e => setSelectedWeekFilter(e.target.value as any)}
            className="border rounded-lg text-sm px-3 py-2 bg-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="THIS_WEEK">Tuần này</option>
            <option value="NEXT_WEEK">Tuần sau</option>
            <option value="ALL">Tất cả thời gian</option>
          </select>
        </div>

        <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> Giao nhiệm vụ mới
        </Button>
      </div>

      {/* KPI Performance Overview for Admins (Only visible when ALL is selected) */}
      {selectedUserFilter === "ALL" && (
        <Card className="border-indigo-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <UserCheck className="h-4 w-4 text-indigo-600" /> Báo cáo hiệu suất nhân sự tháng này
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Tỷ lệ hoàn thành công việc khoán của các nhân viên được chỉ định.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {allowedUsers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">
                Chưa có nhân viên nào được cấp quyền giao việc khoán/KPI.
              </div>
            ) : (
              <div className="divide-y">
                {allowedUsers.map(u => {
                  const stats = userStats[u.id];
                  return (
                    <div key={u.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                          {u.name?.[0] || "?"}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-sm">{u.name}</span>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>

                      {stats ? (
                        <div className="flex-1 max-w-md w-full grid grid-cols-2 gap-4">
                          {/* Month Stats */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-700 font-medium">
                              <span>Tháng: <b>{fPercent(stats.monthly.completionRate)}</b></span>
                              <span className="text-[10px] text-muted-foreground">{stats.monthly.approved}/{stats.monthly.total} việc</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${stats.monthly.completionRate * 100}%` }} />
                            </div>
                          </div>

                          {/* Week Stats */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-700 font-medium">
                              <span>Tuần: <b>{fPercent(stats.weekly.completionRate)}</b></span>
                              <span className="text-[10px] text-muted-foreground">{stats.weekly.approved}/{stats.weekly.total} việc</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                              <div className="bg-sky-600 h-full rounded-full" style={{ width: `${stats.weekly.completionRate * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Đang tải số liệu...</div>
                      )}

                      {stats && stats.monthly.overdue > 0 && (
                        <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1 text-[10px] shrink-0 font-bold">
                          ⚠️ {stats.monthly.overdue} việc quá hạn
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Specific Employee Performance Stats */}
      {selectedUserFilter !== "ALL" && userStats[selectedUserFilter] && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly KPI */}
          <Card className="border-indigo-100 bg-slate-50/20 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-xs font-bold text-indigo-950 uppercase tracking-wide">
                <span>Hiệu suất KPI Tháng Này</span>
                <span>{fPercent(userStats[selectedUserFilter].monthly.completionRate)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${userStats[selectedUserFilter].monthly.completionRate * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Hoàn thành: <b>{userStats[selectedUserFilter].monthly.approved}</b> / {userStats[selectedUserFilter].monthly.total} việc được giao trong tháng này.
              </p>
            </CardContent>
          </Card>

          {/* Weekly KPI */}
          <Card className="border-sky-100 bg-slate-50/20 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-xs font-bold text-sky-950 uppercase tracking-wide">
                <span>Hiệu suất KPI Tuần Này</span>
                <span>{fPercent(userStats[selectedUserFilter].weekly.completionRate)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                <div className="bg-sky-600 h-full rounded-full" style={{ width: `${userStats[selectedUserFilter].weekly.completionRate * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Hoàn thành: <b>{userStats[selectedUserFilter].weekly.approved}</b> / {userStats[selectedUserFilter].weekly.total} việc được giao trong tuần này.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col" style={{ width: 290 }}>
              <div className="bg-gray-100/90 border border-b-0 rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
                <span className="font-bold text-sm text-gray-800">{col.label}</span>
                <Badge variant="secondary" className="font-mono bg-white font-bold">{colTasks.length}</Badge>
              </div>
              <div className="flex-1 min-h-[400px] border rounded-b-xl p-3 space-y-3 bg-slate-50/50 shadow-2xs">
                {colTasks.length === 0 ? (
                  <div className="h-[120px] border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground italic p-4 text-center">
                    Không có nhiệm vụ
                  </div>
                ) : (
                  colTasks.map(task => (
                    <Card 
                      key={task.id} 
                      className="hover:shadow-md hover:scale-[1.01] transition-all duration-200 border-slate-200/80 cursor-pointer overflow-hidden bg-white"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="p-3.5 space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
                              {task.assignee.name}
                            </span>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-indigo-600" onClick={(e) => handleOpenEdit(task, e)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-red-600" onClick={(e) => handleDelete(task.id, e)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 mt-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>
                              {task.deadline ? format(new Date(task.deadline), "dd/MM/yyyy") : "Không có hạn"}
                            </span>
                          </div>
                          {task.status === "DONE" && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 font-bold animate-pulse">Cần duyệt</Badge>
                          )}
                        </div>

                        {/* Direct actions for quick review */}
                        {task.status === "DONE" && (
                          <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                            <Button 
                              size="sm" 
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[10px] gap-1"
                              onClick={(e) => handleApprove(task, e)}
                              disabled={loading}
                            >
                              <Check className="h-3 w-3" /> Duyệt
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-7 text-[10px] gap-1"
                              onClick={() => { setSelectedTask(task); setShowRejectDialog(true); }}
                              disabled={loading}
                            >
                              <RotateCcw className="h-3 w-3" /> Trả lại
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation & Edit Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {formMode === "CREATE" ? "Giao nhiệm vụ mới" : "Chỉnh sửa nhiệm vụ"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {formMode === "CREATE" ? "Tạo và giao một đầu việc khoán cho nhân viên." : "Chỉnh sửa thông tin nhiệm vụ."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label htmlFor="task-title">Tiêu đề nhiệm vụ <span className="text-red-500">*</span></Label>
              <Input 
                id="task-title"
                value={taskForm.title}
                onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="VD: Đăng 3 bài viết Facebook mới..."
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-desc">Mô tả chi tiết</Label>
              <Textarea 
                id="task-desc"
                value={taskForm.description}
                onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Yêu cầu cụ thể, đường link, số lượng, lưu ý..."
                rows={4}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-assignee">Giao cho nhân viên <span className="text-red-500">*</span></Label>
              <select
                id="task-assignee"
                value={taskForm.assigneeId}
                onChange={e => setTaskForm(prev => ({ ...prev, assigneeId: e.target.value }))}
                className="w-full border rounded-lg p-2 bg-white"
                required
              >
                {allowedUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="task-start">Ngày bắt đầu</Label>
                <Input 
                  id="task-start"
                  type="date"
                  value={taskForm.startDate}
                  onChange={e => setTaskForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-deadline">Hạn chót</Label>
                <Input 
                  id="task-deadline"
                  type="date"
                  value={taskForm.deadline}
                  onChange={e => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            {formMode === "EDIT" && (
              <div className="space-y-1">
                <Label htmlFor="task-note">Ghi chú duyệt/trả lại</Label>
                <Input 
                  id="task-note"
                  value={taskForm.adminNote}
                  onChange={e => setTaskForm(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="Ghi chú phản hồi cho nhân viên..."
                />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" disabled={loading}>
                {loading ? "Đang lưu..." : "Lưu lại"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog (Read-only / Review) */}
      <Dialog open={!!selectedTask && !showCreateDialog && !showRejectDialog} onOpenChange={(v) => { if (!v) setSelectedTask(null); }}>
        {selectedTask && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold leading-snug">{selectedTask.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex flex-col gap-1.5 pt-1.5">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Nhân viên: <b>{selectedTask.assignee.name}</b> ({selectedTask.assignee.email})
                </div>
                <span>Tạo lúc: {format(new Date(selectedTask.createdAt), "dd/MM/yyyy HH:mm")} bởi {selectedTask.createdBy.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-sm">
              {/* Description */}
              <div className="space-y-1">
                <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Mô tả nhiệm vụ</h5>
                <div className="bg-slate-50 border rounded-lg p-3 text-sm whitespace-pre-wrap text-slate-800">
                  {selectedTask.description || <span className="text-muted-foreground italic">Không có mô tả chi tiết.</span>}
                </div>
              </div>

              {/* Deadlines */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Ngày bắt đầu</h5>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border p-2 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {selectedTask.startDate ? format(new Date(selectedTask.startDate), "dd/MM/yyyy") : "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Hạn chót</h5>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border p-2 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedTask.deadline ? format(new Date(selectedTask.deadline), "dd/MM/yyyy") : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 bg-slate-50 border p-3 rounded-lg">
                <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide shrink-0">Trạng thái:</h5>
                <Badge className={COLUMNS.find(c => c.id === selectedTask.status)?.color}>
                  {COLUMNS.find(c => c.id === selectedTask.status)?.label}
                </Badge>
                {selectedTask.submittedAt && (
                  <span className="text-[10px] text-muted-foreground">Nộp lúc: {format(new Date(selectedTask.submittedAt), "dd/MM/yyyy HH:mm")}</span>
                )}
              </div>

              {/* Admin Note */}
              {selectedTask.adminNote && (
                <div className="bg-slate-50 border rounded-lg p-3">
                  <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide">Ghi chú phản hồi / Duyệt</h5>
                  <p className="text-sm mt-1 text-slate-800 italic">"{selectedTask.adminNote}"</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSelectedTask(null)}>Đóng</Button>
              <Button variant="destructive" className="gap-1" onClick={(e) => handleDelete(selectedTask.id, e)} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" /> Xóa
              </Button>
              <Button variant="outline" className="gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={(e) => handleOpenEdit(selectedTask, e)}>
                <Edit2 className="h-3.5 w-3.5" /> Sửa
              </Button>
              {selectedTask.status === "DONE" && (
                <>
                  <Button 
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={loading}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Trả lại sửa
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={(e) => handleApprove(selectedTask, e)}
                    disabled={loading}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Duyệt đạt
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-1.5 text-rose-700">
              <AlertCircle className="h-5 w-5" /> Yêu cầu sửa đổi
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập lý do hoặc hướng dẫn chỉnh sửa để gửi lại cho nhân viên.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="reject-note" className="text-xs font-semibold text-gray-700">Yêu cầu chỉnh sửa cụ thể <span className="text-red-500">*</span></Label>
              <Textarea 
                id="reject-note"
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="VD: Thiếu link bài đăng Tiktok số 3, đăng lại video có chèn hashtag..."
                rows={3}
                required
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowRejectDialog(false)}>Hủy</Button>
              <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" disabled={loading}>
                Gửi yêu cầu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
