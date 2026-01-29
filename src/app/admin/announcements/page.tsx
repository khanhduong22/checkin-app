import { prisma } from "@/lib/prisma";
import AnnouncementAdminClient from "@/components/admin/AnnouncementAdminClient";

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage() {
    const announcements = await prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' }
    });

    const serializedData = announcements.map((a: any) => ({
        ...a,
        createdAt: a.createdAt.toISOString()
    }));

    return (
        <div className="space-y-6">
            <div>
                 <h2 className="text-2xl font-bold tracking-tight">Quản lý Thông Báo</h2>
                 <p className="text-muted-foreground">Đăng tin tức nội bộ hiển thị trên trang chủ.</p>
            </div>
            <AnnouncementAdminClient announcements={serializedData} />
        </div>
    );
}
