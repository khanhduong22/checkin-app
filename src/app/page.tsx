import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CheckInButtons from "@/components/CheckInButtons"
import UserProfile from "@/components/UserProfile"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Get user info and today's checkins
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    include: {
        checkins: {
            where: {
                timestamp: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)) // From start of today
                }
            },
            orderBy: { timestamp: 'desc' }
        }
    }
  })

  // Get Office IP (for display only, real check is in Server Action)
  // Since we are server-side Next.js on Vercel, getting client IP here is tricky and strictly speaking 
  // we check it in the Action when they click the button.
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-6 animate-[slideUp_0.6s_ease-out]">
        <div className="mb-6 text-center">
             <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-4xl shadow-lg ring-1 ring-white/30 backdrop-blur-md mb-4 clock-pulse">
                ⏰
            </div>
            <h1 className="text-2xl font-bold">Chấm Công Nội Bộ</h1>
            <p className="text-sm opacity-80">Hệ thống điểm danh qua IP</p>
        </div>

        <UserProfile user={session.user} role={user?.role} />

        <div className="my-6 border-t border-gray-200/20"></div>

        <CheckInButtons userId={user?.id!} todayCheckins={user?.checkins || []} />

        {user?.role === 'ADMIN' && (
             <div className="mt-8 text-center">
                <a href="/admin" className="text-sm text-indigo-200 hover:text-white underline">
                    🔧 Trang Quản Trị
                </a>
            </div>
        )}
      </div>
    </main>
  )
}
