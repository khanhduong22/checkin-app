import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    
    // Check Admin Role
    // @ts-ignore
    if (process.env.NODE_ENV === 'development') {
    } else if (!session || (session.user as any)?.role !== 'ADMIN') {
        if (session?.user?.email) {
             const user = await prisma.user.findUnique({ where: { email: session.user.email }});
             if (user?.role !== 'ADMIN') redirect('/?error=AccessDenied');
        } else {
             redirect('/login');
        }
    }

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const [userCount, ipCount, checkinsToday, todayShifts] = await Promise.all([
        prisma.user.count(),
        prisma.allowedIP.count(),
        prisma.checkIn.findMany({
            where: { timestamp: { gte: todayStart, lte: todayEnd } },
            include: { user: true },
            orderBy: { timestamp: 'asc' }
        }),
        prisma.workShift.findMany({
            where: {
                start: { gte: todayStart, lte: todayEnd } // Shifts starting today
            },
            include: { user: true },
            orderBy: { start: 'asc' }
        })
    ]);

    const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const getShiftStatus = (checkin: any) => {
        const userShifts = todayShifts.filter((s: any) => s.userId === checkin.userId);
        if (!userShifts.length) return null;

        // Find closest shift
        let match: any = null;
        let minDiff = Infinity;

        for (const s of userShifts) {
             const target = checkin.type === 'checkin' ? new Date(s.start).getTime() : new Date(s.end).getTime();
             const diff = Math.abs(new Date(checkin.timestamp).getTime() - target);
             if (diff < minDiff) {
                 minDiff = diff;
                 match = s;
             }
        }
        
        if (!match) return null; // No matching shift found (Unscheduled work?)
        
        const targetTime = checkin.type === 'checkin' ? new Date(match.start).getTime() : new Date(match.end).getTime();
        const diffMs = new Date(checkin.timestamp).getTime() - targetTime;
        const diffMins = Math.round(diffMs / 60000);

        if (Math.abs(diffMins) < 1) return null; // Ignore < 1 min

        if (checkin.type === 'checkin') {
            if (diffMins > 0) return <span className="text-red-500 font-bold ml-1">(Trễ {diffMins}p)</span>;
            return <span className="text-emerald-600 ml-1 text-[10px]">(Sớm {Math.abs(diffMins)}p)</span>;
        } else {
            if (diffMins < 0) return <span className="text-orange-500 font-bold ml-1">(Sớm {Math.abs(diffMins)}p)</span>;
            return <span className="text-gray-500 ml-1 text-[10px]">(Sau {diffMins}p)</span>;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Nhân sự</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">👥</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IP Văn phòng</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">🌐</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ipCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lượt Check-in</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">🟢</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{checkinsToday.filter((c: any) => c.type === 'checkin').length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lượt Check-out</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">�</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{checkinsToday.filter((c: any) => c.type === 'checkout').length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Check-in Activity */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Hoạt động chấm công</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {checkinsToday.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Chưa có lượt chấm công nào hôm nay.</p>
                            ) : (
                                <div className="space-y-4">
                                    {checkinsToday.map((checkin) => (
                                        <div key={checkin.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${checkin.type === 'checkin' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {checkin.user.name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{checkin.user.name}</p>
                                                    <p className={`text-xs ${checkin.type === 'checkin' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                        {checkin.type === 'checkin' ? '🟢 Vào ca' : '👋 Tan ca'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold font-mono">
                                                    {formatTime(checkin.timestamp)}
                                                </p>
                                                <div className="flex justify-end">
                                                    {getShiftStatus(checkin)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Today's Schedule */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Lịch làm việc hôm nay</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                             {todayShifts.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Không có lịch làm việc hôm nay.</p>
                            ) : (
                                <div className="space-y-3">
                                    {todayShifts.map((shift) => (
                                        <div key={shift.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border">
                                           <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                                    {shift.user.name?.[0]}
                                                </div>
                                                <span className="text-sm font-medium">{shift.user.name}</span>
                                           </div>
                                           <div className="text-xs font-mono font-medium">
                                               {formatTime(shift.start)} - {formatTime(shift.end)}
                                           </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
