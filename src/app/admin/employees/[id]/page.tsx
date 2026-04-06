import { prisma } from "@/lib/prisma";
import { getUserMonthlyStats } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Banknote, Star, AlertTriangle } from "lucide-react";
import ManualCheckInForm from "@/components/admin/ManualCheckInForm";
import EmployeePayrollExportButton from "@/components/admin/EmployeePayrollExportButton";
import { redirect } from "next/navigation";
import MonthYearSelector from "@/components/admin/MonthYearSelector";

export const dynamic = 'force-dynamic';

export default async function EmployeeDetailPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { id: userId } = await params;
    const resolvedSearchParams = await searchParams;
    
    const now = new Date();
    const currentDefaultMonth = now.getMonth() + 1;
    const currentDefaultYear = now.getFullYear();

    const month = resolvedSearchParams.month ? parseInt(resolvedSearchParams.month as string, 10) : currentDefaultMonth;
    const year = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year as string, 10) : currentDefaultYear;
    
    // Day 1 of selected month in UTC (but stats will adjust based on VN offset)
    const targetDate = new Date(year, month - 1, 1);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            achievements: true,
            adjustments: { orderBy: { createdAt: 'desc' }, take: 20 },
            requests: { orderBy: { createdAt: 'desc' }, take: 10 }
        }
    });

    if (!user) return <div>Không tìm thấy nhân viên</div>;

    const stats = await getUserMonthlyStats(userId, targetDate);

    const f = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                 <Link href="/admin/employees">
                     <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                 </Link>
                 <div className="flex-1">
                     <h1 className="text-2xl font-bold flex items-center gap-2">
                         {user.name}
                         {user.role === 'ADMIN' && <Badge>Admin</Badge>}
                         <Badge variant="outline">{user.employmentType}</Badge>
                     </h1>
                     <p className="text-muted-foreground">{user.email}</p>
                 </div>
                 <div className="flex gap-2">
                      <EmployeePayrollExportButton
                          user={{ name: user.name || '', email: user.email || '', stats: { ...stats, employmentType: stats.employmentType as string || '', adjustments: stats.adjustments.map((a: any) => ({ ...a, date: a.date.toISOString() })) } }}
                          month={month}
                          year={year}
                      />
                      <Link href={`/admin/payroll`}>
                          <Button variant="outline">💰 Xem Lương</Button>
                      </Link>
                      <Link href={`/admin/schedule`}>
                          <Button variant="outline">📅 Xem Lịch</Button>
                      </Link>
                      <Link href={`/?viewAsUserId=${userId}`} target="_blank">
                          <Button variant="default" className="bg-purple-600 hover:bg-purple-700">👀 Xem Dashboard</Button>
                      </Link>
                  </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <Card>
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tổng Công</CardTitle></CardHeader>
                     <CardContent>
                         <div className="text-2xl font-bold">{stats.daysWorked} ngày</div>
                         <p className="text-xs text-muted-foreground">{stats.totalHours.toFixed(1)} giờ làm việc</p>
                     </CardContent>
                 </Card>
                 <Card>
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lương Tạm Tính</CardTitle></CardHeader>
                     <CardContent>
                         <div className="text-2xl font-bold text-emerald-600">{f(stats.totalSalary)}</div>
                         {user.employmentType === 'FULL_TIME' && (
                             <p className="text-xs text-red-500">Đã trừ nghỉ: {f(stats.deduction)}</p>
                         )}
                     </CardContent>
                 </Card>
                 <Card>
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Thưởng/Phạt</CardTitle></CardHeader>
                     <CardContent>
                         <div className={`text-2xl font-bold ${stats.totalAdjustments > 0 ? 'text-emerald-600' : stats.totalAdjustments < 0 ? 'text-red-500' : ''}`}>
                             {stats.totalAdjustments > 0 ? '+' : ''}{f(stats.totalAdjustments)}
                         </div>
                         <p className="text-xs text-muted-foreground">{stats.adjustments.length} giao dịch</p>
                     </CardContent>
                 </Card>
                 <Card>
                     <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Thành Tích</CardTitle></CardHeader>
                     <CardContent>
                         <div className="text-2xl font-bold">{user.achievements.length}</div>
                         <div className="flex gap-1 mt-1">
                             {user.achievements.slice(0, 5).map(a => (
                                 <span key={a.id} title={a.code} className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
                                     {a.code === 'LUCKY_STAR' ? '🌟' : '🏆'}
                                 </span>
                             ))}
                         </div>
                     </CardContent>
                 </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Main Column: Work History */}
                 <div className="md:col-span-2 space-y-6">
                     
                     <ManualCheckInForm userId={userId} />

                     <Card>
                         <CardHeader>
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                 <div>
                                     <CardTitle>Bảng Chấm Công Chi Tiết</CardTitle>
                                     <CardDescription>Dữ liệu tháng {month}/{year}</CardDescription>
                                 </div>
                                 <MonthYearSelector defaultMonth={currentDefaultMonth} defaultYear={currentDefaultYear} />
                             </div>
                         </CardHeader>
                         <CardContent>
                             <div className="rounded-md border">
                                 <table className="w-full text-sm">
                                     <thead className="bg-muted/50 border-b">
                                         <tr>
                                             <th className="h-10 px-4 text-left font-medium">Ngày</th>
                                             <th className="h-10 px-4 text-left font-medium">Ca</th>
                                             <th className="h-10 px-4 text-left font-medium">Vào / Ra</th>
                                             <th className="h-10 px-4 text-right font-medium">Giờ công</th>
                                             <th className="h-10 px-4 text-right font-medium">Lương</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {stats.dailyDetails.map((day: any, idx: number) => (
                                             <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                                 <td className="p-3 font-medium">{new Date(day.date).toLocaleDateString('vi-VN')}</td>
                                                 <td className="p-3 text-muted-foreground text-xs">{day.shift}</td>
                                                 <td className="p-3">
                                                     <div className="flex flex-col gap-1 text-xs">
                                                         {day.checkIn ? <span className="text-emerald-600">IN: {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(day.checkIn))}</span> : <span className="text-red-400">Thiếu IN</span>}
                                                         {day.checkInNote && <span className="text-[10px] text-gray-500 italic max-w-[200px] truncate" title={day.checkInNote}>{day.checkInNote}</span>}

                                                         {day.checkOut ? <span className="text-blue-600">OUT: {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(day.checkOut))}</span> : (day.checkIn ? <span className="text-red-400">Thiếu OUT</span> : null)}
                                                         {day.checkOutNote && day.checkOutNote !== day.checkInNote && <span className="text-[10px] text-gray-500 italic max-w-[200px] truncate" title={day.checkOutNote}>{day.checkOutNote}</span>}
                                                     </div>
                                                 </td>
                                                 <td className="p-3 text-right font-mono font-bold">
                                                     {day.isValid ? day.hours.toFixed(1) + 'h' : <span className="text-red-500">{day.error || 'Off'}</span>}
                                                 </td>
                                                 <td className="p-3 text-right text-muted-foreground">
                                                     {f(day.salary)}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </CardContent>
                     </Card>
                 </div>

                 {/* Side Column: Adjustments & Requests */}
                 <div className="space-y-6">
                     <Card>
                         <CardHeader>
                             <CardTitle>Lịch sử Thưởng/Phạt</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             {stats.adjustments.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
                             {stats.adjustments.map((adj) => (
                                 <div key={adj.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0">
                                     <div>
                                         <p className="font-medium text-sm">{adj.reason}</p>
                                         <p className="text-xs text-muted-foreground">{adj.date.toLocaleDateString('vi-VN')}</p>
                                     </div>
                                     <div className={`font-bold text-sm ${adj.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                         {adj.amount > 0 ? '+' : ''}{f(adj.amount)}
                                     </div>
                                 </div>
                             ))}
                         </CardContent>
                     </Card>

                     <Card>
                         <CardHeader>
                             <CardTitle>Yêu cầu / Nghỉ phép</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            {user.requests.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>}
                             {user.requests.map((req) => (
                                 <div key={req.id} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                     <div>
                                         <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px]">{req.type}</Badge>
                                            <span className="text-xs font-bold">{req.status}</span>
                                         </div>
                                         <p className="text-sm mt-1">{req.reason}</p>
                                         <p className="text-xs text-muted-foreground">{req.date.toLocaleDateString('vi-VN')}</p>
                                     </div>
                                 </div>
                             ))}
                         </CardContent>
                     </Card>
                 </div>
            </div>
        </div>
    );
}
