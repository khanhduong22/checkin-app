import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMonthlyStats } from "@/lib/stats";
import PayrollDetailView from "@/components/PayrollDetailView";
import PayrollMonthSelector from "@/components/PayrollMonthSelector";
import PayrollExplanationModal from "@/components/PayrollExplanationModal";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const resolvedParams = await searchParams;
    const selectedYear = resolvedParams.year ? parseInt(resolvedParams.year) : currentYear;
    const selectedMonth = resolvedParams.month ? parseInt(resolvedParams.month) : currentMonth;

    const targetDate = new Date(selectedYear, selectedMonth - 1, 15);

    let userId = (session.user as any).id;
    if (!userId) {
        const u = await prisma.user.findUnique({ where: { email: session.user?.email! } });
        userId = u?.id;
    }

    // Check payroll period status and payslip snapshot in parallel
    const [period, payslip] = await Promise.all([
        prisma.payrollPeriod.findUnique({
            where: { month_year: { month: selectedMonth, year: selectedYear } }
        }),
        prisma.payslip.findUnique({
            where: { userId_month_year: { userId, month: selectedMonth, year: selectedYear } }
        })
    ]);

    const isClosed = period?.status === 'CLOSED' && !!payslip;

    // Use snapshot data if month is closed, otherwise live calculation
    let stats: any;
    if (isClosed && payslip) {
        // Closed month: use saved snapshot (has bonusAmount, finalNet)
        stats = payslip.content as any;
    } else {
        // Open month: live calculation + apply bonus preview from PayrollPeriod
        const liveStats = await getUserMonthlyStats(userId, targetDate);
        const bonusPercent = period?.bonusPercent || 0;
        const bonusTargets: string[] = (period?.bonusTargets as string[]) || ['PART_TIME'];

        // Get user employment type to check if they qualify for bonus
        const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { employmentType: true } });
        const shouldApplyBonus = bonusPercent > 0 && bonusTargets.includes(userRecord?.employmentType || '');
        const bonusAmount = shouldApplyBonus ? liveStats.baseSalary * (bonusPercent / 100) : 0;
        const finalNet = liveStats.totalSalary + bonusAmount;

        stats = {
            ...liveStats,
            bonusPercent: shouldApplyBonus ? bonusPercent : 0,
            bonusAmount,
            finalNet
        };
    }

    const monthOptions = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthOptions.push({
            value: `${d.getFullYear()}-${d.getMonth() + 1}`,
            label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
        });
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center gap-2">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold flex-1">Chi tiết lương</h1>
                    <PayrollExplanationModal />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border">
                    <label className="text-xs text-muted-foreground font-medium mb-2 block uppercase">
                        Kỳ lương
                    </label>
                    <PayrollMonthSelector current={`${selectedYear}-${selectedMonth}`} options={monthOptions} />
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900">{session.user?.name}</p>
                            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                        </div>
                        {isClosed && (
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                Đã chốt lương
                            </span>
                        )}
                    </div>
                    <div className="p-4">
                        <PayrollDetailView
                            stats={stats}
                            monthStr={`${selectedMonth}/${selectedYear}`}
                            userName={session.user?.name || 'Bạn'}
                            isClosed={isClosed}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
