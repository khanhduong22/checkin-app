"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { updateTaskItemStatus } from "@/actions/kanban-actions";
import { toast } from "sonner";
import type { KanbanTaskItem, KanbanUser } from "./types";

const COLUMNS = [
  { id: "OPEN", label: "📋 TODO", color: "bg-slate-100 border-slate-200" },
  { id: "IN_PROGRESS", label: "🔄 In Progress", color: "bg-blue-50 border-blue-200" },
  { id: "COMPLETED", label: "✅ Done", color: "bg-green-50 border-green-200" },
  { id: "CLOSED", label: "🔒 Closed", color: "bg-gray-100 border-gray-200" },
];

interface KanbanBoardProps {
  initialItems: KanbanTaskItem[];
  users: KanbanUser[];
}

export function KanbanBoard({ initialItems, users }: KanbanBoardProps) {
  const [items, setItems] = useState<KanbanTaskItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KanbanTaskItem | null>(null);

  // Sync when server re-renders
  useEffect(() => { setItems(initialItems); }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeCard = activeId ? items.find((i) => i.id === activeId) : null;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const newStatus = over.id as string;
    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem || draggedItem.status === newStatus) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === active.id ? { ...i, status: newStatus } : i))
    );

    const res = await updateTaskItemStatus(active.id as string, newStatus);
    if (!res.success) {
      toast.error("Failed to update status");
      // Revert
      setItems((prev) =>
        prev.map((i) =>
          i.id === active.id ? { ...i, status: draggedItem.status } : i
        )
      );
    }
  }

  function handleCardUpdate(updated: KanbanTaskItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(null);
  }

  function handleCardDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItem(null);
  }

  function handleCardCreate(newCard: KanbanTaskItem) {
    setItems((prev) => [newCard, ...prev]);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              items={items.filter((i) => i.status === col.id)}
              users={users}
              onCardClick={setSelectedItem}
              onCardCreate={handleCardCreate}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && (
            <KanbanCard item={activeCard} onClick={() => {}} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      <CardDetailDrawer
        item={selectedItem}
        users={users}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
      />
    </>
  );
}
