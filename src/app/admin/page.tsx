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

    const [userCount, ipCount, checkinTodayCount] = await Promise.all([
        prisma.user.count(),
        prisma.allowedIP.count(),
        prisma.checkIn.count({
            where: {
                timestamp: { gte: new Date(new Date().setHours(0,0,0,0)) }
            }
        })
    ]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            
            <div className="grid gap-4 md:grid-cols-3">
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
                        <CardTitle className="text-sm font-medium">Lượt Check-in hôm nay</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">📍</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{checkinTodayCount}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Placeholder for Chart or Recent Activity */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Tổng quan</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
                            (Biểu đồ chấm công sẽ hiển thị ở đây)
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
