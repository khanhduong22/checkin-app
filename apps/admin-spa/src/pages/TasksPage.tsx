import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Boxes,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  Laptop,
} from "lucide-react";
import { TanStackTable } from "@/components/ui/tanstack-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyVND, formatDateTimeVN } from "@/lib/utils";
import { useTasks } from "@/hooks/useAdminData";
import type { AdminTaskItem, TaskStatus, TaskType } from "@/types";

export function TasksPage() {
  const { tasks, approveTask, rejectTask } = useTasks();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("SUBMITTED");
  const [typeFilter, setTypeFilter] = useState<TaskType | "ALL">("ALL");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: AdminTaskItem) => {
      const matchStatus =
        statusFilter === "ALL" ? true : t.status === statusFilter;
      const matchType = typeFilter === "ALL" ? true : t.type === typeFilter;
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchStatus && matchType && matchSearch;
    });
  }, [tasks, statusFilter, typeFilter, searchTerm]);

  const pendingCount = tasks.filter((t: AdminTaskItem) => t.status === "SUBMITTED").length;

  const columns = useMemo<ColumnDef<AdminTaskItem>[]>(
    () => [
      {
        accessorKey: "user.name",
        header: "Nhân viên thực hiện",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800 border border-orange-200">
              {row.original.user.name.charAt(0)}
            </div>
            <div>
              <span className="font-semibold text-slate-800">
                {row.original.user.name}
              </span>
              <p className="text-xs text-muted-foreground">
                {row.original.user.department}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Tên nhiệm vụ / Sản phẩm",
        cell: ({ row }) => (
          <div className="flex flex-col max-w-sm">
            <span className="font-medium text-slate-800">
              {row.original.title}
            </span>
            {row.original.notes && (
              <span className="text-xs text-muted-foreground line-clamp-1 italic mt-0.5">
                &quot;{row.original.notes}&quot;
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Phân loại",
        cell: ({ row }) => {
          const type = row.original.type;
          if (type === "PACKAGING") {
            return (
              <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                <Boxes className="h-3 w-3 text-amber-600" /> Đóng gói
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 text-xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 font-semibold">
              <Laptop className="h-3 w-3 text-sky-600" /> WFH / Content
            </span>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: "Khối lượng & Đơn giá",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-slate-800 font-mono text-xs">
              {row.original.quantity} cái/bài
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              x {formatCurrencyVND(row.original.ratePerUnit || 0)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "totalReward",
        header: "Thưởng dự kiến",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-bold text-emerald-700">
            {formatCurrencyVND(row.original.totalReward)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === "APPROVED") {
            return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Đã nghiệm thu</Badge>;
          }
          if (status === "REJECTED") {
            return <Badge variant="destructive">Từ chối</Badge>;
          }
          return (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
              Chờ duyệt
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Thao tác duyệt",
        cell: ({ row }) => {
          if (row.original.status !== "SUBMITTED") {
            return (
              <span className="text-xs text-muted-foreground font-mono">
                {formatDateTimeVN(row.original.submittedAt)}
              </span>
            );
          }
          return (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => approveTask(row.original.id)}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Duyệt
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1 text-xs"
                onClick={() => rejectTask(row.original.id)}
              >
                <XCircle className="h-3.5 w-3.5" /> Từ chối
              </Button>
            </div>
          );
        },
      },
    ],
    [approveTask, rejectTask]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý WFH & Đóng gói sản phẩm
          </h2>
          <p className="text-sm text-muted-foreground">
            Duyệt sản lượng đóng gói bao bì, bài viết seeding và nhiệm vụ làm tại nhà
          </p>
        </div>
      </div>

      <Tabs defaultValue="review" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger id="tab-trigger-review" value="review">
            Duyệt bài nộp ({pendingCount})
          </TabsTrigger>
          <TabsTrigger id="tab-trigger-history" value="history">
            Lịch sử đã duyệt
          </TabsTrigger>
          <TabsTrigger id="tab-trigger-definitions" value="definitions">
            Cấu hình đơn giá
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm nhân viên, tên hàng, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
              >
                <option value="ALL">Tất cả loại việc</option>
                <option value="PACKAGING">Đóng gói</option>
                <option value="CONTENT">WFH / Content</option>
              </select>
            </div>
          </div>

          <TanStackTable
            columns={columns}
            data={filteredTasks}
            pageSize={8}
            emptyMessage="Không có công việc nào cần duyệt."
          />
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Lịch sử nghiệm thu</CardTitle>
              <CardDescription>
                Xem lại danh sách các task đã được duyệt hoặc bị từ chối gần đây
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y border rounded-lg bg-white">
                {tasks
                  .filter((t: AdminTaskItem) => t.status !== "SUBMITTED")
                  .map((t: AdminTaskItem) => (
                    <div
                      key={t.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{t.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.user.name} • {t.quantity} sản phẩm •{" "}
                          {formatCurrencyVND(t.totalReward)}
                        </div>
                      </div>
                      <Badge
                        className={
                          t.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {t.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="definitions">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Đơn giá định mức</CardTitle>
              <CardDescription>
                Bảng giá cơ sở cho từng đơn vị đóng gói hoặc bài viết nội dung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">Đóng gói Hộp quà Tết Limited</div>
                  <div className="text-xs text-muted-foreground">Đơn vị: hộp</div>
                </div>
                <div className="font-mono font-bold text-emerald-700">3.500 ₫ / hộp</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">Sản xuất Video ngắn TikTok</div>
                  <div className="text-xs text-muted-foreground">Đơn vị: video</div>
                </div>
                <div className="font-mono font-bold text-emerald-700">200.000 ₫ / clip</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">Kiểm đếm pallet nguyên liệu</div>
                  <div className="text-xs text-muted-foreground">Đơn vị: kiện</div>
                </div>
                <div className="font-mono font-bold text-emerald-700">4.000 ₫ / kiện</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
