import { prisma } from "@/lib/prisma";
import UserManager from "@/components/admin/UserManager";

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Danh sách nhân sự</h2>
                {/* <Button>Thêm nhân sự mới</Button> */}
            </div>
            
            <UserManager users={users} />
        </div>
    );
}
