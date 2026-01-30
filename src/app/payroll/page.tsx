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

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string, year?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const selectedYear = searchParams.year ? parseInt(searchParams.year) : currentYear;
    const selectedMonth = searchParams.month ? parseInt(searchParams.month) : currentMonth;

    const targetDate = new Date(selectedYear, selectedMonth - 1, 15);

    let userId = (session.user as any).id;
    if (!userId) {
         const u = await prisma.user.findUnique({ where: { email: session.user?.email! } });
         userId = u?.id;
    }

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
                    <div className="p-4 bg-gray-50 border-b">
                         <p className="font-semibold text-gray-900">{session.user?.name}</p>
                         <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                    </div>
                    <div className="p-4">
                        <PayrollDetailView 
                            stats={stats} 
                            monthStr={`${selectedMonth}/${selectedYear}`} 
                            userName={session.user?.name || 'Bạn'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

