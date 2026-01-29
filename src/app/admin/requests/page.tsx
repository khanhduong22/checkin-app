import { prisma } from "@/lib/prisma";
import RequestAdminClient from "@/components/admin/RequestAdminClient";

export const dynamic = 'force-dynamic';

export default async function AdminRequestsPage() {
    const requests = await prisma.request.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true }
    });

    const serializedRequests = requests.map((r: any) => ({
        ...r,
        date: r.date.toISOString(),
        createdAt: r.createdAt.toISOString()
    }));

    return (
        <div className="space-y-6">
            <div>
                 <h2 className="text-2xl font-bold tracking-tight">Duyệt Yêu Cầu / Giải Trình</h2>
            </div>
            <RequestAdminClient requests={serializedRequests} />
        </div>
    );
}
