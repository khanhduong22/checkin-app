"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTaskItemFull, updateTaskItemStatus } from "@/actions/kanban-actions";
import { deleteTaskItem } from "@/actions/task-actions";
import { toast } from "sonner";
import { X, Trash2, Save } from "lucide-react";
import { format } from "date-fns";
import type { KanbanTaskItem, KanbanUser } from "./types";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "📋 TODO" },
  { value: "IN_PROGRESS", label: "🔄 In Progress" },
  { value: "COMPLETED", label: "✅ Done" },
  { value: "CLOSED", label: "🔒 Closed" },
];

interface CardDetailDrawerProps {
  item: KanbanTaskItem | null;
  users: KanbanUser[];
  onClose: () => void;
  onUpdate: (updated: KanbanTaskItem) => void;
  onDelete: (id: string) => void;
}

export function CardDetailDrawer({ item, users, onClose, onUpdate, onDelete }: CardDetailDrawerProps) {
  const [form, setForm] = useState({ title: "", description: "", deadline: "", assigneeId: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        description: item.description ?? "",
        deadline: item.deadline ? format(new Date(item.deadline), "yyyy-MM-dd'T'HH:mm") : "",
        assigneeId: item.assigneeId ?? "none",
        status: item.status,
      });
    }
  }, [item]);

  if (!item) return null;

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      const res = await updateTaskItemFull(item.id, {
        title: form.title,
        description: form.description || undefined,
        deadline: form.deadline ? new Date(form.deadline) : null,
        assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
        status: form.status,
      });
      if (res.success) {
        const updatedAssignee = users.find(u => u.id === form.assigneeId) ?? null;
        onUpdate({
          ...item,
          title: form.title,
          description: form.description || null,
          deadline: form.deadline ? new Date(form.deadline) : null,
          assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
          assignee: updatedAssignee as any,
          status: form.status,
        });
        toast.success("Đã lưu");
      } else {
        toast.error(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item || !confirm(`Xóa task "${item.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await deleteTaskItem(item.id);
      if (res.success) {
        onDelete(item.id);
        toast.success("Đã xóa task");
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-base">Chi tiết Task</h2>
            <Badge variant="outline" className="text-[10px] mt-0.5">{item.taskDefinition.name}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label>Tiêu đề</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <Label>Assign cho</Label>
            <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chưa assign" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Chưa assign —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <Label>Deadline</Label>
            <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Textarea
              rows={5}
              placeholder="Chi tiết công việc..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Reward info */}
          <div className="bg-emerald-50 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Reward:</span>{" "}
            <span className="font-bold text-emerald-700">{item.taskDefinition.baseReward.toLocaleString()}đ</span>
            <span className="text-muted-foreground"> / {item.taskDefinition.unit}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {deleting ? "Đang xóa..." : "Xóa"}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </>
  );
}
