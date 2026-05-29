'use client';

import Link from "next/link"
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function AdminNavLinks({
    pendingRequestsCount = 0,
    pendingTasksCount = 0,
}: {
    pendingRequestsCount?: number;
    pendingTasksCount?: number;
}) {
    const pathname = usePathname();

    const links = [
        { href: "/admin", label: "Dashboard", icon: "/icons/capy_dashboard.png" },
        { href: "/admin/employees", label: "Nhân sự", icon: "/icons/capy_hr.png" },
        { href: "/admin/schedule", label: "Lịch làm việc", icon: "/icons/capy_calendar.png" },
        { href: "/admin/reports", label: "Bảng thành tích", icon: "/icons/capy_badge.png" },
        { href: "/admin/requests", label: "Duyệt yêu cầu", badge: pendingRequestsCount, icon: "/icons/capy_request.png" },
        { href: "/admin/announcements", label: "Thông báo", icon: "/icons/capy_announce.png" },
        { href: "/admin/payroll", label: "Bảng Lương", icon: "/icons/capy_payroll.png" },
        { href: "/admin/lucky-wheel", label: "Vòng quay", icon: "/icons/capy_wheel.png" },
        { href: "/admin/tasks", label: "Duyệt WFH & Đóng gói", badge: pendingTasksCount, icon: "/icons/capy_wfh.png" },
        { href: "/admin/manager-tasks", label: "Manager Tasks", icon: "/icons/capy_manager.png" },
        { href: "/admin/staff-tasks", label: "Công việc và KPI", icon: "/icons/capy_manager.png" },
        { href: "/admin/settings", label: "Cấu hình (IP)", icon: "/icons/capy_settings.png" },
        { href: "/admin/help", label: "AI Trợ giúp", icon: "/icons/capy_ai.png" },
    ];

    return (
        <nav id="admin-nav-links" className="grid items-start px-4 text-sm font-medium gap-2 mt-2">
            {links.map((link) => (
                <Link
                    key={link.href}
                    className={cn(
                        "flex justify-between items-center rounded-xl px-3 py-2 transition-all hover:bg-orange-50 hover:text-orange-900 group",
                        pathname === link.href 
                            ? "bg-orange-100/80 text-orange-950 font-bold shadow-sm" 
                            : "text-gray-600"
                    )}
                    href={link.href}
                >
                    <span className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform drop-shadow-sm">
                            <Image src={link.icon} alt={link.label} width={40} height={40} className="w-full h-full object-contain" />
                        </div>
                        {link.label}
                    </span>
                    {link.badge !== undefined && link.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none">
                            {link.badge > 99 ? '99+' : link.badge}
                        </Badge>
                    )}
                </Link>
            ))}
            
            <div className="mt-4 border-t pt-4">
                <Link
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                    href="/"
                >
                    ← Về trang chủ
                </Link>
            </div>
        </nav>
    );
}
