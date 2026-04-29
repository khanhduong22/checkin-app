import { getMonthlyReport } from "@/lib/report";
import { calculatePayroll } from "@/lib/payroll";
import { format } from "date-fns";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
    const now = new Date();
    const resolvedParams = await searchParams;
    const month = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1;
    const year = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear();

    const report = await getMonthlyReport(month, year);
    const payroll = await calculatePayroll(month, year); // To get Top Hours

    const topHardworking = [...payroll]
        .filter((p: any) => p.employmentType !== 'FULL_TIME')
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 3);

    const topOvertime = [...payroll]
        .filter((p: any) => p.totalOvertimeHours && p.totalOvertimeHours > 0 && p.daysWorked > 0)
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

    const userPointsMap: Record<string, { id: string, name: string, points: number }> = {};
    for (const pt of pointTasks) {
        if (!userPointsMap[pt.userId]) {
            userPointsMap[pt.userId] = { id: pt.user.id, name: pt.user.name || '', points: 0 };
        }
        userPointsMap[pt.userId].points += (pt.finalAmount || 0);
    }

    const topPacking = Object.values(userPointsMap)
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

    // Format duration helper (125 -> 2h 5p)
    const formatDuration = (mins: number) => {
        if (!mins) return '0p';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}p`;
        return `${m}p`;
    }

    const totalPayrollCost = payroll.reduce((sum: number, p: any) => sum + p.totalSalary, 0);
    const totalHoursAll = payroll.reduce((sum: number, p: any) => sum + p.totalHours, 0);
    const totalEmployeeCount = payroll.length;

    return (
        <div className="space-y-8">
            <div>
                 <h2 className="text-3xl font-bold tracking-tight">Bảng Thành Tích & Báo Cáo</h2>
                 <p className="text-muted-foreground">Tháng {month}/{year}</p>
            </div>

             {/* 📊 SUMMARY STATS */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card id="report-summary-stats" className="bg-emerald-50 border-emerald-200">
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-600">Tổng Chi Lương (Tạm tính)</CardTitle></CardHeader>
                     <CardContent><div className="text-2xl font-bold text-emerald-700">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPayrollCost)}</div></CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Tổng Giờ Làm</CardTitle></CardHeader>
                     <CardContent><div className="text-2xl font-bold text-blue-700">{totalHoursAll.toFixed(1)}h</div></CardContent>
                </Card>
                 <Card className="bg-purple-50 border-purple-200">
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600">Nhân sự Active</CardTitle></CardHeader>
                     <CardContent><div className="text-2xl font-bold text-purple-700">{totalEmployeeCount}</div></CardContent>
                </Card>
            </div>
            
            {/* 🏆 HERO SECTION: HALL OF FAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card id="report-top-hardworking" className="bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            🐝 Top Chăm Chỉ (Giờ làm)
                        </CardTitle>
                        <CardDescription>Nhân viên có tổng giờ làm cao nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topHardworking.map((u, idx) => (
                                <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                                            ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold">
                                                <Link href={`/admin/employees/${u.id}`} className="hover:underline">
                                                    {u.name}
                                                </Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{u.daysWorked} ngày công</div>
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-orange-600">{u.totalHours.toFixed(1)}h</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-emerald-200">
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-emerald-700">
                            🌟 Top Kỷ Luật
                        </CardTitle>
                        <CardDescription>Tỷ lệ đi làm đúng giờ cao nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                            {report.topDiscipline.map((u: any, idx: number) => (
                                <div key={u.user.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
                                           {u.user.image ? (
                                                <Image
                                                    src={u.user.image}
                                                    alt={u.user.name || 'User avatar'}
                                                    width={32}
                                                    height={32}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                u.user.name?.[0]
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold">
                                                <Link href={`/admin/employees/${u.user.id}`} className="hover:underline">
                                                    {u.user.name}
                                                </Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{u.totalScheduledCheckins} ca làm</div>
                                        </div>
                                    </div>
                                     <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                        {u.punctualityRate.toFixed(1)}%
                                     </Badge>
                                </div>
                            ))}
                            {report.topDiscipline.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai đi làm.</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card id="report-top-overtime" className="bg-gradient-to-br from-rose-50 to-pink-50 border-pink-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-pink-700">
                            🔥 Top Cày Cuốc (OT)
                        </CardTitle>
                        <CardDescription>Trung bình giờ làm thêm (OT) mỗi ca cao nhất</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topOvertime.map((u: any, idx) => (
                                <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                                            ${idx === 0 ? 'bg-pink-500' : idx === 1 ? 'bg-gray-400' : 'bg-red-900'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold">
                                                <Link href={`/admin/employees/${u.id}`} className="hover:underline">
                                                    {u.name}
                                                </Link>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{u.daysWorked} ngày công</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-pink-600">{u.avgOvertime.toFixed(1)}h<span className="text-sm font-normal">/ca</span></div>
                                        <div className="text-xs text-muted-foreground">Tổng: {u.totalOvertimeHours.toFixed(1)}h</div>
                                    </div>
                                </div>
                            ))}
                            {topOvertime.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai làm thêm giờ.</div>}
                        </div>
                    </CardContent>
                </Card>

                <Card id="report-top-packing" className="bg-gradient-to-br from-indigo-50 to-purple-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            📦 Vua Đóng Hàng
                        </CardTitle>
                        <CardDescription>Điểm đóng gói lớn (Top 1 được 100K)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topPacking.map((u, idx) => (
                                <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm relative overflow-hidden">
                                    {idx === 0 && (
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg whitespace-nowrap">
                                            +100K VND
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                                            ${idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-gray-400' : 'bg-purple-900'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold">
                                                <Link href={`/admin/employees/${u.id}`} className="hover:underline">
                                                    {u.name}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold text-purple-600">{u.points}đ</div>
                                </div>
                            ))}
                            {topPacking.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai đóng hàng bự.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🔥 SHAME SECTION: VIOLATIONS */}
            <Card id="report-violations" className="border-red-100 shadow-md">
                 <CardHeader className="border-b bg-red-50/30">
                    <CardTitle className="text-red-700 flex items-center gap-2">
                        🚨 Báo cáo Vi Phạm (Đi muộn / Về sớm)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Nhân viên</th>
                                <th className="px-6 py-3 text-center">Số lần đi muộn</th>
                                <th className="px-6 py-3 text-center">Tổng phút muộn</th>
                                <th className="px-6 py-3 text-center">Về sớm (lần)</th>
                                <th className="px-6 py-3 text-right">Đánh giá</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {report.topLate.filter((u: any) => u.lateCount > 0 || u.earlyLeaveCount > 0).map((u: any) => (
                                <tr key={u.user.id} className="hover:bg-red-50/20 transition-colors">
                                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                                        <span className="text-red-500 font-bold">⚠️</span>
                                        <Link href={`/admin/employees/${u.user.id}`} className="hover:underline">
                                            {u.user.name}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-red-600">{u.lateCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-red-600 font-mono">{u.totalLateMinutes}p</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-orange-600">
                                        {u.earlyLeaveCount}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {u.lateCount > 5 ? (
                                            <Badge variant="destructive">Cảnh báo đỏ</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Cần nhắc nhở</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {report.topLate.filter((u: any) => u.lateCount > 0 || u.earlyLeaveCount > 0).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">
                                        👏 Tuyệt vời! Tháng này chưa có ai vi phạm.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
