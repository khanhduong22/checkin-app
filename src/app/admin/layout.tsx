import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
       <AdminSidebar />
       <div className="lg:pl-[240px] flex flex-col min-h-screen">
          <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-gray-950 px-6 lg:h-[60px] sticky top-0 z-10 w-full">
               <h1 className="font-semibold text-lg">Quản lý chấm công</h1>
          </header>
          <main className="flex-1 p-6">
              {children}
          </main>
       </div>
    </div>
  );
}
