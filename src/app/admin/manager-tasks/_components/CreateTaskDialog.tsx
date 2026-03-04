"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createManagerTask } from "@/actions/manager-task-actions";
import { toast } from "sonner";
import type { MTask, MUser } from "./types";

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  users: MUser[];
  defaultQuadrant?: { isUrgent: boolean; isImportant: boolean };
  onCreated: (task: MTask) => void;
}

export function CreateTaskDialog({ open, onClose, users, defaultQuadrant, onCreated }: CreateTaskDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    isUrgent: defaultQuadrant?.isUrgent ?? false,
    isImportant: defaultQuadrant?.isImportant ?? true,
    assigneeId: "none",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error("Nhập tên task"); return; }
    setLoading(true);
    try {
      const res = await createManagerTask({
        title: form.title,
        description: form.description || undefined,
        isUrgent: form.isUrgent,
        isImportant: form.isImportant,
        assigneeId: form.assigneeId === "none" ? null : form.assigneeId,
        deadline: form.deadline ? new Date(form.deadline) : null,
        status: form.assigneeId !== "none" ? "DELEGATED" : "TODO",
      });
      if (res.success && res.data) {
        onCreated(res.data as MTask);
        onClose();
        setForm({ title: "", description: "", isUrgent: false, isImportant: true, assigneeId: "none", deadline: "" });
        toast.success("Đã tạo task");
      } else {
        toast.error(res.error || "Lỗi");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tạo Task Mới</DialogTitle></DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Tên task *</Label>
            <Input autoFocus placeholder="Ví dụ: Kiểm tra hàng tồn kho..." value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold text-red-700">🔥 Khẩn cấp</Label>
                <Switch checked={form.isUrgent} onCheckedChange={v => setForm(f => ({ ...f, isUrgent: v }))} />
              </div>
              <p className="text-[10px] text-red-500">Cần làm ngay hôm nay</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold text-yellow-700">⭐ Quan trọng</Label>
                <Switch checked={form.isImportant} onCheckedChange={v => setForm(f => ({ ...f, isImportant: v }))} />
              </div>
              <p className="text-[10px] text-yellow-500">Ảnh hưởng đến mục tiêu</p>
            </div>
          </div>

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

          <div className="space-y-1">
            <Label>Deadline</Label>
            <Input type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label>Mô tả</Label>
            <Textarea rows={3} placeholder="Chi tiết công việc..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Đang tạo..." : "Tạo Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
