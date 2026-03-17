"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { updateManagerTask, deleteManagerTask } from "@/actions/manager-task-actions";
import { toast } from "sonner";
import { X, Trash2, Save, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import type { MTask, MUser } from "./types";
import { QUADRANT_META, getQuadrant, STATUS_COLUMNS } from "./types";

interface TaskDetailDrawerProps {
  task: MTask | null;
  users: MUser[];
  onClose: () => void;
  onUpdate: (updated: MTask) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailDrawer({ task, users, onClose, onUpdate, onDelete }: TaskDetailDrawerProps) {
  const [form, setForm] = useState({ title: "", description: "", isUrgent: false, isImportant: false, status: "TODO", assigneeId: "none", startDate: "", deadline: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  useEffect(() => {
    if (task) setForm({
      title: task.title,
      description: task.description ?? "",
      isUrgent: task.isUrgent,
      isImportant: task.isImportant,
      status: task.status,
      assigneeId: task.assigneeId ?? "none",
      startDate: task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      deadline: task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : "",
    });
  }, [task]);

  if (!task) return null;

  const quadrant = getQuadrant({ isUrgent: form.isUrgent, isImportant: form.isImportant });
  const qMeta = QUADRANT_META[quadrant];

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await updateManagerTask(task.id, {
        title: form.title,
        description: form.description || undefined,
        isUrgent: form.isUrgent,
        isImportant: form.isImportant,
        status: form.status,
        assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
        startDate: form.startDate ? new Date(form.startDate) : null,
        deadline: form.deadline ? new Date(form.deadline) : null,
      });
      if (res.success && res.data) {
        onUpdate(res.data as MTask);
        toast.success("Đã lưu");
      } else toast.error(res.error);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!task || !confirm(`Xóa "${task.title}" và các subtask?`)) return;
    setDeleting(true);
    try {
      const res = await deleteManagerTask(task.id);
      if (res.success) { onDelete(task.id); toast.success("Đã xóa"); }
      else toast.error(res.error);
    } finally { setDeleting(false); }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l">
        {/* Header */}
        <div className={`px-5 py-4 border-b ${qMeta.color} border-b`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qMeta.badge}`}>{qMeta.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{qMeta.sub}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1">
            <Label>Tên task *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          {/* Toggle quadrant */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <Label className="text-xs">🔥 Khẩn cấp</Label>
              <Switch checked={form.isUrgent} onCheckedChange={v => setForm(f => ({ ...f, isUrgent: v }))} />
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <Label className="text-xs">⭐ Quan trọng</Label>
              <Switch checked={form.isImportant} onCheckedChange={v => setForm(f => ({ ...f, isImportant: v }))} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <Label>Giao cho</Label>
            <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v }))}>
              <SelectTrigger><SelectValue placeholder="— Tự làm —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tự làm —</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Ngày bắt đầu</Label>
              <Input type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline</Label>
              <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea rows={4} placeholder="Chi tiết / hướng dẫn..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Subtasks */}
          {task.subtasks.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2">
              <button className="flex items-center justify-between w-full text-sm font-medium" onClick={() => setShowSubs(!showSubs)}>
                <span>📎 Subtasks ({task.subtasks.length})</span>
                {showSubs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showSubs && task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                  <span className="flex-1 truncate">{sub.title}</span>
                  <Badge variant="outline" className="text-[10px]">{sub.status}</Badge>
                  {sub.assignee && <span className="text-xs text-muted-foreground">{sub.assignee.name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />{deleting ? "Đang xóa..." : "Xóa"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>
    </>
  );
}
