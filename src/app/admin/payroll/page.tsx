import { prisma } from "@/lib/prisma";
import PayrollAdminClient from "@/components/admin/PayrollAdminClient";
import PayrollExplanationModal from "@/components/PayrollExplanationModal";
import { BulkSendPayslipButton } from "@/components/admin/BulkSendPayslipButton";

export const dynamic = 'force-dynamic';

export default async function AdminPayrollPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
    const params = await searchParams;
    const today = new Date();
    const month = params.month ? parseInt(params.month) : today.getMonth() + 1;
    const year = params.year ? parseInt(params.year) : today.getFullYear();

    // 1. Get Payroll Period Status
    const period = await prisma.payrollPeriod.findUnique({
        where: { month_year: { month, year } }
    });

    const isClosed = period?.status === 'CLOSED';
    const bonusPercent = period?.bonusPercent || 0;
    const excludedBonusUsers = period?.excludedBonusUsers || [];

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
                stats: content,
                recentAdjustments: [],
                isSnapshot: true,
                emailSentAt: p.emailSentAt,
            };
        });
    } else {
        // LIVE CALCULATION
        const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
        const targetDate = new Date(year, month - 1, 15);
        const vnDate = new Date(targetDate.getTime() + VN_OFFSET_MS);
        const vnYear = vnDate.getUTCFullYear();
        const vnMonth = vnDate.getUTCMonth();

        const startDate = new Date(Date.UTC(vnYear, vnMonth, 1) - VN_OFFSET_MS);
        const endDate = new Date(Date.UTC(vnYear, vnMonth + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { isActive: true },
                    { shifts: { some: { start: { gte: startDate, lte: endDate } } } },
                    { checkins: { some: { timestamp: { gte: startDate, lte: endDate } } } },
                    { adjustments: { some: { date: { gte: startDate, lte: endDate } } } }
                ]
            },
            orderBy: { name: 'asc' },
            include: {
                adjustments: {
                    where: {
                        date: { gte: startDate, lte: endDate }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        const userIds = users.map(u => u.id);

        const [checkins, shifts, allRequests, holidays, staffTasks] = await Promise.all([
            prisma.checkIn.findMany({
                where: {
                    userId: { in: userIds },
                    timestamp: { gte: startDate, lte: endDate }
                },
                orderBy: { timestamp: 'asc' }
            }),
            prisma.workShift.findMany({
                where: {
                    userId: { in: userIds },
                    start: { gte: startDate, lte: endDate }
                }
            }),
            prisma.request.findMany({
                where: {
                    userId: { in: userIds },
                    type: { in: ['LEAVE', 'WFH', 'EARLY_LEAVE'] },
                    date: { gte: startDate, lte: endDate }
                }
            }),
            prisma.holiday.findMany({
                where: {
                    date: { gte: startDate, lte: endDate }
                }
            }),
            prisma.staffTask.findMany({
                where: {
                    assigneeId: { in: userIds },
                    OR: [
                        { startDate: { gte: startDate, lte: endDate } },
                        {
                            AND: [
                                { startDate: null },
                                { createdAt: { gte: startDate, lte: endDate } }
                            ]
                        }
                    ]
                }
            })
        ]);

        const checkinsByUser = new Map<string, any[]>();
        const shiftsByUser = new Map<string, any[]>();
        const requestsByUser = new Map<string, any[]>();
        const staffTasksByUser = new Map<string, any[]>();

        checkins.forEach(c => {
            if (!checkinsByUser.has(c.userId)) checkinsByUser.set(c.userId, []);
            checkinsByUser.get(c.userId)!.push(c);
        });

        shifts.forEach(s => {
            if (!shiftsByUser.has(s.userId)) shiftsByUser.set(s.userId, []);
            shiftsByUser.get(s.userId)!.push(s);
        });

        allRequests.forEach(r => {
            if (!requestsByUser.has(r.userId)) requestsByUser.set(r.userId, []);
            requestsByUser.get(r.userId)!.push(r);
        });

        staffTasks.forEach(t => {
            if (!staffTasksByUser.has(t.assigneeId)) staffTasksByUser.set(t.assigneeId, []);
            staffTasksByUser.get(t.assigneeId)!.push(t);
        });

        const { getUserMonthlyStats } = await import("@/lib/stats");

        payrollData = await Promise.all(
            users.map(async (u) => {
                const stats = await getUserMonthlyStats(u.id, targetDate, {
                    user: u,
                    checkins: checkinsByUser.get(u.id) || [],
                    shifts: shiftsByUser.get(u.id) || [],
                    allRequests: requestsByUser.get(u.id) || [],
                    holidays,
                    staffTasks: staffTasksByUser.get(u.id) || []
                });
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
                    isSnapshot: false,
                    emailSentAt: null,
                };
            })
        );
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
                <div className="flex items-center gap-2">
                    {isClosed && (
                        <BulkSendPayslipButton
                            month={month}
                            year={year}
                            isClosed={isClosed}
                            payslipCount={payrollData.length}
                        />
                    )}
                    <PayrollExplanationModal />
                </div>
            </div>
            
            <PayrollAdminClient 
                data={payrollData} 
                month={month} 
                year={year} 
                isClosed={isClosed} 
                initialBonusPercent={bonusPercent}
                initialBonusTargets={(period?.bonusTargets as any) || ['PART_TIME']}
                initialExcludedUsers={excludedBonusUsers}
            />
        </div>
    );
}
