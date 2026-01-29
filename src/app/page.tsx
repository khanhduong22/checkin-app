import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CheckInButtons from "@/components/CheckInButtons"
import { Button } from "@/components/ui/button"
import GachaButton from "@/components/GachaButton";

export default async function Home() {
  let session = await getServerSession(authOptions)
  let user;

  // --- DEV MODE: BYPASS LOGIN ---
  if (!session && process.env.NODE_ENV === 'development') {
    console.log("⚠️ Dev Mode: Bypassing Login");
    const devEmail = 'dev@local.host';
    user = await prisma.user.upsert({
        where: { email: devEmail },
        update: {},
        create: {
            email: devEmail,
            name: 'Developer Local',
            role: 'ADMIN',
            hourlyRate: 100000
        },
        include: {
            checkins: {
                where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                orderBy: { timestamp: 'desc' }
            }
        }
    });

    session = {
        user: { name: user.name, email: user.email, image: null, id: user.id, role: user.role },
        expires: '2099-12-31'
    } as any;
  } else if (!session) {
    redirect('/login')
  } else {
    user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
        include: {
            checkins: {
                where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                orderBy: { timestamp: 'desc' }
            }
        }
    })
  }

  const { getUserMonthlyStats } = await import("@/lib/stats");
  const stats = await getUserMonthlyStats(user?.id!);

  // New Features
  const { calculateStreak } = await import("@/lib/streak");
  const streak = await calculateStreak(user?.id!);

  const announcements = await prisma.announcement.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' }
  });
  const AnnouncementBar = (await import("@/components/AnnouncementBar")).default;
  const StickyBoard = (await import("@/components/StickyBoard")).default;
  const PrivacyStats = (await import("@/components/PrivacyStats")).default;

  const notes = await prisma.stickyNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { user: true }
  });

  // Serialize Notes for Client Component
  const serializedNotes = notes.map((n: any) => ({
      ...n,
      createdAt: n.createdAt.toISOString()
  }));

  // Check available swaps
  const swapCount = user ? await prisma.workShift.count({
      where: {
          isOpenForSwap: true,
          userId: { not: user.id },
          date: { gte: new Date() }
      }
  }) : 0;

  // Check checkin status for Gacha
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const hasCheckedInToday = user ? await prisma.checkIn.findFirst({
      where: {
          userId: user.id,
          timestamp: { gte: todayStart },
          type: 'checkin'
      }
  }) : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        
        {/* Announcements */}
        <AnnouncementBar announcements={announcements} />

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm relative overflow-hidden">
            {/* Streak Badge */}
            <div className="absolute top-4 right-4 flex gap-2">
                {swapCount > 0 && (
                     <a href="/schedule" className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-[10px] font-bold border border-purple-200 shadow-sm animate-pulse hover:bg-purple-200 transition-colors">
                        🎁 {swapCount} kèo thơm
                    </a>
                )}
                {streak > 0 && (
                    <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-[10px] font-bold border border-orange-200 shadow-sm">
                        🔥 {streak}
                    </div>
                )}
            </div>

            <div className={`p-6 pb-4 flex items-center justify-between ${streak > 0 || swapCount > 0 ? 'mt-6' : ''}`}>
                <div>
                     <h1 className="text-xl font-bold tracking-tight">Chấm Công</h1>
                     <p className="text-sm text-muted-foreground">Xin chào, {user?.name}</p>
                </div>
                 {streak === 0 && (
                     <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-xl">
                        ⏰
                    </div>
                )}
            </div>
            
            <div className="px-6 pb-6 space-y-6">
                
                {/* Privacy Stats */}
                <PrivacyStats 
                    totalHours={stats.totalHours} 
                    totalSalary={stats.totalSalary} 
                    daysWorked={stats.daysWorked} 
                    baseSalary={stats.baseSalary}
                    totalAdjustments={stats.totalAdjustments}
                />

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                </div>

                <CheckInButtons userId={user?.id!} todayCheckins={user?.checkins || []} />
                
                {/* Gacha Game */}
                <div className="pt-2">
                    <GachaButton userId={user?.id!} hasCheckedIn={!!hasCheckedInToday} />
                </div>

                {/* Sticky Notes Widget */}
                <div className="pt-2">
                    <StickyBoard notes={serializedNotes} currentUser={session?.user} />
                </div>

                <div className="flex gap-3 pt-2">
                     <a href="/history" className="flex-1">
                        <Button variant="outline" className="w-full text-xs">
                            📜 Lịch sử
                        </Button>
                    </a>
                    <a href="/rewards" className="flex-1">
                        <Button variant="outline" className="w-full text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200">
                            🎁 Thưởng/Phạt
                        </Button>
                    </a>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <a href="/schedule" className="block w-full">
                        <Button variant="outline" className="w-full text-xs">
                            📅 Đăng ký Lịch
                        </Button>
                    </a>
                    <a href="/requests" className="block w-full">
                        <Button variant="ghost" className="w-full text-xs text-muted-foreground bg-gray-100/50">
                            📝 Xin giải trình
                        </Button>
                    </a>
                </div>
                
                {/* Admin Link... */}
                {user?.role === 'ADMIN' && (
                     <div className="pt-2 text-center border-t border-dashed mt-4">
                        <a href="/admin" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mt-4">
                            🔧 Admin Dashboard
                        </a>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="mt-6 text-[10px] text-muted-foreground font-mono opacity-50">
        Internal System v2.2 • Secured by NextAuth
      </div>
    </main>
  )
}
