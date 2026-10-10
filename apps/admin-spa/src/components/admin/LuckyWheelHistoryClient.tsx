import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface LuckyWheelHistoryClientProps {
  initialHistory?: any[];
}

export default function LuckyWheelHistoryClient({
  initialHistory = [],
}: LuckyWheelHistoryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [prizeFilter, setPrizeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const prizeOptions = Array.from(
    new Set(initialHistory.map((h) => h.prizeName).filter(Boolean))
  );

  const filteredHistory = initialHistory.filter((record) => {
    const matchesSearch =
      (record.user?.name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (record.user?.email?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );

    const matchesPrize =
      prizeFilter === "ALL" || record.prizeName === prizeFilter;

    return matchesSearch && matchesPrize;
  });

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistory = filteredHistory.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <CardTitle className="text-lg sm:text-xl font-bold">Lịch sử trúng thưởng</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên/email..."
                className="pl-8 bg-white w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              value={prizeFilter}
              onChange={(e) => {
                setPrizeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm w-full sm:w-auto"
            >
              <option value="ALL">Tất cả giải</option>
              {prizeOptions.map((p: any) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table className="min-w-[550px]">
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người trúng</TableHead>
                <TableHead>Danh hiệu</TableHead>
                <TableHead>Giải thưởng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Không tìm thấy dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                paginatedHistory.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {record.createdAt
                          ? new Intl.DateTimeFormat("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "medium",
                              timeZone: "Asia/Ho_Chi_Minh",
                            }).format(new Date(record.createdAt))
                          : "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {record.user?.name || "N/A"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {record.user?.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.user?.achievements?.[0]?.code ? (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-[10px]"
                        >
                          {record.user.achievements[0].code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {record.user?.role || "USER"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {record.prizeName}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
