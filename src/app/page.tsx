import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CheckInButtons from "@/components/CheckInButtons"
import UserProfile from "@/components/UserProfile"
import { Button } from "@/components/ui/button"
export default async function Home() {
  let session = await getServerSession(authOptions)

  let user;

  // --- DEV MODE: BYPASS LOGIN ---
  if (!session && process.env.NODE_ENV === 'development') {
    console.log("⚠️ Dev Mode: Bypassing Login");
    const devEmail = 'dev@local.host';
    
    // Create or retrieve a Dev User so functionality works
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
                where: {
                    timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                },
                orderBy: { timestamp: 'desc' }
            }
        }
    });

    // Mock Session
    session = {
        user: {
            name: user.name,
            email: user.email,
            image: null,
            // @ts-ignore
            id: user.id,
            role: user.role
        },
        expires: '2099-12-31'
    } as any;

  } else if (!session) {
    redirect('/login')
  } else {
    // Standard Production Logic
    user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
        include: {
            checkins: {
                where: {
                    timestamp: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                orderBy: { timestamp: 'desc' }
            }
        }
    })
  }

  // Get Office IP (for display only, real check is in Server Action)
  // Since we are server-side Next.js on Vercel, getting client IP here is tricky and strictly speaking 
  // we check it in the Action when they click the button.
  
  const { getUserMonthlyStats } = await import("@/lib/stats");
  const stats = await getUserMonthlyStats(user?.id!);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4 flex items-center justify-between">
                <div>
                     <h1 className="text-xl font-bold tracking-tight">Chấm Công</h1>
                     <p className="text-sm text-muted-foreground">Xin chào, {user?.name}</p>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-xl">
                    ⏰
                </div>
            </div>
            
            <div className="px-6 pb-6 space-y-6">
                
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-secondary/50 p-3">
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tháng này</div>
                        <div className="text-2xl font-bold text-primary">{stats.totalHours.toFixed(1)}h</div>
                        <div className="text-[10px] text-muted-foreground">Giờ làm việc</div>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-3">
                         <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chăm chỉ</div>
                         <div className="text-2xl font-bold text-primary">{stats.daysWorked}</div>
                         <div className="text-[10px] text-muted-foreground">Ngày công</div>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                </div>

                <CheckInButtons userId={user?.id!} todayCheckins={user?.checkins || []} />
                
                <div className="flex gap-3 pt-2">
                     <a href="/history" className="flex-1">
                        <Button variant="outline" className="w-full text-xs">
                            📜 Xem Lịch sử
                        </Button>
                    </a>
                    <a href="/schedule" className="flex-1">
                        <Button variant="outline" className="w-full text-xs">
                            📅 Đăng ký Lịch
                        </Button>
                    </a>
                </div>

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
        Internal System v2.0 • Secured by NextAuth
      </div>
    </main>
  )
}
