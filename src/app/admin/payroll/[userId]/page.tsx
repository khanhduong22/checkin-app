import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserMonthlyStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import PayrollDetailView from "@/components/PayrollDetailView";
import PayrollMonthSelector from "@/components/PayrollMonthSelector";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function AdminEmployeePayrollPage({ 
    params, 
    searchParams 
}: { 
    params: { userId: string }, 
    searchParams: { month?: string, year?: string } 
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

    const userId = params.userId;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const selectedYear = searchParams.year ? parseInt(searchParams.year) : currentYear;
    const selectedMonth = searchParams.month ? parseInt(searchParams.month) : currentMonth;

    const targetDate = new Date(selectedYear, selectedMonth - 1, 15);

    // Get target user info
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return <div>User not found</div>;

    const stats = await getUserMonthlyStats(userId, targetDate);

    const monthOptions = [];
    for(let i=0; i<6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthOptions.push({
            value: `${d.getFullYear()}-${d.getMonth() + 1}`,
            label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
        });
    }

    return (
        <div className="space-y-6">
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
            />
        </div>
    );
}
