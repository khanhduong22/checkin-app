import { getAvailableTasks, getUserTasks } from "@/actions/task-actions";
import { AvailableTasksList } from "@/app/tasks/_components/available-tasks-list";
import { MyTasksList } from "@/app/tasks/_components/my-tasks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function CarryingPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const availableTasksRes = await getAvailableTasks();
  const userTasksRes = await getUserTasks();

  const availableTasks = availableTasksRes.success ? availableTasksRes.data || [] : [];
  const userTasks = userTasksRes.success ? userTasksRes.data || [] : [];

  const carryingTasks = availableTasks.filter((t: any) => t.unit === 'điểm-bưng');
  
  // Filter user tasks to only include those that are carrying
  const userCarryingTasks = userTasks.filter((t: any) => t.taskDefinition?.unit === 'điểm-bưng');

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultTab = resolvedSearchParams?.tab || "general";

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let totalPoints = 0;
  let approvedCount = 0;
  let pendingCount = 0;

  userCarryingTasks.forEach((t: any) => {
    const taskDate = new Date(t.updatedAt || t.createdAt);
    if (taskDate >= currentMonthStart && taskDate <= currentMonthEnd) {
      if (t.status === 'APPROVED') {
        totalPoints += (t.finalAmount || 0);
        approvedCount++;
      } else if (t.status === 'PENDING' || t.status === 'SUBMITTED') {
        pendingCount++;
      }
    }
  });

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-amber-700">🛗 Chiến Thần Bưng Hàng</h1>
        <p className="text-muted-foreground">Khai báo số lượng bưng hàng lên lầu để tích luỹ điểm thưởng cuối tháng (Thưởng +200K cho Top 1).</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-amber-600">Điểm bưng tháng này</span>
          <span className="text-2xl sm:text-3xl font-bold text-amber-800">{totalPoints}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-emerald-600">Lượt đã duyệt</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-800">{approvedCount}</span>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-orange-600">Đang chờ</span>
          <span className="text-xl sm:text-2xl font-bold text-orange-800">{pendingCount}</span>
        </div>
      </div>

      <Tabs defaultValue={defaultTab === 'my-tasks' ? 'my-tasks' : 'general'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger id="tab-general" value="general">Bảng Quy Đổi Điểm</TabsTrigger>
          <TabsTrigger id="tab-my-tasks" value="my-tasks">Lịch Sử Khai Báo</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bảng Quy Đổi</h2>
            <div className="text-sm text-muted-foreground">Nhấn chọn loại thùng để ghi nhận bưng lên lầu.</div>
          </div>
          <AvailableTasksList tasks={carryingTasks} />
        </TabsContent>

        <TabsContent value="my-tasks">
          <MyTasksList initialTasks={userCarryingTasks as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
