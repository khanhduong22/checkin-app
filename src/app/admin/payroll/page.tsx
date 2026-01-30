import { prisma } from "@/lib/prisma";
import PayrollAdminClient from "@/components/admin/PayrollAdminClient";
import PayrollExplanationModal from "@/components/PayrollExplanationModal";

export const dynamic = 'force-dynamic';

export default async function AdminPayrollPage() {
    // Get all users
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        include: {
            adjustments: {
                orderBy: { createdAt: 'desc' },
                take: 5
            }
        }
    });

    // Calculate stats for each user (current month)
    const { getUserMonthlyStats } = await import("@/lib/stats");
    
    const payrollData = await Promise.all(users.map(async (u) => {
        const stats = await getUserMonthlyStats(u.id);
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            stats,
            recentAdjustments: u.adjustments.map((a: any) => ({
                id: a.id,
                amount: a.amount,
                reason: a.reason,
                date: a.date.toISOString()
            }))
        };
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Quản lý Lương & Thưởng</h2>
                     <p className="text-muted-foreground">Xem bảng lương tạm tính và điều chỉnh thưởng phạt.</p>
                </div>
                <PayrollExplanationModal />
            </div>
            <PayrollAdminClient data={payrollData} />
        </div>
    );
}
