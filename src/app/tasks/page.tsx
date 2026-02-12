import { getAvailableTasks, getUserTasks } from "@/actions/task-actions";
import { AvailableTasksList } from "./_components/available-tasks-list";
import { MyTasksList } from "./_components/my-tasks-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default async function TasksPage() {
  const availableTasksRes = await getAvailableTasks();
  const userTasksRes = await getUserTasks();

  const availableTasks = availableTasksRes.success ? availableTasksRes.data || [] : [];
  const userTasks = userTasksRes.success ? userTasksRes.data || [] : [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">WFH & Task Center</h1>
        <p className="text-muted-foreground">Register and submit tasks to earn extra income. Must be checked out from office to start.</p>
      </div>

      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Available Tasks</h2>
          <AvailableTasksList tasks={availableTasks} />
        </section>

        <Separator />

        <section>
          <h2 className="text-xl font-semibold mb-4">My Task History</h2>
          <MyTasksList initialTasks={userTasks as any} />
        </section>
      </div>
    </div>
  );
}
