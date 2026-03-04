"use client";

import { useState, useEffect } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, User, Calendar } from "lucide-react";
import { format, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateManagerTask } from "@/actions/manager-task-actions";
import { toast } from "sonner";
import type { MTask, MUser } from "./types";
import { STATUS_COLUMNS, QUADRANT_META, getQuadrant } from "./types";

// ─── Kanban Card ────────────────────────────────────────────────
function MKCard({ task, onClick }: { task: MTask; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const qMeta = QUADRANT_META[getQuadrant(task)];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-all flex items-stretch"
    >
      <div {...listeners} className="flex items-center px-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/60 border-r">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <button onClick={onClick} className="flex-1 text-left p-2.5 space-y-1.5 min-w-0">
        <div className="flex items-start gap-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${qMeta.badge}`}>
            {qMeta.label.split(" ")[0]}
          </span>
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <User className="h-2.5 w-2.5" />
            {task.assignee?.name ?? "—"}
          </span>
          <span className={cn(
            "text-[10px] font-mono flex items-center gap-0.5",
            task.deadline && isPast(new Date(task.deadline)) && task.status !== "DONE" ? "text-red-500" : "text-muted-foreground"
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {task.deadline ? format(new Date(task.deadline), "dd/MM/yyyy") : "—"}
          </span>
        </div>
      </button>
    </div>
  );
}

// ─── Column ─────────────────────────────────────────────────────
function MKColumn({ colId, label, tasks, onCardClick }: { colId: string; label: string; tasks: MTask[]; onCardClick: (t: MTask) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div className="flex-shrink-0 w-68 flex flex-col" style={{ width: 270 }}>
      <div className="bg-gray-100 border rounded-t-xl px-3 py-2 flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs bg-white rounded-full px-2 py-0.5 font-mono">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[400px] border border-t-0 rounded-b-xl p-2 space-y-2 bg-gray-50 transition-colors",
          isOver && "ring-2 ring-blue-400 ring-inset bg-blue-50/30"
        )}
      >
        {tasks.map(t => <MKCard key={t.id} task={t} onClick={() => onCardClick(t)} />)}
      </div>
    </div>
  );
}

// ─── Board ──────────────────────────────────────────────────────
interface ManagerKanbanBoardProps {
  tasks: MTask[];
  users: MUser[];
  onTaskClick: (task: MTask) => void;
  onTaskUpdate: (updated: MTask) => void;
}

export function ManagerKanbanBoard({ tasks, users, onTaskClick, onTaskUpdate }: ManagerKanbanBoardProps) {
  const [items, setItems] = useState<MTask[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => setItems(tasks), [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeCard = activeId ? items.find(i => i.id === activeId) : null;

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const newStatus = over.id as string;
    const dragged = items.find(i => i.id === active.id);
    if (!dragged || dragged.status === newStatus) return;

    setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: newStatus } : i));
    const res = await updateManagerTask(active.id as string, { status: newStatus });
    if (!res.success) {
      toast.error("Lỗi cập nhật");
      setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: dragged.status } : i));
    } else if (res.data) {
      onTaskUpdate(res.data as MTask);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as string)}
      onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map(col => (
          <MKColumn
            key={col.id}
            colId={col.id}
            label={col.label}
            tasks={items.filter(t => t.status === col.id)}
            onCardClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && <div className="bg-white border shadow-xl rounded-lg p-3 text-sm font-medium opacity-90">{activeCard.title}</div>}
      </DragOverlay>
    </DndContext>
  );
}
