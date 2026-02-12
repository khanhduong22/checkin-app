import { getTaskDefinitions, getPendingTasks } from "@/actions/task-actions";
import { TaskDefinitionList } from "./_components/task-definition-list";
import { TaskReviewList } from "./_components/task-review-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminTasksPage() {
  const definitionsRes = await getTaskDefinitions();
  const pendingTasksRes = await getPendingTasks();

  const definitions = definitionsRes.success ? definitionsRes.data || [] : [];
  const pendingTasks = pendingTasksRes.success ? pendingTasksRes.data || [] : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Task Management</h1>
      </div>

      <Tabs defaultValue="review">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger id="tab-trigger-review" value="review">Review Pending Tasks ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger id="tab-trigger-definitions" value="definitions">Task Definitions</TabsTrigger>
        </TabsList>
        
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
      </Tabs>
    </div>
  );
}
