import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManagerTasksClient } from "./_components/ManagerTasksClient";

export const dynamic = "force-dynamic";

export default async function ManagerTasksPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Checklist Quản Lý</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hệ thống checklist công việc hàng ngày bắt buộc dành cho nhân sự quản lý và vận hành.
        </p>
      </div>

      <ManagerTasksClient currentUser={currentUser} users={users} />
    </div>
  );
}
