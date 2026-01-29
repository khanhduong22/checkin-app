import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScheduleClient from "@/components/schedule/ScheduleClient";

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect('/login');

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect('/login');

    // Fetch future shifts
    const today = new Date();
    today.setDate(1); // Start of this month
    
    // Get shifts for current month and next month
    const shifts = await prisma.workShift.findMany({
        where: { 
            userId: user.id,
            date: { gte: today }
        }
    });

    // Serialize dates
    const serializedShifts = shifts.map((s: any) => ({
        ...s,
        date: s.date.toISOString(),
        createdAt: s.createdAt.toISOString()
    }));

    return (
        <main className="min-h-screen bg-gray-50/50 p-4 flex justify-center">
            <div className="w-full max-w-4xl">
                 <ScheduleClient shifts={serializedShifts} />
            </div>
        </main>
    );
}
