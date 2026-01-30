import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";

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
        where: { 
            start: { gte: startRange }
        },
        include: { user: true }
    });

    const events = shifts.map((s: any) => ({
        id: s.id,
        title: s.user.name || 'Staff',
        start: s.start, // Date object directly passed to client component (Next.js server component passes Date fine to Client Component props since recent versions, or needs serialization)
                        // Actually, Next.js Server Actions / Server Components -> Client Components need JSON serializable props generally. Date is NOT JSON serializable in standard JSON, but Next.js swc compiler handles it better now? 
                        // To be safe: pass as string and parse in client.
        end: s.end,
        userId: s.userId,
        // resource for more check
    }));

    // Serialization for Client Component Props safety
    const safeEvents = events.map(e => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString()
    }));

    return (
        <main className="min-h-screen bg-gray-50/50 p-4">
            <div className="max-w-6xl mx-auto space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                     <h1 className="text-xl font-bold">📅 Lịch làm việc</h1>
                     <div className="text-sm text-gray-500">
                         Kéo thả vào khung giờ trống để đăng ký. Click vào lịch của bạn để xóa.
                     </div>
                 </div>
                 
                 <ScheduleCalendar 
                    initialEvents={safeEvents} 
                    userId={currentUser.id} 
                    isAdmin={currentUser.role === 'ADMIN'}
                    defaultDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                 />
            </div>
        </main>
    );
}
