import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminSidebar() {
    return (
        <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 w-[240px] flex-col h-full fixed inset-y-0 left-0">
            <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
                <Link className="flex items-center gap-2 font-semibold" href="/admin">
                    <span className="">Admin Panel</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-4 text-sm font-medium">
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-900 bg-gray-100 transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50"
                        href="/admin"
                    >
                        🏠 Dashboard
                    </Link>
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/employees"
                    >
                        👥 Nhân sự
                    </Link>
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/schedule"
                    >
                        📅 Lịch làm việc
                    </Link>
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/reports"
                    >
                        📈 Báo cáo
                    </Link>
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/requests"
                    >
                        🔔 Duyệt yêu cầu
                    </Link>
                    <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/payroll"
                    >
                        💰 Bảng Lương
                    </Link>
                     <Link
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        href="/admin/settings"
                    >
                        ⚙️ Cấu hình (IP)
                    </Link>
                    <div className="mt-auto border-t pt-4">
                        <Link
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                            href="/"
                        >
                            ← Về trang chủ
                        </Link>
                    </div>
                </nav>
            </div>
        </div>
    )
}
