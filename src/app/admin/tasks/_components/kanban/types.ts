import type { TaskItem, TaskDefinition, User } from "@prisma/client";

export type KanbanTaskItem = TaskItem & {
  taskDefinition: TaskDefinition;
  assignee: User | null;
};

export type KanbanUser = Pick<User, "id" | "name" | "email" | "image">;
