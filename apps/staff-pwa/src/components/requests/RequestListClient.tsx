import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus } from "lucide-react";
import { Link } from "@/lib/router";
import { submitRequest } from "@/lib/api-client";
import { toast } from "sonner";

const TYPES = [
  { value: "LATE", label: "Xin đi muộn" },
  { value: "EARLY", label: "Xin về sớm" },
  { value: "MISSING", label: "Quên Check-in/out" },
  { value: "LEAVE", label: "Xin nghỉ phép" },
  { value: "WFH", label: "Xin làm từ xa (WFH)" },
  { value: "OTHER", label: "Khác" },
];

export default function RequestListClient({
  requests = [],
  onRefresh,
}: {
  requests: any[];
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<string>("LATE");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do giải trình");
      return;
    }
    setIsSubmitting(true);
    const res = await submitRequest(date, type, reason);
    setIsSubmitting(false);

    if (res.success) {
      toast.success("✅ Đã gửi yêu cầu thành công!");
      setIsOpen(false);
      setReason("");
      if (onRefresh) onRefresh();
    } else {
      toast.error(res.message || "Gửi yêu cầu thất bại");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Yêu cầu / Giải trình</h1>
        </div>
        <Button
          id="create-request-btn"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Tạo yêu cầu
        </Button>
      </div>

      {/* Requests List */}
      <div className="space-y-2.5">
        {requests.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-xs text-muted-foreground">
              Bạn chưa có yêu cầu hay giải trình nào.
            </CardContent>
          </Card>
        ) : (
          requests.map((r: any) => (
            <Card key={r.id} className="rounded-2xl shadow-xs border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {TYPES.find((t) => t.value === r.type)?.label || r.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(r.date).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-gray-800">{r.reason}</div>
                </div>

                <div>
                  {r.status === "PENDING" && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] font-bold">
                      Đang chờ duyệt
                    </Badge>
                  )}
                  {r.status === "APPROVED" && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      Đã duyệt ✅
                    </Badge>
                  )}
                  {r.status === "REJECTED" && (
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      Từ chối ❌
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Request Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-900">Gửi yêu cầu / giải trình</h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày áp dụng</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Loại yêu cầu</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Lý do cụ thể</Label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Nhập lý do chi tiết..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
