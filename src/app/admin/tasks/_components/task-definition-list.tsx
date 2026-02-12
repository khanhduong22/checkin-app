"use client";

import { useState } from "react";
import { TaskDefinition } from "@prisma/client";
import { createTaskDefinition, updateTaskDefinition, deleteTaskDefinition } from "@/actions/task-actions";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface TaskDefinitionListProps {
  initialDefinitions: TaskDefinition[];
}

export function TaskDefinitionList({ initialDefinitions }: TaskDefinitionListProps) {
  const [definitions, setDefinitions] = useState(initialDefinitions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    baseReward: 0,
    unit: "",
  });

  const handleCreate = async () => {
    try {
      const result = await createTaskDefinition(formData);
      if (result.success && result.data) {
        setDefinitions([result.data, ...definitions]);
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", baseReward: 0, unit: "" });
        toast.success("Task definition created successfully");
      } else {
        toast.error(result.error || "Failed to create task definition");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleUpdate = async () => {
    if (!editingTask) return;
    try {
        const result = await updateTaskDefinition(editingTask.id, {
            name: formData.name,
            description: formData.description,
            baseReward: formData.baseReward,
            unit: formData.unit
        });

        if (result.success && result.data) {
            setDefinitions(definitions.map(d => d.id === editingTask.id ? result.data! : d));
            setEditingTask(null);
            setFormData({ name: "", description: "", baseReward: 0, unit: "" });
            toast.success("Task updated successfully");
        } else {
            toast.error(result.error || "Failed to update");
        }
    } catch (error) {
        toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this task definition?")) return;
    try {
        const result = await deleteTaskDefinition(id);
        if (result.success) {
            setDefinitions(definitions.filter(d => d.id !== id));
            toast.success("Task deleted");
        } else {
            toast.error(result.error || "Failed to delete");
        }
    } catch (error) {
        toast.error("Error deleting task");
    }
  };

  const openEdit = (task: TaskDefinition) => {
      setEditingTask(task);
      setFormData({
          name: task.name,
          description: task.description || "",
          baseReward: task.baseReward,
          unit: task.unit
      });
  };
  
  const toggleActive = async (task: TaskDefinition) => {
      try {
          const result = await updateTaskDefinition(task.id, { active: !task.active });
          if (result.success && result.data) {
             setDefinitions(definitions.map(d => d.id === task.id ? result.data! : d));
             toast.success(`Task ${result.data.active ? 'activated' : 'deactivated'}`);
          }
      } catch (error) {
          toast.error("Failed to toggle status");
      }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Defined Tasks</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task Definition</DialogTitle>
              <DialogDescription>Define a new task that users can perform.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. bài, video"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward" className="text-right">Reward (VND)</Label>
                <Input
                  id="reward"
                  type="number"
                  value={formData.baseReward}
                  onChange={(e) => setFormData({ ...formData, baseReward: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">Description</Label>
                <Input
                  id="desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Reward</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {definitions.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.name}</TableCell>
              <TableCell>{task.unit}</TableCell>
              <TableCell>{task.baseReward.toLocaleString()} đ</TableCell>
              <TableCell>
                  <Switch checked={task.active} onCheckedChange={() => toggleActive(task)} />
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(task)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDelete(task.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Definition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unit" className="text-right">Unit</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-reward" className="text-right">Reward</Label>
                <Input
                  id="edit-reward"
                  type="number"
                  value={formData.baseReward}
                  onChange={(e) => setFormData({ ...formData, baseReward: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-desc" className="text-right">Description</Label>
                <Input
                  id="edit-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
          <DialogFooter>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
