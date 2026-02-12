import Link from "next/link"
import AdminNavLinks from "./AdminNavLinks"

export default function AdminSidebar() {
    return (
        <div id="admin-sidebar" className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 w-[240px] flex-col h-full fixed inset-y-0 left-0">
            <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
                <Link className="flex items-center gap-2 font-semibold" href="/admin">
                    <span className="">Admin Panel</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <AdminNavLinks />
            </div>
        </div>
    )
}
