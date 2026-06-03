"use client";

import { useState, useEffect } from "react";
import { type StaffTask, COLUMNS, type StaffPerformanceStats } from "./types";
import { updateStaffTask, getStaffTaskPerformanceStats } from "@/actions/staff-task-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, AlertCircle, FileText, CheckCircle2, Play, Send, RefreshCw, X } from "lucide-react";
import { format, isPast } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StaffTaskClient({ initialTasks, userId }: { initialTasks: StaffTask[]; userId: string }) {
  const [tasks, setTasks] = useState<StaffTask[]>(initialTasks);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<"THIS_WEEK" | "NEXT_WEEK" | "ALL">("THIS_WEEK");
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    monthly: StaffPerformanceStats;
    weekly: StaffPerformanceStats;
  } | null>(null);

  // Fetch performance stats
  const fetchStats = async () => {
    const res = await getStaffTaskPerformanceStats(userId);
    if (res.success && res.data) {
      setStats(res.data);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [tasks]);

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    setLoading(true);
    const prevTasks = [...tasks];
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus, submittedAt: nextStatus === "DONE" ? new Date() : t.submittedAt } : t));

    const res = await updateStaffTask(taskId, { status: nextStatus });
    setLoading(false);
    
    if (res.success && res.data) {
      toast.success("Cập nhật trạng thái thành công!");
      setTasks(prev => prev.map(t => t.id === taskId ? (res.data as StaffTask) : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(res.data as StaffTask);
      }
    } else {
      toast.error(res.error || "Gặp lỗi cập nhật trạng thái");
      setTasks(prevTasks); // Rollback
    }
  };

  const fPercent = (val: number) => `${Math.round(val * 100)}%`;

  return (
    <div className="space-y-6">
      {/* KPI Stats widgets */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly KPI Widget */}
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold text-indigo-900 uppercase tracking-wider">Hiệu suất KPI Tháng Này</CardTitle>
                <Badge variant="outline" className="bg-indigo-100/50 text-indigo-700 border-indigo-200">Tháng {new Date().getMonth() + 1}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-extrabold text-indigo-950 font-mono">{fPercent(stats.monthly.completionRate)}</span>
                <span className="text-xs text-muted-foreground">
                  Đã duyệt: <b>{stats.monthly.approved}</b> / {stats.monthly.total} nhiệm vụ
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.monthly.completionRate * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Tiến độ lương cứng WFH</span>
                  <span className="font-bold text-indigo-700">Đạt {fPercent(stats.monthly.completionRate)} lương KPI</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-indigo-50 border-dashed">
                <div>Đang làm: <span className="font-bold text-blue-600">{stats.monthly.doing}</span></div>
                <div>Chờ duyệt: <span className="font-bold text-amber-600">{stats.monthly.pendingReview}</span></div>
                {stats.monthly.overdue > 0 && (
                  <div className="text-rose-600 font-semibold animate-pulse">Trễ hạn: {stats.monthly.overdue}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly KPI Widget */}
          <Card className="border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-white shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-semibold text-sky-900 uppercase tracking-wider">Hiệu suất Chỉ tiêu Tuần Này</CardTitle>
                <Badge variant="outline" className="bg-sky-100/50 text-sky-700 border-sky-200">Tuần hiện tại</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-extrabold text-sky-950 font-mono">{fPercent(stats.weekly.completionRate)}</span>
                <span className="text-xs text-muted-foreground">
                  Đã duyệt: <b>{stats.weekly.approved}</b> / {stats.weekly.total} nhiệm vụ
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border">
                  <div 
                    className="bg-sky-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${stats.weekly.completionRate * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Tỷ lệ hoàn thành công việc tuần</span>
                  <span>Đã duyệt: {stats.weekly.approved}</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-sky-50 border-dashed">
                <div>Đang làm: <span className="font-bold text-blue-600">{stats.weekly.doing}</span></div>
                <div>Chờ duyệt: <span className="font-bold text-amber-600">{stats.weekly.pendingReview}</span></div>
                {stats.weekly.overdue > 0 && (
                  <div className="text-rose-600 font-semibold animate-pulse">Trễ hạn: {stats.weekly.overdue}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Week Selector Tab/Dropdown */}
      <div className="flex justify-end bg-white p-3 rounded-xl border shadow-xs items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="h-4 w-4 text-indigo-500" /> Xem theo tuần:
        </div>
        <select
          value={selectedWeekFilter}
          onChange={e => setSelectedWeekFilter(e.target.value as any)}
          className="border rounded-lg text-xs px-3 py-1.5 bg-white outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
        >
          <option value="THIS_WEEK">Tuần này</option>
          <option value="NEXT_WEEK">Tuần sau</option>
          <option value="ALL">Tất cả thời gian</option>
        </select>
      </div>

      {/* Kanban Board columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {COLUMNS.map(col => {
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

          const filteredTasksByWeek = tasks.filter(t => {
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

          const colTasks = filteredTasksByWeek.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col" style={{ width: 290 }}>
              <div className="bg-gray-100/90 border border-b-0 rounded-t-xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
                <span className="font-bold text-sm text-gray-800">{col.label}</span>
                <Badge variant="secondary" className="font-mono bg-white font-bold">{colTasks.length}</Badge>
              </div>
              <div className="flex-1 min-h-[420px] border rounded-b-xl p-3 space-y-3 bg-slate-50/50 shadow-2xs">
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
                          <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className={task.deadline && isPast(new Date(task.deadline)) && task.status !== "APPROVED" ? "text-rose-600 font-bold" : ""}>
                              {task.deadline ? format(new Date(task.deadline), "dd/MM/yyyy") : "Không có hạn"}
                            </span>
                          </div>
                          {task.status === "REJECTED" && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Cần sửa lại</Badge>
                          )}
                        </div>

                        {/* Quick action buttons for Kanban board */}
                        <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                          {task.status === "TODO" && (
                            <Button 
                              size="sm" 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-7 text-[10px] gap-1"
                              onClick={() => handleStatusChange(task.id, "DOING")}
                              disabled={loading}
                            >
                              <Play className="h-2.5 w-2.5" /> Bắt đầu
                            </Button>
                          )}
                          {task.status === "DOING" && (
                            <Button 
                              size="sm" 
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-7 text-[10px] gap-1"
                              onClick={() => handleStatusChange(task.id, "DONE")}
                              disabled={loading}
                            >
                              <Send className="h-2.5 w-2.5" /> Nộp báo cáo
                            </Button>
                          )}
                          {task.status === "REJECTED" && (
                            <Button 
                              size="sm" 
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-7 text-[10px] gap-1"
                              onClick={() => handleStatusChange(task.id, "DOING")}
                              disabled={loading}
                            >
                              <RefreshCw className="h-2.5 w-2.5" /> Làm lại
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(v) => { if (!v) setSelectedTask(null); }}>
        {selectedTask && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-lg font-bold leading-snug">{selectedTask.title}</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                <span>Người giao: <b>{selectedTask.createdBy.name}</b></span>
                <span>•</span>
                <span>Tạo lúc: {format(new Date(selectedTask.createdAt), "dd/MM/yyyy HH:mm")}</span>
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
                    <span className={selectedTask.deadline && isPast(new Date(selectedTask.deadline)) && selectedTask.status !== "APPROVED" ? "text-rose-600 font-bold animate-pulse" : ""}>
                      {selectedTask.deadline ? format(new Date(selectedTask.deadline), "dd/MM/yyyy") : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3 bg-slate-50 border p-3 rounded-lg">
                <h5 className="font-bold text-gray-700 text-xs uppercase tracking-wide shrink-0">Trạng thái:</h5>
                <Badge className={COLUMNS.find(c => c.id === selectedTask.status)?.color}>
                  {COLUMNS.find(c => c.id === selectedTask.status)?.label}
                </Badge>
                {selectedTask.submittedAt && (
                  <span className="text-[10px] text-muted-foreground">Nộp lúc: {format(new Date(selectedTask.submittedAt), "dd/MM/yyyy HH:mm")}</span>
                )}
              </div>

              {/* Rejection Note */}
              {selectedTask.status === "REJECTED" && selectedTask.adminNote && (
                <div className="border border-red-200 bg-red-50/50 rounded-lg p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase">
                    <AlertCircle className="h-4 w-4" /> Yêu cầu sửa đổi từ Admin
                  </div>
                  <p className="text-sm text-red-900 mt-1 italic">"{selectedTask.adminNote}"</p>
                </div>
              )}

              {/* Admin General Note (for approved tasks) */}
              {selectedTask.status === "APPROVED" && selectedTask.adminNote && (
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs uppercase">
                    <CheckCircle2 className="h-4 w-4" /> Ghi chú duyệt
                  </div>
                  <p className="text-sm text-emerald-950 mt-1">"{selectedTask.adminNote}"</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSelectedTask(null)}>Đóng</Button>
              {selectedTask.status === "TODO" && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  onClick={() => handleStatusChange(selectedTask.id, "DOING")}
                  disabled={loading}
                >
                  <Play className="h-3 w-3 mr-1" /> Bắt đầu làm
                </Button>
              )}
              {selectedTask.status === "DOING" && (
                <Button 
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  onClick={() => handleStatusChange(selectedTask.id, "DONE")}
                  disabled={loading}
                >
                  <Send className="h-3 w-3 mr-1" /> Nộp báo cáo
                </Button>
              )}
              {selectedTask.status === "REJECTED" && (
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  onClick={() => handleStatusChange(selectedTask.id, "DOING")}
                  disabled={loading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Bắt đầu làm lại
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
