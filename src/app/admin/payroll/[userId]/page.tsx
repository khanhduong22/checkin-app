import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMonthlyStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import PayrollDetailView from "@/components/PayrollDetailView";
import PayrollMonthSelector from "@/components/PayrollMonthSelector";
import { SendPayslipButton } from "@/components/admin/SendPayslipButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function AdminEmployeePayrollPage({
    params,
    searchParams
}: {
    params: Promise<{ userId: string }>,
    searchParams: Promise<{ month?: string, year?: string }>
}) {
    let session = await getServerSession(authOptions);

    // --- Dev Mode Bypass ---
    if (!session && process.env.NODE_ENV === 'development') {
        session = {
            user: {
                name: "Developer Local",
                email: "dev@local.host",
                image: "",
                role: "ADMIN"
            }
        } as any;
    }

    if (!session || (session.user as any).role !== 'ADMIN') redirect('/');

    const { userId } = await params;
    const resolvedSearch = await searchParams;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const selectedYear = resolvedSearch.year ? parseInt(resolvedSearch.year) : currentYear;
    const selectedMonth = resolvedSearch.month ? parseInt(resolvedSearch.month) : currentMonth;

    const targetDate = new Date(selectedYear, selectedMonth - 1, 15);

    // Get target user info, period status and payslip in parallel
    const [targetUser, period, payslip] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.payrollPeriod.findUnique({
            where: { month_year: { month: selectedMonth, year: selectedYear } }
        }),
        prisma.payslip.findUnique({
            where: { userId_month_year: { userId, month: selectedMonth, year: selectedYear } }
        })
    ]);

    if (!targetUser) return <div>User not found</div>;

    const isClosed = period?.status === 'CLOSED' && !!payslip;

    let stats: any;
    if (isClosed && payslip) {
        // Closed month: use saved snapshot (has bonusAmount, finalNet)
        stats = payslip.content as any;
    } else {
        // Open month: live calculation + apply bonus preview from PayrollPeriod
        const liveStats = await getUserMonthlyStats(userId, targetDate);
        const bonusPercent = period?.bonusPercent || 0;
        const bonusTargets: string[] = (period?.bonusTargets as string[]) || ['PART_TIME'];

        const shouldApplyBonus = bonusPercent > 0 && bonusTargets.includes(targetUser.employmentType);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/admin/payroll">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Chi tiết lương nhân viên</h1>
                        <p className="text-sm text-muted-foreground">Nhân viên: {targetUser.name}</p>
                    </div>
                </div>
                <SendPayslipButton
                    userId={userId}
                    month={selectedMonth}
                    year={selectedYear}
                    emailSentAt={payslip?.emailSentAt ?? null}
                    hasPayslip={isClosed}
                />
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border max-w-md">
                <label className="text-xs text-muted-foreground font-medium mb-2 block uppercase">
                    Kỳ lương
                </label>
                <PayrollMonthSelector
                    current={`${selectedYear}-${selectedMonth}`}
                    options={monthOptions}
                    baseUrl={`/admin/payroll/${userId}`}
                />
            </div>

            <PayrollDetailView
                stats={stats}
                monthStr={`${selectedMonth}/${selectedYear}`}
                userName={targetUser.name || 'Nhân viên'}
                isClosed={isClosed}
            />
        </div>
    );
}
