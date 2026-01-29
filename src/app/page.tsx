import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CheckInButtons from "@/components/CheckInButtons"
import UserProfile from "@/components/UserProfile"
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
  
  // Import shadcn components locally if not imported at top, or assume imported.
  // Wait, I need to add imports to the top of page.tsx first? Yes.
  // Actually, let's keep it simple with manual classes for now to avoid multiple edits, 
  // OR better: Since I'm editing the component, I can just use the classes I defined in 'globals.css' or 
  // simply use the 'card' class which I defined to match Shadcn.
  //
  // BUT the user wanted the Shadcn look.
  // Let's stick to the current structure but refine the classes to match exactly the screenshot provided (clean, bold).
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
        
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4 flex items-center justify-between">
                <div>
                     <h1 className="text-xl font-bold tracking-tight">Chấm Công</h1>
                     <p className="text-sm text-muted-foreground">Nội bộ công ty</p>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-xl">
                    ⏰
                </div>
            </div>
            
            <div className="px-6 pb-6 space-y-6">
                <UserProfile user={session.user} role={user?.role} />
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                </div>

                <CheckInButtons userId={user?.id!} todayCheckins={user?.checkins || []} />
                
                {user?.role === 'ADMIN' && (
                     <div className="pt-2 text-center">
                        <a href="/admin" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                            🔧 Truy cập trang quản trị
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
