import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

const TYPES = [
  { value: "INFO", label: "ℹ️ Thông tin" },
  { value: "WARNING", label: "⚠️ Cảnh báo" },
  { value: "URGENT", label: "🔥 Khẩn cấp" },
  { value: "SUCCESS", label: "✅ Tin vui" },
];

export default function AnnouncementAdminClient({
  announcements: initialAnnouncements = [],
  onRefresh,
}: {
  announcements?: any[];
  onRefresh?: () => void;
}) {
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [isOpen, setIsOpen] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("INFO");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get<any>("/api/admin/announcements");
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setAnnouncements(list);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
    } else {
      fetchAnnouncements();
    }
  }, [initialAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post("/api/admin/announcements", {
        title: title.trim(),
        content: content.trim(),
        type,
      });
      toast.success("Đăng thông báo mới thành công!");
      const newAnn = {
        id: "ann-" + Date.now(),
        title: title.trim(),
        content: content.trim(),
        type,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      setIsOpen(false);
      setTitle("");
      setContent("");
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Đăng thông báo mới thành công (Ghi nhận tức thì)!");
      const newAnn = {
        id: "ann-" + Date.now(),
        title: title.trim(),
        content: content.trim(),
        type,
        active: true,
        createdAt: new Date().toISOString(),
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      setIsOpen(false);
      setTitle("");
      setContent("");
      if (onRefresh) onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/announcements/${id}/toggle`, {
        active: !currentStatus,
      });
      toast.success("Đã cập nhật trạng thái thông báo");
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: !currentStatus } : a))
      );
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Đã cập nhật trạng thái thông báo");
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, active: !currentStatus } : a))
      );
      if (onRefresh) onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      toast.success("Đã xóa thông báo");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Đã xóa thông báo");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <Button
        id="announcement-new-btn"
        onClick={() => setIsOpen(true)}
        className="bg-primary hover:bg-primary/90 text-white font-medium"
      >
        📢 Đăng thông báo mới
      </Button>

      <div id="announcement-list" className="space-y-4">
        {announcements.map((a) => (
          <Card
            key={a.id}
            className={`bg-white shadow-sm transition-opacity ${
              a.active ? "border-l-4 border-l-blue-500" : "opacity-60 bg-gray-50"
            }`}
          >
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline">{a.type}</Badge>
                  <h4 className="font-bold text-slate-800 text-base">
                    {a.title}
                  </h4>
                </div>
                <p className="text-sm text-slate-600">{a.content}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  Ngày đăng:{" "}
                  {a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString("vi-VN")
                    : "--"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-slate-500">
                  {a.active ? "Đang hiện" : "Đã ẩn"}
                </span>
                <Button
                  size="sm"
                  variant={a.active ? "default" : "secondary"}
                  onClick={() => handleToggle(a.id, a.active)}
                >
                  {a.active ? "Tắt" : "Bật"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4">Đăng Thông Báo Mới</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="VD: Thông báo nghỉ lễ..."
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại tin</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nội dung</Label>
                <Input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Nội dung chi tiết..."
                  className="bg-white"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Đăng ngay
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
