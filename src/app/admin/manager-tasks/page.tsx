import { getManagerTasks } from "@/actions/manager-task-actions";
import { getUsers } from "@/actions/kanban-actions";
import { ManagerTasksClient } from "./_components/ManagerTasksClient";

export const dynamic = "force-dynamic";

export default async function ManagerTasksPage() {
  const [tasksRes, usersRes] = await Promise.all([
    getManagerTasks(),
    getUsers(),
  ]);

  const tasks = tasksRes.success ? tasksRes.data ?? [] : [];
  const users = usersRes.success ? usersRes.data ?? [] : [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manager Tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Quản lý công việc theo ma trận Eisenhower — ưu tiên đúng, giao đúng người.
        </p>
      </div>

      <ManagerTasksClient initialTasks={tasks as any} users={users as any} />
    </div>
  );
}
