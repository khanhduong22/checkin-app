import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect('/login');

    const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!currentUser) redirect('/login');

    // Get shifts for current view range (e.g. this month + next month)
    // Simplify: Get all future shifts or last 2 months
    const today = new Date();
    const startRange = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    const shifts = await prisma.workShift.findMany({
        where: currentUser.role === 'ADMIN'
            ? { start: { gte: startRange } }
            : {
                start: { gte: startRange },
                OR: [
                    { userId: currentUser.id },
                    { isOpenForSwap: true }
                ]
              },
        include: { user: true }
    });

    const events = shifts.map((s: any) => ({
        id: s.id,
        title: s.user.name || 'Staff',
        start: s.start,
        end: s.end,
        userId: s.userId,
        isOpenForSwap: s.isOpenForSwap,
        employmentType: s.user.employmentType,
    }));

    // Serialization for Client Component Props safety
    const safeEvents = events.map((e: any) => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString()
    }));

    return (
        <main className="min-h-screen bg-gray-50/50 p-4">
            <div className="max-w-6xl mx-auto space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                     <div className="flex items-center gap-2">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold">📅 Lịch làm việc</h1>
                     </div>
                     <div className="text-sm text-gray-500">
                         Kéo thả vào khung giờ trống để đăng ký. Click vào lịch của bạn để xóa.
                     </div>
                 </div>
                 
                 <ScheduleCalendar 
                    initialEvents={safeEvents} 
                    userId={currentUser.id} 
                    isAdmin={currentUser.role === 'ADMIN'}
                 />
            </div>
        </main>
    );
}
