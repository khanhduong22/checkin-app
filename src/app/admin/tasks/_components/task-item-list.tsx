
"use client";

import { useState } from "react";
import { TaskItem, TaskDefinition, User } from "@prisma/client";
import { createTaskItem, closeTaskItem, deleteTaskItem } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner";
import { Plus, Trash2, XCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type TaskItemWithRelations = TaskItem & {
  taskDefinition: TaskDefinition;
  assignee: User | null;
};

interface TaskItemListProps {
  initialItems: TaskItemWithRelations[];
  definitions: TaskDefinition[];
}

export function TaskItemList({ initialItems, definitions }: TaskItemListProps) {
  const [items, setItems] = useState<TaskItemWithRelations[]>(initialItems);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    taskDefId: "",
    title: "",
    description: "",
    deadline: "",
  });

  const handleCreate = async () => {
    if (!formData.taskDefId || !formData.title) {
        toast.error("Please fill in required fields");
        return;
    }

    try {
      const result = await createTaskItem({
          taskDefId: formData.taskDefId,
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline ? new Date(formData.deadline) : undefined
      });

      if (result.success && result.data) {
        // Optimistic update or refresh? The server action revalidates path, 
        // but we need to update local state or useRouter refresh.
        // For simple list, we can just append if we have the full object, 
        // but result.data might not have inclusions if we didn't include them in the create return.
        // Actually the create action just returns the item.
        // We'll need to manually construct the added item for local state or trigger a specific fetch.
        // Or just trust revalidatePath and router.refresh() if we used it.
        // Since we are in client component, router.refresh() is better but let's try to fake it for instant feedback
        // assuming we can find the definition.
        const def = definitions.find(d => d.id === formData.taskDefId);
        if(def) {
            const newItem: any = { ...result.data, taskDefinition: def, assignee: null };
            setItems([newItem, ...items]);
        }
        
        setIsCreateOpen(false);
        setFormData({ taskDefId: "", title: "", description: "", deadline: "" });
        toast.success("Task item created");
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (error) {
      toast.error("Error creating task item");
    }
  };

  const handleClose = async (id: string) => {
      try {
          const result = await closeTaskItem(id);
          if (result.success) {
              setItems(items.map(i => i.id === id ? { ...i, status: 'CLOSED' } : i));
              toast.success("Task closed");
          } else {
              toast.error(result.error || "Failed");
          }
      } catch (e) {
          toast.error("Error");
      }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Delete this task item?")) return;
      try {
          const result = await deleteTaskItem(id);
          if (result.success) {
              setItems(items.filter(i => i.id !== id));
              toast.success("Task deleted");
          } else {
            toast.error(result.error);
          }
      } catch (e) {
          toast.error("Error");
      }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Marketplace Items</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Post New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a Task Item</DialogTitle>
              <DialogDescription>Create a specific job for users to claim.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Task Type</Label>
                <div className="col-span-3">
                    <Select value={formData.taskDefId} onValueChange={(v) => setFormData({...formData, taskDefId: v})}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a task type" />
                        </SelectTrigger>
                        <SelectContent>
                            {definitions.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name} ({d.baseReward.toLocaleString()}đ)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. Fix bug #123"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline" className="text-right">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="desc" className="text-right pt-2">Description</Label>
                <Textarea
                  id="desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Details about this specific task..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Post Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reward</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                  <div>{item.title}</div>
                  {item.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</div>}
              </TableCell>
              <TableCell>{item.taskDefinition.name}</TableCell>
              <TableCell>{item.taskDefinition.baseReward.toLocaleString()} đ</TableCell>
              <TableCell>
                  {item.assignee ? (
                      <div className="flex items-center gap-2">
                           {/* Avatar could go here */}
                           <span>{item.assignee.name}</span>
                      </div>
                  ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                  <Badge variant={item.status === 'OPEN' ? 'default' : item.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}>
                      {item.status}
                  </Badge>
              </TableCell>
              <TableCell>
                  {item.deadline ? format(new Date(item.deadline), 'dd/MM/yyyy HH:mm') : '-'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {item.status === 'OPEN' && (
                    <Button variant="ghost" size="icon" onClick={() => handleClose(item.id)} title="Close Task">
                        <XCircle className="h-4 w-4 text-orange-500" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
