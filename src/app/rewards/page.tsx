import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Medal, AlertTriangle, Trophy, Zap, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMonthlyReport } from "@/lib/report";
import { calculatePayroll } from "@/lib/payroll";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const report = await getMonthlyReport(month, year);
    const payroll = await calculatePayroll(month, year);

    // Top 3 Hardworking (Part-time only, by hours)
    const topHardworking = [...payroll]
        .filter((p: any) => p.employmentType !== 'FULL_TIME')
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 3);

    // Top 3 Overtime
    const topOvertime = [...payroll]
        .filter((p: any) => p.totalOvertimeHours && p.totalOvertimeHours > 0)
        .sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours)
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
        .sort((a, b) => b.points - a.points)
        .slice(0, 3);

    const formatTimeVal = (val: number) => {
        if (!val) return '--:--';
        const h = Math.floor(val);
        const m = Math.round((val - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    }

    return (
        <main className="min-h-screen bg-gray-50/50 p-4 pb-12 flex justify-center">
             <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center justify-between">
                     <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                             <Trophy className="h-8 w-8 text-yellow-500" />
                             Bảng Vàng Thành Tích
                        </h1>
                        <p className="text-muted-foreground mt-1">Cập nhật theo thời gian thực - Tháng {month}/{year}</p>
                     </div>
                     <a href="/">
                        <Button variant="outline" size="sm">← Trang chủ</Button>
                     </a>
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

                    {/* Top Check-in Sớm */}
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-sm">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2 text-blue-700">
                                🌅 Top Check-in Sớm
                            </CardTitle>
                            <CardDescription>Nhân viên check-in sớm nhất (Kỷ lục tháng)</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                {report.topEarlyBird.map((u: any, idx: number) => (
                                    <div key={u.user.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden border border-blue-200">
                                               {u.user.image ? (
                                                    <Image src={u.user.image} alt={u.user.name} width={32} height={32} className="w-full h-full object-cover" />
                                                ) : (u.user.name?.[0])}
                                            </div>
                                            <div className="font-bold text-gray-800">{u.user.name}</div>
                                        </div>
                                         <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                            {formatTimeVal(u.earliestCheckin)}
                                         </Badge>
                                    </div>
                                ))}
                                {report.topEarlyBird.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa ai check-in sớm.</div>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Cày Cuốc (OT) */}
                    <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-pink-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-pink-700">
                                🔥 Top Cày Cuốc (OT)
                            </CardTitle>
                            <CardDescription>Nhân viên có số giờ làm thêm (OT) cao nhất</CardDescription>
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
                                        <div className="text-xl font-bold text-pink-600">{u.totalOvertimeHours.toFixed(1)}h</div>
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
                            <CardDescription>Điểm đóng gói cao nhất (Top 1 Thưởng 100K)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topPacking.map((u, idx) => (
                                    <div key={u.id} className="flex items-center justify-between bg-white/60 p-3 rounded-lg shadow-sm relative overflow-hidden border border-purple-100">
                                        {idx === 0 && (
                                            <div className="absolute top-0 right-0 bg-yellow-400/90 text-yellow-900 border-b border-l border-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                +100K VND
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
                                ))}
                                {topPacking.length === 0 && <div className="text-sm italic text-muted-foreground">Chưa có ai đóng gói.</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="pt-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <Star className="h-5 w-5 text-orange-500 fill-orange-500" />
                        Chính sách Thưởng / Phạt cố định
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-orange-200 shadow-sm">
                            <CardHeader className="bg-orange-50/50 border-b">
                                <CardTitle className="text-base text-orange-700 flex items-center gap-2"><Flame className="h-4 w-4" /> Hệ Thống Streak</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="font-medium">Chuỗi 7 ngày</span><Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">50k</Badge></div>
                                <div className="flex justify-between items-center text-sm"><span className="font-medium">Chuỗi 30 ngày</span><Badge className="bg-red-100 text-red-700 hover:bg-red-200">200k + Vinh danh</Badge></div>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-red-200 shadow-sm">
                            <CardHeader className="bg-red-50/50 border-b">
                                <CardTitle className="text-base text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Khung Xử Phạt</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="font-medium">Muộn/Về sớm</span><span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">-50k/lần</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="font-medium">Quên Checkin/out</span><span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">-20k/lần</span></div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
             </div>
        </main>
    );
}
