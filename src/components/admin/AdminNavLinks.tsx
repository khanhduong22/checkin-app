'use client';

import Link from "next/link"
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminNavLinks() {
    const pathname = usePathname();

    const links = [
        { href: "/admin", label: "🏠 Dashboard" },
        { href: "/admin/employees", label: "👥 Nhân sự" },
        { href: "/admin/schedule", label: "📅 Lịch làm việc" },
        { href: "/admin/reports", label: "📈 Bảng thành tích" },
        { href: "/admin/requests", label: "🔔 Duyệt yêu cầu" },
        { href: "/admin/announcements", label: "📢 Thông báo" },
        { href: "/admin/payroll", label: "💰 Bảng Lương" },
        { href: "/admin/lucky-wheel", label: "🎰 Vòng quay" },
        { href: "/admin/tasks", label: "📝 Duyệt WFH & Đóng gói" },
        { href: "/admin/manager-tasks", label: "🗂️ Manager Tasks" },
        { href: "/admin/settings", label: "⚙️ Cấu hình (IP)" },
        { href: "/admin/help", label: "🤖 AI Trợ giúp" },
    ];

    return (
        <nav id="admin-nav-links" className="grid items-start px-4 text-sm font-medium gap-1">
            {links.map((link) => (
                <Link
                    key={link.href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-gray-900 dark:hover:text-gray-50",
                        pathname === link.href 
                            ? "bg-gray-100 text-gray-900 font-bold dark:bg-gray-800 dark:text-gray-50" 
                            : "text-gray-500 dark:text-gray-400"
                    )}
                    href={link.href}
                >
                    {link.label}
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
