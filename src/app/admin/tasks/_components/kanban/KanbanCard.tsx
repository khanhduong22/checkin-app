"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, GripVertical } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { KanbanTaskItem } from "./types";

interface KanbanCardProps {
  item: KanbanTaskItem;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ item, onClick, isDragging: isDraggingOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const deadlineStatus = (() => {
    if (!item.deadline) return null;
    const d = new Date(item.deadline);
    if (isPast(d)) return "overdue";
    if (isWithinInterval(new Date(), { start: new Date(), end: addDays(d, 2) })) return "soon";
    return "ok";
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "bg-white rounded-lg border shadow-sm hover:shadow-md hover:border-blue-200 transition-all",
        "flex items-stretch",
        isDraggingOverlay && "shadow-2xl rotate-1 border-blue-400"
      )}
    >
      {/* Drag handle — only this area triggers drag */}
      <div
        {...listeners}
        className="flex items-center px-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors border-r"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Card body — click to open detail */}
      <button
        onClick={onClick}
        className="flex-1 text-left p-3 space-y-2 min-w-0"
      >
        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>

        {/* Type badge */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {item.taskDefinition.name}
        </Badge>

        {/* Assignee + Deadline row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[90px]">{item.assignee?.name ?? "Chưa assign"}</span>
          </div>

          {item.deadline && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 font-mono shrink-0",
              deadlineStatus === "overdue" && "bg-red-100 text-red-600",
              deadlineStatus === "soon" && "bg-yellow-100 text-yellow-700",
              deadlineStatus === "ok" && "bg-gray-100 text-gray-500",
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(item.deadline), "dd/MM")}
            </div>
          )}
        </div>

        {/* Reward */}
        <div className="text-[10px] text-emerald-600 font-semibold">
          💰 {item.taskDefinition.baseReward.toLocaleString()}đ
        </div>
      </button>
    </div>
  );
}
