"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { KanbanTaskItem } from "./types";

interface KanbanCardProps {
  item: KanbanTaskItem;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ item, onClick, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: dragging ? 0.4 : 1,
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
        "relative bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing group",
        "hover:shadow-md hover:border-blue-200 transition-all",
        isDragging && "shadow-2xl rotate-1 border-blue-400"
      )}
    >
      {/* Drag handle area (whole card) */}
      <div {...listeners} className="space-y-2">
        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>

        {/* Type badge */}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {item.taskDefinition.name}
        </Badge>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          {/* Assignee */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[90px]">{item.assignee?.name ?? "Chưa assign"}</span>
          </div>

          {/* Deadline */}
          {item.deadline && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 font-mono",
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
      </div>

      {/* Click to detail — separate layer */}
      <button
        className="absolute inset-0 rounded-lg"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        aria-label={`Open ${item.title}`}
      />
    </div>
  );
}
