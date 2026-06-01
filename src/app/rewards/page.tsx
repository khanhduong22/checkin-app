import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Medal, AlertTriangle, Trophy, Zap, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMonthlyReport } from "@/lib/report";
import { calculatePayroll } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import PayrollMonthSelector from "@/components/PayrollMonthSelector";

export const dynamic = 'force-dynamic';

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
    const now = new Date();
    const resolvedParams = await searchParams;
    const month = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1;
    const year = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear();

    const report = await getMonthlyReport(month, year);
    const payroll = await calculatePayroll(month, year);

    // Filter out inactive users who have quit
    const excludedNames = ['Nía'];
    const activePayroll = payroll.filter((p: any) => !excludedNames.includes(p.name));
    report.topDiscipline = report.topDiscipline.filter((u: any) => !excludedNames.includes(u.user.name));

    // Top 3 Hardworking (Part-time only, by hours)
    const topHardworking = [...activePayroll]
        .filter((p: any) => p.employmentType !== 'FULL_TIME')
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 3);

    const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
    const referenceDay = isCurrentMonth ? now.getDate() : 31;
    let minDays = 1;
    if (referenceDay >= 22) {
        minDays = 16;
    } else if (referenceDay >= 8) {
        minDays = 8;
    }

    // Top 3 Overtime (Average per day)
    const topOvertime = [...activePayroll]
        .filter((p: any) => p.totalOvertimeHours && p.totalOvertimeHours > 0 && p.daysWorked >= minDays)
        .map((p: any) => ({ ...p, avgOvertime: p.totalOvertimeHours / p.daysWorked }))
        .sort((a, b) => b.avgOvertime - a.avgOvertime)
        .slice(0, 3);

    // Leaderboard Vua Đóng Hàng
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const pointTasks = await prisma.userTask.findMany({
        where: {
            status: "APPROVED",
            updatedAt: { gte: startDate, lte: endDate },
            taskDefinition: { unit: 'điểm' }
        },
        include: { user: true }
    });

    const userPointsMap: Record<string, { id: string, name: string, image: string|null, points: number }> = {};
    for (const pt of pointTasks) {
        if (!userPointsMap[pt.userId]) {
            userPointsMap[pt.userId] = { id: pt.user.id, name: pt.user.name || 'Incognito', image: pt.user.image, points: 0 };
        }
        userPointsMap[pt.userId].points += (pt.finalAmount || 0);
    }

    const topPacking = Object.values(userPointsMap)
        .filter(u => !excludedNames.includes(u.name))
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

    // Leaderboard Chiến Thần Bưng Hàng
    const carryingTasks = await prisma.userTask.findMany({
        where: {
            status: "APPROVED",
            updatedAt: { gte: startDate, lte: endDate },
            taskDefinition: { unit: 'điểm-bưng' }
        },
        include: { user: true }
    });

    const userCarryingMap: Record<string, { id: string, name: string, image: string|null, points: number }> = {};
    for (const ct of carryingTasks) {
        if (!userCarryingMap[ct.userId]) {
            userCarryingMap[ct.userId] = { id: ct.user.id, name: ct.user.name || 'Incognito', image: ct.user.image, points: 0 };
        }
        userCarryingMap[ct.userId].points += (ct.finalAmount || 0);
    }

    const topCarrying = Object.values(userCarryingMap)
        .filter(u => !excludedNames.includes(u.name) && u.points >= 10)
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

    const formatDuration = (mins: number) => {
        if (!mins) return '0p';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}p`;
        return `${m}p`;
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
        <main className="min-h-screen bg-gray-50/50 p-4 pb-12 flex justify-center">
             <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                             <Trophy className="h-8 w-8 text-yellow-500" />
                             Bảng Vàng Thành Tích
                        </h1>
                        <p className="text-muted-foreground mt-1">Cập nhật theo thời gian thực - Tháng {month}/{year}</p>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="w-40 md:w-48 bg-white p-2 rounded-lg shadow-sm border">
                            <PayrollMonthSelector current={`${year}-${month}`} options={monthOptions} baseUrl="/rewards" />
                        </div>
                        <a href="/">
                            <Button variant="outline" size="sm">← Trang chủ</Button>
                        </a>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Chăm Chỉ */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                                🐝 Top Chăm Chỉ
                            </CardTitle>
                            <CardDescription>Nhân viên có tổng giờ làm cao nhất</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topHardworking.map((u, idx) => (
                                    <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm border border-orange-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{u.name}</div>
                                                <div className="text-xs text-muted-foreground">{u.daysWorked} ngày công</div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-orange-600">{u.totalHours.toFixed(1)}h</div>
                                    </div>
                                ))}
                                {topHardworking.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có dữ liệu.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Kỷ Luật */}
                    <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-emerald-200 shadow-sm">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-emerald-700">
                                🌟 Top Kỷ Luật
                            </CardTitle>
                            <CardDescription>Tỷ lệ đi làm đúng giờ cao nhất</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                {report.topDiscipline.map((u: any, idx: number) => (
                                    <div key={u.user.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm border border-emerald-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden border border-emerald-200">
                                               {u.user.image ? (
                                                    <Image src={u.user.image} alt={u.user.name} width={32} height={32} className="w-full h-full object-cover" />
                                                ) : (u.user.name?.[0])}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{u.user.name}</div>
                                                <div className="text-xs text-muted-foreground">{u.totalScheduledCheckins} ca làm</div>
                                            </div>
                                        </div>
                                         <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                                            {u.punctualityRate.toFixed(1)}%
                                         </Badge>
                                    </div>
                                ))}
                                {report.topDiscipline.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có dữ liệu.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Cày Cuốc (OT) */}
                    <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-pink-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-pink-700">
                                🔥 Top Cày Cuốc (OT)
                            </CardTitle>
                            <CardDescription>Trung bình giờ làm thêm (OT) mỗi ca cao nhất</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topOvertime.map((u: any, idx) => (
                                    <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm border border-pink-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? 'bg-pink-500' : idx === 1 ? 'bg-gray-400' : 'bg-red-900'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{u.name}</div>
                                                <div className="text-xs text-muted-foreground">{u.daysWorked} ngày công</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-pink-600">{u.avgOvertime.toFixed(1)}h<span className="text-sm font-normal">/ca</span></div>
                                            <div className="text-xs text-muted-foreground">Tổng: {u.totalOvertimeHours.toFixed(1)}h</div>
                                        </div>
                                    </div>
                                ))}
                                {topOvertime.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai làm OT.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vua Đóng Hàng */}
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-purple-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-700">
                                📦 Vua Đóng Hàng
                            </CardTitle>
                            <CardDescription>Điểm đóng gói cao nhất (Top 1 Thưởng 100K, &gt;50đ Thưởng 200K)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topPacking.map((u, idx) => {
                                    const prize = u.points > 50 ? "200K" : "100K";
                                    return (
                                        <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm relative overflow-hidden border border-purple-100">
                                            {idx === 0 && (
                                                <div className="absolute top-0 right-0 bg-yellow-400/90 text-yellow-900 border-b border-l border-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                    +{prize} VND
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-gray-400' : 'bg-purple-900'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="font-bold text-gray-800">{u.name}</div>
                                            </div>
                                            <div className="text-xl font-bold text-purple-600">{u.points}đ</div>
                                        </div>
                                    );
                                })}
                                {topPacking.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai đóng gói.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Chiến Thần Bưng Hàng */}
                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200 shadow-sm md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700">
                                🛗 Chiến Thần Bưng Hàng
                            </CardTitle>
                            <CardDescription>Điểm bưng hàng lên lầu cao nhất (Tối thiểu 10đ, Top 1 100K, &gt;50đ Thưởng 200K)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topCarrying.map((u, idx) => {
                                    const prize = u.points > 50 ? "200K" : "100K";
                                    return (
                                        <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm relative overflow-hidden border border-orange-100">
                                            {idx === 0 && (
                                                <div className="absolute top-0 right-0 bg-yellow-400/90 text-yellow-900 border-b border-l border-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                    +{prize} VND
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-900'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="font-bold text-gray-800">{u.name}</div>
                                            </div>
                                            <div className="text-xl font-bold text-amber-600">{u.points}đ</div>
                                        </div>
                                    );
                                })}
                                {topCarrying.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai bưng hàng.</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
             </div>
        </main>
    );
}
