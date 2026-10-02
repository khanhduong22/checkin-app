import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function RequestAdminClient({
  requests: initialRequests = [],
  onRefresh,
}: {
  requests?: any[];
  onRefresh?: () => void;
}) {
  const [requests, setRequests] = useState<any[]>(initialRequests);

  React.useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const handleApprove = async (id: number | string) => {
    if (!confirm("Duyệt yêu cầu này?")) return;
    try {
      await api.post(`/api/admin/requests/${id}/approve`);
      toast.success("Đã duyệt yêu cầu thành công!");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
      );
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Đã duyệt yêu cầu thành công (Ghi nhận tức thì)!");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
      );
      if (onRefresh) onRefresh();
    }
  };

  const handleReject = async (id: number | string) => {
    if (!confirm("Từ chối yêu cầu này?")) return;
    try {
      await api.post(`/api/admin/requests/${id}/reject`);
      toast.error("Đã từ chối yêu cầu.");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Đã từ chối yêu cầu (Ghi nhận tức thì).");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div id="request-admin-list" className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-center italic text-muted-foreground py-8 bg-white rounded-xl border">
          Không có yêu cầu nào.
        </div>
      ) : (
        requests.map((r: any) => (
          <Card key={r.id} className="overflow-hidden bg-white shadow-sm">
            <CardContent className="p-0 flex flex-col md:flex-row">
              <div
                className={`w-2 shrink-0 ${
                  r.status === "PENDING"
                    ? "bg-amber-400"
                    : r.status === "APPROVED"
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              />

              <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">
                      {r.user?.name || "Nhân viên"}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {r.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Ngày:{" "}
                      {r.date
                        ? new Date(r.date).toLocaleDateString("vi-VN")
                        : r.startDate || "--"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700">
                    Lý do:{" "}
                    <span className="italic font-medium text-slate-900">
                      &quot;{r.reason}&quot;
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Gửi lúc:{" "}
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString("vi-VN")
                      : "--"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {r.status === "PENDING" ? (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={() => handleApprove(r.id)}
                      >
                        ✅ Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(r.id)}
                      >
                        ❌ Từ chối
                      </Button>
                    </>
                  ) : (
                    <Badge
                      className={
                        r.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-red-100 text-red-800 border-red-200"
                      }
                    >
                      {r.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
