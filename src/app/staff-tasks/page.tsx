import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StaffTaskClient from "./_components/StaffTaskClient";
import AdminStaffTaskClient from "./_components/AdminStaffTaskClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffTasksPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user?.email! },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const isAdmin = currentUser.role === "ADMIN";

  // Check access permission for regular users
  if (!isAdmin && !currentUser.staffTasksAllowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
        <Card className="w-full max-w-md border-red-100 bg-red-50/20 shadow-lg text-center p-6 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-bold text-red-950">Không có quyền truy cập</CardTitle>
            <CardDescription className="text-xs text-red-800">
              Bạn không có quyền truy cập vào mục "Công việc và KPI".
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 text-sm text-red-900 leading-relaxed">
            Nội dung này chỉ hiển thị khi bạn được Chủ cửa hàng/Admin chỉ định trực tiếp và cấp quyền làm việc theo chỉ tiêu. Vui lòng liên hệ Admin để biết thêm chi tiết.
          </CardContent>
          <div className="pt-2">
            <Link href="/">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                Quay lại trang chủ
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  if (isAdmin) {
    // 1. Fetch all staff tasks for admin
    const tasks = await prisma.staffTask.findMany({
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all users for dropdown assignee filter
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        staffTasksAllowed: true,
      },
      orderBy: { name: "asc" },
    });

    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bảng giao việc & KPI</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Quản lý, phân công và kiểm duyệt hiệu suất làm việc theo chỉ tiêu của nhân viên.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5 font-bold">
              <ArrowLeft className="h-4 w-4" /> Về trang chủ
            </Button>
          </Link>
        </div>

        <AdminStaffTaskClient initialTasks={tasks as any} users={users} />
      </div>
    );
  }

  // Allowed Employee View
  const tasks = await prisma.staffTask.findMany({
    where: { assigneeId: currentUser.id },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Công việc và KPI</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi tiến độ, thực hiện công việc và kiểm soát hiệu suất chỉ tiêu để đạt đủ lương.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" className="gap-1.5 font-bold">
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Button>
        </Link>
      </div>

      <StaffTaskClient initialTasks={tasks as any} userId={currentUser.id} />
    </div>
  );
}
