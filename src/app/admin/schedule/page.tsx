import { prisma } from "@/lib/prisma";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') redirect('/');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user?.email! } });
    if (!currentUser) redirect('/login');

    const today = new Date();
    const startRange = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Get all shifts
    const shifts = await prisma.workShift.findMany({
        where: { start: { gte: startRange } },
        include: { user: true }
    });

    const events = shifts.map((s: any) => ({
        id: s.id,
        title: s.user.name || 'Staff',
        start: s.start.toISOString(), 
        end: s.end.toISOString(),
        userId: s.userId,
    }));

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight">Quản lý Lịch làm việc</h2>
                    <p className="text-muted-foreground">Xem và quản lý lịch làm của toàn bộ nhân viên.</p>
                 </div>
                 {/* Maybe Export Button? */}
             </div>

             <ScheduleCalendar 
                initialEvents={events} 
                userId={currentUser.id} 
                isAdmin={true} 
            />
        </div>
    );
}
