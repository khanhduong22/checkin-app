import { getTaskDefinitions, getPendingTasks, getTaskItems } from "@/actions/task-actions";
import { getUsers } from "@/actions/kanban-actions";
import { TaskDefinitionList } from "./_components/task-definition-list";
import { TaskReviewList } from "./_components/task-review-list";
import { TaskItemList } from "./_components/task-item-list";
import { KanbanBoard } from "./_components/kanban/KanbanBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage() {
  const definitionsRes = await getTaskDefinitions();
  const pendingTasksRes = await getPendingTasks();
  const taskItemsRes = await getTaskItems();

  const definitions = definitionsRes.success ? definitionsRes.data || [] : [];
  const pendingTasks = pendingTasksRes.success ? pendingTasksRes.data || [] : [];
  const taskItems = taskItemsRes.success ? taskItemsRes.data || [] : [];
  const usersRes = await getUsers();
  const users = usersRes.success ? usersRes.data || [] : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Task Management</h1>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger id="tab-trigger-kanban" value="kanban">🗂️ Kanban Board</TabsTrigger>
          <TabsTrigger id="tab-trigger-review" value="review">Review Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger id="tab-trigger-definitions" value="definitions">Task Definitions</TabsTrigger>
          <TabsTrigger id="tab-trigger-items" value="items">Marketplace ({taskItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="pt-2">
            <KanbanBoard initialItems={taskItems as any} users={users as any} />
          </div>
        </TabsContent>
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review & Approval</CardTitle>
              <CardDescription>
                Review submitted tasks from employees. Check evidence and approve for payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskReviewList initialTasks={pendingTasks as any} /> 
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
