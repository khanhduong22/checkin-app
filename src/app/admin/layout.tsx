import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavLinks from "@/components/admin/AdminNavLinks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import AdminTour from "@/components/admin/AdminTour";
import TourHelpButton from "@/components/TourHelpButton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       <AdminTour />
       <TourHelpButton />
       <AdminSidebar />
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
                        <AdminNavLinks />
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
