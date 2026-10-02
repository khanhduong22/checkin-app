import React from "react";
import AnnouncementAdminClient from "@/components/admin/AnnouncementAdminClient";

export function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Thông báo
          </h2>
          <p className="text-sm text-muted-foreground">
            Đăng tin tức nội bộ, thông báo khẩn cấp và cập nhật hiển thị trên trang chủ
          </p>
        </div>
      </div>

      <AnnouncementAdminClient />
    </div>
  );
}
