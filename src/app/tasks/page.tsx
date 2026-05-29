import { getAvailableTasks, getAvailableTaskItems, getUserTasks } from "@/actions/task-actions";
import { AvailableTasksList } from "./_components/available-tasks-list";
import { MarketplaceList } from "./_components/marketplace-list";
import { MyTasksList } from "./_components/my-tasks-list";
import TasksTour from "./TasksTour";
import TourHelpButton from "@/components/TourHelpButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const availableTasksRes = await getAvailableTasks();
  const availableItemsRes = await getAvailableTaskItems();
  const userTasksRes = await getUserTasks();

  const availableTasks = availableTasksRes.success ? availableTasksRes.data || [] : [];
  const availableItems = availableItemsRes.success ? availableItemsRes.data || [] : [];
  const userTasksAll = userTasksRes.success ? userTasksRes.data || [] : [];

  const wfhTasks = availableTasks.filter((t: any) => t.unit !== 'điểm' && t.unit !== 'điểm-bưng');
  // Only show non-packing, non-carrying tasks in the WFH history
  const userTasks = userTasksAll.filter((t: any) => t.taskDefinition?.unit !== 'điểm' && t.taskDefinition?.unit !== 'điểm-bưng');

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultTab = resolvedSearchParams?.tab || "market";

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">WFH & Task Center</h1>
        <p className="text-muted-foreground">Register and submit tasks to earn extra income. Must be checked out from office to start.</p>
        <TasksTour />
        <TourHelpButton />
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger id="tab-market" value="market">Task Market ({availableItems.length})</TabsTrigger>
          <TabsTrigger id="tab-general" value="general">WFH Tasks</TabsTrigger>
          <TabsTrigger id="tab-my-tasks" value="my-tasks">My History</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Marketplace</h2>
            <div className="text-sm text-muted-foreground">Specific jobs available for claiming.</div>
          </div>
          <MarketplaceList items={availableItems as any} />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">General WFH Tasks</h2>
          </div>
          <AvailableTasksList tasks={wfhTasks} />
        </TabsContent>

        <TabsContent value="my-tasks">
          <MyTasksList initialTasks={userTasks as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
