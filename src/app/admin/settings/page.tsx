import { prisma } from "@/lib/prisma";
import IPManager from "@/components/admin/IPManager";
import HolidayManager from "@/components/admin/HolidayManager";
import BackupManager from "@/components/admin/BackupManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const ips = await prisma.allowedIP.findMany({ orderBy: { createdAt: 'desc' } });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Cấu hình Hệ thống</h2>
            
            <Tabs defaultValue="holidays" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="access">Truy cập & Bảo mật</TabsTrigger>
                    <TabsTrigger value="holidays">Ngày Lễ & Lương</TabsTrigger>
                    <TabsTrigger value="backup">Sao lưu & Dữ liệu</TabsTrigger>
                </TabsList>

                <TabsContent value="access" className="space-y-4">
                    <IPManager ips={ips} />
                </TabsContent>

                <TabsContent value="holidays" className="space-y-4">
                    <HolidayManager />
                </TabsContent>

                <TabsContent value="backup" className="space-y-4">
                    <BackupManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
