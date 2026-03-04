"use client";

import { useState, useEffect } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User, GripVertical } from "lucide-react";
import { updateManagerTask } from "@/actions/manager-task-actions";
import { toast } from "sonner";
import type { MTask, MUser, Quadrant } from "./types";
import { QUADRANT_META, getQuadrant } from "./types";

const QUADRANTS: Quadrant[] = ["q1", "q2", "q3", "q4"];

const QUADRANT_FLAGS: Record<Quadrant, { isUrgent: boolean; isImportant: boolean }> = {
  q1: { isUrgent: true, isImportant: true },
  q2: { isUrgent: false, isImportant: true },
  q3: { isUrgent: true, isImportant: false },
  q4: { isUrgent: false, isImportant: false },
};

// ── Draggable Card ────────────────────────────────────────────
function MatrixCard({ task, onClick, onToggleDone }: {
  task: MTask;
  onClick: () => void;
  onToggleDone: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      className={cn(
        "bg-white rounded-lg border px-2 py-2 cursor-default group flex items-stretch",
        "hover:shadow-sm transition-all",
        task.status === "DONE" && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className="flex items-center pr-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button onClick={onClick} className="w-full text-left flex items-start gap-2">
          {/* Done checkbox */}
          <div
            onClick={onToggleDone}
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors cursor-pointer",
              task.status === "DONE" ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium leading-snug line-clamp-2", task.status === "DONE" && "line-through")}>{task.title}</p>
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
              {task.status === "DELEGATED" && <Badge variant="outline" className="text-[10px] px-1 py-0">👥</Badge>}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Droppable Quadrant ────────────────────────────────────────
function QuadrantZone({ q, tasks, onTaskClick, onAddClick, onToggleDone }: {
  q: Quadrant;
  tasks: MTask[];
  onTaskClick: (t: MTask) => void;
  onAddClick: () => void;
  onToggleDone: (task: MTask, e: React.MouseEvent) => void;
}) {
  const meta = QUADRANT_META[q];
  const { setNodeRef, isOver } = useDroppable({ id: q });

  return (
    <div className={`rounded-xl border-2 ${meta.color} flex flex-col overflow-hidden`}>
      <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
        <div>
          <span className="font-bold text-sm">{meta.label}</span>
          <p className="text-[10px] text-muted-foreground">{meta.sub}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-white/60 rounded-full px-2 py-0.5">{tasks.length}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onAddClick}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors min-h-[80px]",
          isOver && "bg-white/50 ring-2 ring-inset ring-blue-400"
        )}
      >
        {tasks.length === 0 && !isOver && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">Không có task</p>
        )}
        {tasks.map(task => (
          <MatrixCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            onToggleDone={(e) => onToggleDone(task, e)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Matrix View (main) ────────────────────────────────────────
interface MatrixViewProps {
  tasks: MTask[];
  users: MUser[];
  onTaskClick: (task: MTask) => void;
  onAddClick: (q: Quadrant) => void;
  onTaskUpdate: (updated: MTask) => void;
}

export function MatrixView({ tasks, users, onTaskClick, onAddClick, onTaskUpdate }: MatrixViewProps) {
  const [items, setItems] = useState<MTask[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => setItems(tasks), [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeTask = activeId ? items.find(t => t.id === activeId) : null;

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const newQ = over.id as Quadrant;
    const dragged = items.find(t => t.id === active.id);
    if (!dragged || getQuadrant(dragged) === newQ) return;

    const flags = QUADRANT_FLAGS[newQ];
    // Optimistic
    setItems(prev => prev.map(t => t.id === active.id ? { ...t, ...flags } : t));
    const res = await updateManagerTask(active.id as string, flags);
    if (!res.success) {
      toast.error("Lỗi cập nhật");
      setItems(prev => prev.map(t => t.id === active.id ? dragged : t));
    } else if (res.data) {
      onTaskUpdate(res.data as MTask);
    }
  }

  async function handleToggleDone(task: MTask, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    setItems(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    const res = await updateManagerTask(task.id, { status: newStatus });
    if (!res.success) {
      toast.error("Lỗi");
      setItems(prev => prev.map(t => t.id === task.id ? task : t));
    } else if (res.data) onTaskUpdate(res.data as MTask);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[calc(100vh-220px)] min-h-[500px]">
        {QUADRANTS.map(q => (
          <QuadrantZone
            key={q}
            q={q}
            tasks={items.filter(t => getQuadrant(t) === q)}
            onTaskClick={onTaskClick}
            onAddClick={() => onAddClick(q)}
            onToggleDone={handleToggleDone}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-white border-2 border-blue-400 shadow-2xl rounded-lg px-3 py-2 text-sm font-medium rotate-1 opacity-90">
            {activeTask.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
