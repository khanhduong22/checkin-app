import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function BackupManager() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append("from", startDate);
      if (endDate) params.append("to", endDate);

      const url = `/api/admin/export?${params.toString()}`;

      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_data_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Đang tải xuống bản sao lưu...");
    } catch {
      toast.error("Không thể tải xuống bản sao lưu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="backup-data-section"
      className="rounded-xl border bg-white text-card-foreground shadow-sm"
    >
      <div className="flex flex-col space-y-1.5 p-6 border-b">
        <h3 className="text-xl font-semibold leading-none tracking-tight">
          Sao lưu dữ liệu
        </h3>
        <p className="text-sm text-muted-foreground">
          Tải xuống dữ liệu hệ thống (Check-in, Ca làm việc) theo khoảng thời
          gian.
        </p>
      </div>
      <div className="p-3.5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end min-w-0">
          <div className="grid w-full max-w-sm items-center gap-1.5 min-w-0">
            <Label htmlFor="from">Từ ngày</Label>
            <Input
              type="date"
              id="from"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white h-10 sm:h-9 min-h-[38px] text-base sm:text-sm w-full max-w-full min-w-0"
            />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5 min-w-0">
            <Label htmlFor="to">Đến ngày</Label>
            <Input
              type="date"
              id="to"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white h-10 sm:h-9 min-h-[38px] text-base sm:text-sm w-full max-w-full min-w-0"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary text-white min-h-[38px] h-10 sm:h-9"
          >
            {isLoading ? "Đang xử lý..." : "📥 Tải về bản Backup (.xlsx)"}
          </Button>

          {(startDate || endDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              title="Xóa bộ lọc ngày"
              className="w-full sm:w-auto min-h-[38px] h-10 sm:h-9"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground italic">
          * Nếu không chọn ngày, hệ thống sẽ tải toàn bộ dữ liệu.
        </p>
      </div>
    </div>
  );
}
