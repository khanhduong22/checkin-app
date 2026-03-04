"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Kanban } from "lucide-react";
import { MatrixView } from "./MatrixView";
import { ManagerKanbanBoard } from "./ManagerKanbanBoard";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { CreateTaskDialog } from "./CreateTaskDialog";
import type { MTask, MUser, Quadrant } from "./types";

interface ManagerTasksClientProps {
  initialTasks: MTask[];
  users: MUser[];
}

export function ManagerTasksClient({ initialTasks, users }: ManagerTasksClientProps) {
  const [tasks, setTasks] = useState<MTask[]>(initialTasks);
  const [view, setView] = useState<"matrix" | "kanban">("matrix");
  const [selectedTask, setSelectedTask] = useState<MTask | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultQuadrant, setDefaultQuadrant] = useState<{ isUrgent: boolean; isImportant: boolean } | undefined>();

  function handleCreated(task: MTask) {
    setTasks(prev => [task, ...prev]);
  }

  function handleUpdate(updated: MTask) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  }

  function handleDelete(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  }

  function handleAddFromQuadrant(q: Quadrant) {
    const map: Record<Quadrant, { isUrgent: boolean; isImportant: boolean }> = {
      q1: { isUrgent: true, isImportant: true },
      q2: { isUrgent: false, isImportant: true },
      q3: { isUrgent: true, isImportant: false },
      q4: { isUrgent: false, isImportant: false },
    };
    setDefaultQuadrant(map[q]);
    setCreateOpen(true);
  }

  const donePct = tasks.length > 0 ? Math.round(tasks.filter(t => t.status === "DONE").length / tasks.length * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{tasks.length}</span> tasks
            <span className="mx-1">·</span>
            <span className="text-green-600 font-semibold">{donePct}%</span> done
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "matrix" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Matrix
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === "kanban" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
          </div>
          <Button size="sm" onClick={() => { setDefaultQuadrant(undefined); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tạo Task
          </Button>
        </div>
      </div>

      {/* Views */}
      {view === "matrix" ? (
        <MatrixView
          tasks={tasks}
          users={users}
          onTaskClick={setSelectedTask}
          onAddClick={handleAddFromQuadrant}
          onTaskUpdate={handleUpdate}
        />
      ) : (
        <ManagerKanbanBoard
          tasks={tasks}
          users={users}
          onTaskClick={setSelectedTask}
          onTaskUpdate={handleUpdate}
        />
      )}

      {/* Drawers / Dialogs */}
      <TaskDetailDrawer
        task={selectedTask}
        users={users}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        defaultQuadrant={defaultQuadrant}
        onCreated={handleCreated}
      />
    </div>
  );
}
