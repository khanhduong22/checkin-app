import React from "react";
import { useLocation } from "react-router-dom";
import { Menu, LogOut, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AdminNavLinks from "./AdminNavLinks";
import { useDashboardStats } from "@/hooks/useAdminData";
import { removeToken } from "@/lib/api";
import { toast } from "sonner";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Quản lý chấm công",
  "/employees": "Quản lý Nhân sự",
  "/schedule": "Lịch làm việc",
  "/reports": "Bảng thành tích",
  "/requests": "Duyệt yêu cầu",
  "/announcements": "Quản lý Thông báo",
  "/payroll": "Bảng Lương",
  "/lucky-wheel": "Vòng quay may mắn",
  "/tasks": "Duyệt WFH & Đóng gói",
  "/manager-tasks": "Manager Tasks",
  "/staff-tasks": "Công việc và KPI",
  "/settings": "Cấu hình Hệ thống",
  "/audit-logs": "Session Audit Log",
  "/help": "Trợ lí Capy",
};

interface HeaderProps {
  onOpenChangelog?: () => void;
}

export function Header({ onOpenChangelog }: HeaderProps) {
  const location = useLocation();
  const { stats } = useDashboardStats();
  const currentTitle = ROUTE_TITLES[location.pathname] || "Admin Panel";

  const handleLogout = () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi Admin Panel?")) {
      removeToken();
      toast.success("Đã đăng xuất thành công");
      window.location.href = "/";
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-gray-950 px-6 lg:h-[60px] sticky top-0 z-30 w-full justify-between">
      {/* Left: Mobile Drawer Trigger & Title */}
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden -ml-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0 bg-white">
            <div className="flex h-14 items-center border-b px-6">
              <span className="font-semibold text-lg">Admin Panel</span>
            </div>
            <div className="py-2">
              <AdminNavLinks
                pendingRequestsCount={stats?.pendingRequestsCount || 0}
                pendingTasksCount={stats?.pendingTasksCount || 0}
              />
            </div>
          </SheetContent>
        </Sheet>
        <h1
          id="admin-header-title"
          className="font-semibold text-lg text-slate-800 dark:text-slate-100"
        >
          {currentTitle}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {onOpenChangelog && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenChangelog}
            className="text-xs bg-white hover:bg-slate-50 border-slate-200"
          >
            📜 Lịch sử
          </Button>
        )}

        <a
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <span>Staff Portal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </Button>
      </div>
    </header>
  );
}
