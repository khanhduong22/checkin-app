"use client";

import { TaskDefinition } from "@prisma/client";
import { startTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Play } from "lucide-react";

interface AvailableTasksListProps {
  tasks: TaskDefinition[];
}

export function AvailableTasksList({ tasks }: AvailableTasksListProps) {
  const handleStart = async (taskId: string) => {
      try {
          const result = await startTask(taskId);
          if (result.success) {
              toast.success("Task started! Check 'My Tasks' to submit work.");
          } else {
              toast.error((result as any).error || "Failed to start task");
          }
      } catch (error) {
          toast.error("An error occurred");
      }
  };

  if (tasks.length === 0) {
      return <div className="text-center p-8 text-muted-foreground">No tasks available right now.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <Card key={task.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{task.name}</CardTitle>
            <CardDescription>{task.baseReward.toLocaleString()} đ / {task.unit}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                  {task.description || "No description provided."}
              </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => handleStart(task.id)}>
                <Play className="mr-2 h-4 w-4" /> Start Task
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
