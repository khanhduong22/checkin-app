import { prisma } from "@/lib/prisma";
import PayrollAdminClient from "@/components/admin/PayrollAdminClient";
import PayrollExplanationModal from "@/components/PayrollExplanationModal";

export const dynamic = 'force-dynamic';

export default async function AdminPayrollPage({ searchParams }: { searchParams: { month?: string, year?: string } }) {
    const today = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : today.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : today.getFullYear();

    // 1. Get Payroll Period Status
    const period = await prisma.payrollPeriod.findUnique({
        where: { month_year: { month, year } }
    });

    const isClosed = period?.status === 'CLOSED';
    const bonusPercent = period?.bonusPercent || 0;

    let payrollData = [];

    if (isClosed) {
        // FETCH FROM SNAPSHOTS
        const payslips = await prisma.payslip.findMany({
            where: { month, year },
            include: { user: true }
        });

        payrollData = payslips.map(p => {
            const content = p.content as any;
            return {
                id: p.userId,
                name: p.user.name,
                email: p.user.email,
                stats: content, // The snapshot content has the same structure as stats
                recentAdjustments: [], // Snapshot should ideally have this, or we rely on content.adjustments
                isSnapshot: true
            };
        });
    } else {
        // LIVE CALCULATION
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            include: {
                adjustments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        const { getUserMonthlyStats } = await import("@/lib/stats");
        const targetDate = new Date(year, month - 1, 15); // Middle of month to be safe

        payrollData = await Promise.all(users.map(async (u) => {
            const stats = await getUserMonthlyStats(u.id, targetDate);
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
                })),
                isSnapshot: false
            };
        }));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Quản lý Lương & Thưởng</h2>
                     <p className="text-muted-foreground">
                        {isClosed ? `Bảng lương tháng ${month}/${year} (Đã chốt)` : `Bảng lương tạm tính tháng ${month}/${year}`}
                     </p>
                </div>
                <PayrollExplanationModal />
            </div>
            
            <PayrollAdminClient 
                data={payrollData} 
                month={month} 
                year={year} 
                isClosed={isClosed} 
                initialBonusPercent={bonusPercent}
                initialBonusTargets={(period?.bonusTargets as any) || ['PART_TIME']}
            />
        </div>
    );
}
