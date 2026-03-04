"use client";

import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";
import { updateManagerTask } from "@/actions/manager-task-actions";
import { toast } from "sonner";
import type { MTask, MUser } from "./types";
import { QUADRANT_META, getQuadrant, type Quadrant } from "./types";

interface MatrixViewProps {
  tasks: MTask[];
  users: MUser[];
  onTaskClick: (task: MTask) => void;
  onAddClick: (q: Quadrant) => void;
  onTaskUpdate: (updated: MTask) => void;
}

const QUADRANTS: Quadrant[] = ["q1", "q2", "q3", "q4"];

export function MatrixView({ tasks, users, onTaskClick, onAddClick, onTaskUpdate }: MatrixViewProps) {
  async function handleStatusToggle(task: MTask, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    const res = await updateManagerTask(task.id, { status: newStatus });
    if (res.success && res.data) onTaskUpdate(res.data as MTask);
    else toast.error("Lỗi cập nhật");
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[calc(100vh-220px)] min-h-[500px]">
      {QUADRANTS.map((q) => {
        const meta = QUADRANT_META[q];
        const qTasks = tasks.filter(t => getQuadrant(t) === q);
        return (
          <div key={q} className={`rounded-xl border-2 ${meta.color} flex flex-col overflow-hidden`}>
            {/* Quadrant header */}
            <div className="px-4 py-3 border-b border-black/5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm">{meta.label}</span>
                  <p className="text-[10px] text-muted-foreground">{meta.sub}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-white/60 rounded-full px-2 py-0.5">{qTasks.length}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onAddClick(q)}
                    title="Thêm task"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {qTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 italic">Không có task</p>
              )}
              {qTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    "bg-white rounded-lg border px-3 py-2 cursor-pointer hover:shadow-sm transition-all group",
                    task.status === "DONE" && "opacity-60 line-through"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Done toggle */}
                    <button
                      onClick={(e) => handleStatusToggle(task, e)}
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors",
                        task.status === "DONE"
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-green-400"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.assignee && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" />{task.assignee.name}
                          </span>
                        )}
                        {task.deadline && (
                          <span className={cn(
                            "text-[10px] font-mono",
                            isPast(new Date(task.deadline)) && task.status !== "DONE" ? "text-red-500 font-bold" : "text-muted-foreground"
                          )}>
                            📅 {format(new Date(task.deadline), "dd/MM")}
                          </span>
                        )}
                        {task.status === "DELEGATED" && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">👥 Delegated</Badge>
                        )}
                        {task.subtasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">📎 {task.subtasks.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
