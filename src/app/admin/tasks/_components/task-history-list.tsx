"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { UserTask, User, TaskDefinition, TaskItem } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserTaskWithRelations = UserTask & {
    user: User;
    taskDefinition: TaskDefinition;
    taskItem: TaskItem | null;
};

interface TaskHistoryListProps {
  initialTasks: UserTaskWithRelations[];
}

export function TaskHistoryList({ initialTasks }: TaskHistoryListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMonth = searchParams.get("month") || "all";
  
  const handleMonthChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") {
        params.delete("month");
    } else {
        params.set("month", val);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 items-center">
        <span className="text-sm font-medium">Lọc theo:</span>
        <Select value={currentMonth} onValueChange={handleMonthChange}>
           <SelectTrigger className="w-[160px]">
             <SelectValue placeholder="All/Recent" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">Gần đây (100)</SelectItem>
             {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
             ))}
           </SelectContent>
        </Select>
      </div>

      {initialTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No reviewed tasks found.</p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Admin Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="whitespace-nowrap truncate max-w-[120px]">
                  {task.reviewedAt ? format(new Date(task.reviewedAt), "dd/MM HH:mm") : "-"}
              </TableCell>
              <TableCell className="font-medium whitespace-nowrap">{task.user.name}</TableCell>
              <TableCell>
                  <div className="flex flex-col">
                      <span>{task.taskItem ? task.taskItem.title : task.taskDefinition.name}</span>
                      <span className="text-xs text-muted-foreground">{task.unitPrice.toLocaleString()} đ/{task.taskDefinition.unit}</span>
                  </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{task.quantity} {task.taskDefinition.unit}</TableCell>
              <TableCell>
                  <div className="flex flex-col items-start gap-1">
                      <Badge variant={task.status === "APPROVED" ? "default" : "destructive"}>
                          {task.status}
                      </Badge>
                      {task.status === "APPROVED" && (
                          <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                              +{(task.finalAmount ?? (task.quantity * task.unitPrice + task.bonusPenalty)).toLocaleString()} {task.taskDefinition.unit === "điểm" ? "điểm" : "đ"}
                          </span>
                      )}
                  </div>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground max-w-[200px] truncate">
                  {task.adminNote || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </div>
  );
}
