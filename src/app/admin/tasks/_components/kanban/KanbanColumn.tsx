"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { createTaskItem } from "@/actions/task-actions";
import { toast } from "sonner";
import type { KanbanTaskItem, KanbanUser } from "./types";

interface ColumnDef {
  id: string;
  label: string;
  color: string;
}

interface KanbanColumnProps {
  column: ColumnDef;
  items: KanbanTaskItem[];
  users: KanbanUser[];
  onCardClick: (item: KanbanTaskItem) => void;
  onCardCreate: (item: KanbanTaskItem) => void;
}

export function KanbanColumn({ column, items, users, onCardClick, onCardCreate }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleQuickAdd() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      // Quick-add requires a taskDefId — for now use the first available from items or a placeholder
      // We'll create with an empty taskDefId check — server action handles validation
      toast.info("Dùng nút 'Post New Task' ở tab Items để chọn task type. Quick-add via Kanban sẽ hỗ trợ sau.");
    } finally {
      setLoading(false);
      setAdding(false);
      setTitle("");
    }
  }

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className={`rounded-t-xl px-3 py-2 border ${column.color} flex items-center justify-between`}>
        <span className="font-semibold text-sm">{column.label}</span>
        <span className="text-xs bg-white/60 rounded-full px-2 py-0.5 font-mono font-bold text-muted-foreground">
          {items.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[400px] rounded-b-xl border border-t-0 p-2 space-y-2 transition-colors
          ${column.color}
          ${isOver ? "ring-2 ring-blue-400 ring-inset bg-blue-50/40" : ""}
        `}
      >
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} onClick={() => onCardClick(item)} />
        ))}

        {/* Quick Add */}
        {column.id === "OPEN" && (
          adding ? (
            <div className="bg-white rounded-lg p-2 shadow-sm border space-y-2">
              <Input
                autoFocus
                placeholder="Tên task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); if (e.key === "Escape") setAdding(false); }}
                className="text-sm h-8"
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs" onClick={handleQuickAdd} disabled={loading}>Thêm</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Hủy</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-white/60 rounded-lg px-2 py-1.5 flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" /> Thêm task...
            </button>
          )
        )}
      </div>
    </div>
  );
}
