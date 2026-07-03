import { prisma } from "@/lib/prisma";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import UploadScheduleButton from "@/components/schedule/UploadScheduleButton";
import ShiftHistoryDialog from "@/components/admin/ShiftHistoryDialog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage() {
    const session = await getServerSession(authOptions);
    
    // In development, bypass role check for convenience, but session must exist
    if (!session) redirect('/login');

    if (process.env.NODE_ENV !== 'development' && (session.user as any).role !== 'ADMIN') {
        redirect('/');
    }

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
        employmentType: s.user.employmentType,
    }));

    // Get all users for validation
    const allUsers = await prisma.user.findMany();

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <div>
                    <h2 className="text-2xl font-bold tracking-tight text-emerald-900">Quản lý Lịch làm việc</h2>
                    <p className="text-muted-foreground">Xem, quản lý và tải lên file Excel lịch làm hàng tuần.</p>
                 </div>
                 <div className="flex items-center gap-3">
                     <ShiftHistoryDialog />
                     <UploadScheduleButton />
                 </div>
             </div>

             <ScheduleCalendar 
                initialEvents={events} 
                userId={currentUser.id} 
                isAdmin={true} 
                users={allUsers}
            />
        </div>
    );
}
