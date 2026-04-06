import { getTaskDefinitions, getPendingTasks, getTaskItems, getReviewedTasks } from "@/actions/task-actions";
import { TaskDefinitionList } from "./_components/task-definition-list";
import { TaskReviewList } from "./_components/task-review-list";
import { TaskHistoryList } from "./_components/task-history-list";
import { TaskItemList } from "./_components/task-item-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : 0;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const definitionsRes = await getTaskDefinitions();
  const pendingTasksRes = await getPendingTasks();
  const taskItemsRes = await getTaskItems();
  const reviewedTasksRes = await getReviewedTasks(month || undefined, year);

  const definitions = definitionsRes.success ? definitionsRes.data || [] : [];
  const pendingTasks = pendingTasksRes.success ? pendingTasksRes.data || [] : [];
  const taskItems = taskItemsRes.success ? taskItemsRes.data || [] : [];
  const reviewedTasks = reviewedTasksRes.success ? reviewedTasksRes.data || [] : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">WFH & Packing Management</h1>
      </div>

      <Tabs defaultValue="review">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger id="tab-trigger-review" value="review">Review Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger id="tab-trigger-history" value="history">History</TabsTrigger>
          <TabsTrigger id="tab-trigger-definitions" value="definitions">Task Definitions</TabsTrigger>
          <TabsTrigger id="tab-trigger-items" value="items">Marketplace ({taskItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review & Approval</CardTitle>
              <CardDescription>
                Duyệt công việc nhân viên làm tại nhà (cộng lương) và các hoá đơn đóng gói (tích điểm).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskReviewList initialTasks={pendingTasks as any} /> 
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Review History</CardTitle>
              <CardDescription>
                Xem lại danh sách các task đã được duyệt hoặc bị từ chối gần đây.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskHistoryList initialTasks={reviewedTasks as any} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="definitions">
          <Card>
            <CardHeader>
              <CardTitle>Task Definitions</CardTitle>
              <CardDescription>
                Manage available tasks, prices, and units.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskDefinitionList initialDefinitions={definitions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
            <Card>
                <CardHeader>
                    <CardTitle>Marketplace Items</CardTitle>
                    <CardDescription>
                        Post specific one-time jobs for employees to claim.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TaskItemList initialItems={taskItems as any} definitions={definitions} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
