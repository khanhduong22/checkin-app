import React from "react";
import AnnouncementAdminClient from "@/components/admin/AnnouncementAdminClient";

export function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Thông báo
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Đăng tin tức nội bộ, thông báo khẩn cấp và cập nhật hiển thị trên trang chủ
          </p>
        </div>
      </div>

      <AnnouncementAdminClient />
    </div>
  );
}
