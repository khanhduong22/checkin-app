import React, { useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Package,
  Layers,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/lib/router";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  category: "shift" | "wfh" | "kpi";
  deadline?: string;
  reward?: string;
  completed: boolean;
}

export const TasksView: React.FC = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<"all" | "shift" | "wfh" | "kpi">("all");

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          if (next) {
            toast.success(`🎉 Hoàn thành: ${t.title}!`);
          }
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  const filtered = tasks.filter((t) => filter === "all" || t.category === filter);
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-3 pb-24 max-w-md mx-auto px-3 sm:px-4 pt-2 select-none">
      {/* Top Header with Back Button */}
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
          Nhiệm Vụ & Chỉ Tiêu KPI
        </h1>
      </div>

      {/* KPI Progress Card */}
      <div className="rounded-2xl bg-white/95 border border-orange-100/90 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900">Tiến Độ Hôm Nay</h2>
              <p className="text-[11px] text-stone-500">
                Đã xong {completedCount} / {tasks.length} nhiệm vụ
              </p>
            </div>
          </div>
          <span className="text-sm font-extrabold text-amber-800 font-mono">
            {progressPct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-orange-100/70 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Sub KPIs */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-orange-100/70">
          <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100/60 flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" />
            <div className="text-xs">
              <p className="text-stone-500 text-[10px]">Đóng gói đơn</p>
              <p className="font-bold text-stone-800">0 đơn</p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100/60 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <div className="text-xs">
              <p className="text-stone-500 text-[10px]">Bưng lầu kho</p>
              <p className="font-bold text-stone-800">0 lượt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: "Tất cả" },
          { id: "shift", label: "Ca trực" },
          { id: "wfh", label: "Job WFH" },
          { id: "kpi", label: "Chỉ tiêu KPI" },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              filter === btn.id
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-white/90 border border-orange-100 text-stone-600 hover:bg-orange-50/50"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white/60 rounded-2xl border border-dashed border-orange-200">
            <CheckCircle2 className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-stone-700">Chưa có nhiệm vụ nào hôm nay! ✨</p>
            <p className="text-[11px] text-stone-500 mt-0.5">Các nhiệm vụ phân công sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          filtered.map((task) => (
            <button
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`w-full p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all active:scale-[0.99] cursor-pointer ${
                task.completed
                  ? "bg-stone-50/70 border-stone-200/60 opacity-60"
                  : "bg-white border-orange-100/90 shadow-xs hover:border-amber-300"
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-lg flex items-center justify-center mt-0.5 border transition-colors ${
                  task.completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-stone-300 bg-white"
                }`}
              >
                {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1">
                <span
                  className={`text-xs font-semibold leading-relaxed block ${
                    task.completed ? "line-through text-stone-400" : "text-stone-800"
                  }`}
                >
                  {task.title}
                </span>

                <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                  {task.deadline && (
                    <span className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 border border-stone-200/50">
                      Hạn: {task.deadline}
                    </span>
                  )}
                  {task.reward && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-800 border border-amber-200 font-semibold">
                      {task.reward}
                    </span>
                  )}
                  <span className="px-1.5 py-0.2 rounded bg-orange-100/60 text-orange-800 uppercase font-bold text-[9px]">
                    {task.category}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksView;
