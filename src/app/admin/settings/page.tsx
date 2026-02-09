import { prisma } from "@/lib/prisma";
import IPManager from "@/components/admin/IPManager";
import HolidayManager from "@/components/admin/HolidayManager";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const ips = await prisma.allowedIP.findMany({ orderBy: { createdAt: 'desc' } });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Cấu hình Hệ thống</h2>
            <div className="grid gap-6">
                <IPManager ips={ips} />
                <HolidayManager />
                
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Sao lưu dữ liệu</h3>
                        <p className="text-sm text-muted-foreground">Tải xuống toàn bộ dữ liệu hệ thống dưới dạng file Excel.</p>
                    </div>
                    <div className="p-6 pt-0">
                         <a href="/api/admin/export" target="_blank">
                            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                                📥 Tải về bản Backup (.xlsx)
                            </button>
                         </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
