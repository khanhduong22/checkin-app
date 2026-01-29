import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkTimeStatus } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    let session = await getServerSession(authOptions);
    let user;

    // --- Reuse Dev Mode Logic for Consistency ---
    if (!session && process.env.NODE_ENV === 'development') {
        const devEmail = 'dev@local.host';
        user = await prisma.user.findUnique({ where: { email: devEmail } });
        if (!user) redirect('/'); // Should exist if visited home
        session = { user: { email: devEmail, name: user.name, id: user.id } } as any;
    } else if (!session) {
        redirect('/login');
    } else {
        user = await prisma.user.findUnique({ where: { email: session.user?.email! } });
    }

    if (!user) redirect('/login');

    const history = await prisma.checkIn.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        take: 500 // Increase limit for chart history
    });
    
    // Client Component for Chart (passed serialized data)
    // We import dynamic to avoid SSR hydration issues if dates are tricky, but here it's fine.
    const { default: HistoryGantt } = await import("@/components/HistoryGantt");

    return (
        <main className="min-h-screen bg-gray-50/50 p-4 justify-center">
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Lịch sử chấm công</h1>
                    <a href="/">
                        <Button variant="outline" size="sm">← Quay lại trang chủ</Button>
                    </a>
                </div>

                {/* GANTT CHART Visualization */}
                <HistoryGantt checkins={JSON.parse(JSON.stringify(history))} />

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-base">Chi tiết từng lượt</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="border-t max-h-[500px] overflow-auto">
                        {history.slice(0, 100).map((h: any) => ( // Show only recent 100 in list to keep light
                            <div key={h.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`h-2.5 w-2.5 rounded-full ${h.type === 'checkin' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">
                                            {h.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(h.timestamp).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className="font-mono text-sm font-medium flex items-center gap-2">
                                        {(() => {
                                            const status = checkTimeStatus(new Date(h.timestamp), h.type as any);
                                            return status ? (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            ) : null;
                                        })()}
                                        {new Date(h.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                        {h.ipAddress}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {history.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">Chưa có dữ liệu nào.</div>
                        )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
