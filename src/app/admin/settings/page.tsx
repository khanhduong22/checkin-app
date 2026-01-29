import { prisma } from "@/lib/prisma";
import IPManager from "@/components/admin/IPManager";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const ips = await prisma.allowedIP.findMany({ orderBy: { createdAt: 'desc' } });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Cấu hình Hệ thống</h2>
            <div className="grid gap-6">
                <IPManager ips={ips} />
            </div>
        </div>
    );
}
