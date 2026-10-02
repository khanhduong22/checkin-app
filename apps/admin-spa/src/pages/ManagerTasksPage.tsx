import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface ManagerTaskItem {
  id: string;
  title: string;
  category: "DAILY" | "WEEKLY" | "MONTHLY" | "INCIDENT";
  quadrant: "q1" | "q2" | "q3" | "q4";
  assigneeName: string;
  dueDate: string;
  status: "TODO" | "DOING" | "DONE";
}

const QUADRANTS = {
  q1: {
    label: "🔴 DO NOW (Khẩn cấp & Quan trọng)",
    bg: "bg-red-50/60 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  q2: {
    label: "🟡 LÊN KẾ HOẠCH (Quan trọng, không khẩn)",
    bg: "bg-amber-50/60 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  q3: {
    label: "🔵 GIAO VIỆC (Khẩn, ít quan trọng)",
    bg: "bg-blue-50/60 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  q4: {
    label: "⚫ LOẠI BỎ (Không khẩn, không quan trọng)",
    bg: "bg-gray-50/60 border-gray-200",
    badge: "bg-gray-100 text-gray-700",
  },
};

export function ManagerTasksPage() {
  const [tasks, setTasks] = useState<ManagerTaskItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "DONE">("ALL");
  const [newTitle, setNewTitle] = useState("");
  const [newQuadrant, setNewQuadrant] = useState<"q1" | "q2" | "q3" | "q4">("q1");

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === "DONE" ? "TODO" : "DONE";
          toast.success(
            nextStatus === "DONE"
              ? "Đã hoàn thành công việc quản lý!"
              : "Đã đánh dấu cần làm lại"
          );
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: ManagerTaskItem = {
      id: `mt-${Date.now()}`,
      title: newTitle.trim(),
      category: "DAILY",
      quadrant: newQuadrant,
      assigneeName: "Admin",
      dueDate: "Hôm nay",
      status: "TODO",
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle("");
    toast.success("Đã thêm công việc mới vào checklist quản lý!");
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "TODO") return t.status !== "DONE";
    if (filter === "DONE") return t.status === "DONE";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Checklist Quản Lý
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hệ thống checklist công việc hàng ngày bắt buộc dành cho nhân sự quản lý và vận hành.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "ALL" ? "default" : "outline"}
            onClick={() => setFilter("ALL")}
            className="rounded-lg"
          >
            Tất cả ({tasks.length})
          </Button>
          <Button
            size="sm"
            variant={filter === "TODO" ? "default" : "outline"}
            onClick={() => setFilter("TODO")}
            className="rounded-lg"
          >
            Chưa xong ({tasks.filter((t) => t.status !== "DONE").length})
          </Button>
          <Button
            size="sm"
            variant={filter === "DONE" ? "default" : "outline"}
            onClick={() => setFilter("DONE")}
            className="rounded-lg"
          >
            Đã xong ({tasks.filter((t) => t.status === "DONE").length})
          </Button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleAddTask} className="flex gap-2 bg-white p-3 rounded-xl border shadow-sm">
        <Input
          placeholder="Thêm nhanh việc quản lý cần làm..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-sm"
        />
        <select
          value={newQuadrant}
          onChange={(e) => setNewQuadrant(e.target.value as any)}
          aria-label="Chọn nhóm ưu tiên công việc"
          className="text-xs font-medium border rounded-lg px-2 bg-gray-50 text-slate-700 outline-none"
        >
          <option value="q1">🔴 Khẩn + Quan trọng</option>
          <option value="q2">🟡 Kế hoạch / Dự phòng</option>
          <option value="q3">🔵 Giao việc</option>
          <option value="q4">⚫ Khác</option>
        </select>
        <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-medium">
          <Plus className="w-4 h-4 mr-1" /> Thêm việc
        </Button>
      </form>

      {/* Eisenhower Matrix Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["q1", "q2", "q3", "q4"] as const).map((qKey) => {
          const meta = QUADRANTS[qKey];
          const qTasks = filteredTasks.filter((t) => t.quadrant === qKey);

          return (
            <Card key={qKey} className={`shadow-sm ${meta.bg}`}>
              <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">
                    {meta.label}
                  </CardTitle>
                </div>
                <Badge variant="outline" className={`text-xs ${meta.badge}`}>
                  {qTasks.length} việc
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {qTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">
                    Không có công việc nào trong nhóm này
                  </p>
                ) : (
                  qTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl bg-white border transition-all cursor-pointer hover:border-orange-300 shadow-sm ${
                        task.status === "DONE" ? "opacity-60 bg-gray-50/80" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.status === "DONE"}
                        onChange={() => {}} // handled by parent onClick
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.status === "DONE"
                              ? "line-through text-muted-foreground"
                              : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-500" />
                            {task.dueDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            {task.assigneeName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
