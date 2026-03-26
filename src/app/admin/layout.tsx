import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import AdminTour from "@/components/admin/AdminTour";
import TourHelpButton from "@/components/TourHelpButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/');
  }

  const [pendingRequestsCount, pendingTasksCount] = await Promise.all([
    prisma.request.count({ where: { status: 'PENDING' } }),
    prisma.userTask.count({ where: { status: 'SUBMITTED' } })
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       <AdminTour />
       <TourHelpButton />
       <AdminSidebar pendingRequestsCount={pendingRequestsCount} pendingTasksCount={pendingTasksCount} />
       <div className="lg:pl-[240px] flex flex-col min-h-screen">
          <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-gray-950 px-6 lg:h-[60px] sticky top-0 z-10 w-full">
               <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden -ml-2">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[240px] p-0">
                      <div className="flex h-14 items-center border-b px-6">
                            <span className="font-semibold text-lg">Admin Panel</span>
                      </div>
                      <div className="py-2">
                        <AdminNavLinks 
                          pendingRequestsCount={pendingRequestsCount} 
                          pendingTasksCount={pendingTasksCount} 
                        />
                      </div>
                  </SheetContent>
               </Sheet>
               <h1 id="admin-header-title" className="font-semibold text-lg">Quản lý chấm công</h1>
          </header>
          <main className="flex-1 p-6">
              {children}
          </main>
       </div>
    </div>
  );
}
