import { getAvailableTasks, getUserTasks } from "@/actions/task-actions";
import { AvailableTasksList } from "@/app/tasks/_components/available-tasks-list";
import { MyTasksList } from "@/app/tasks/_components/my-tasks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function PackingPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const availableTasksRes = await getAvailableTasks();
  const userTasksRes = await getUserTasks();

  const availableTasks = availableTasksRes.success ? availableTasksRes.data || [] : [];
  const userTasks = userTasksRes.success ? userTasksRes.data || [] : [];

  const packingTasks = availableTasks.filter((t: any) => t.unit === 'điểm');
  
  // Filter user tasks to only include those that are packing
  const userPackingTasks = userTasks.filter((t: any) => t.taskDefinition?.unit === 'điểm');

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultTab = resolvedSearchParams?.tab || "general";

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let totalPoints = 0;
  let approvedCount = 0;
  let pendingCount = 0;

  userPackingTasks.forEach((t: any) => {
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
        <h1 className="text-3xl font-bold text-purple-700">📦 Khu Vực Đóng Gói</h1>
        <p className="text-muted-foreground">Khai báo số lượng đơn hàng lớn đã đóng gói để tích luỹ điểm thưởng cuối tháng (Thưởng +100K cho Top 1).</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-purple-600">Điểm tháng này</span>
          <span className="text-2xl sm:text-3xl font-bold text-purple-800">{totalPoints}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-emerald-600">Đơn đã duyệt</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-800">{approvedCount}</span>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-orange-600">Đang chờ</span>
          <span className="text-xl sm:text-2xl font-bold text-orange-800">{pendingCount}</span>
        </div>
      </div>

      <Tabs defaultValue={defaultTab === 'my-tasks' ? 'my-tasks' : 'general'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger id="tab-general" value="general">Bảng Giá Điểm</TabsTrigger>
          <TabsTrigger id="tab-my-tasks" value="my-tasks">Lịch Sử Khai Báo</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bảng Giá Quy Đổi</h2>
            <div className="text-sm text-muted-foreground">Nhấn chọn để bắt đầu ghi nhận số lượng.</div>
          </div>
          <AvailableTasksList tasks={packingTasks} />
        </TabsContent>

        <TabsContent value="my-tasks">
          <MyTasksList initialTasks={userPackingTasks as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
