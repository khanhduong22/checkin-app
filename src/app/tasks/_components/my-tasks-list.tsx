"use client";

import { useState } from "react";
import { UserTask, TaskDefinition, TaskItem } from "@prisma/client";
import { submitTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Upload, CheckCircle2, XCircle, Clock, Eye, Coins } from "lucide-react";

type UserTaskWithDef = UserTask & {
  taskDefinition: TaskDefinition;
  taskItem?: TaskItem | null;
};

interface MyTasksListProps {
  initialTasks: UserTaskWithDef[];
}

export function MyTasksList({ initialTasks }: MyTasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [submittingTask, setSubmittingTask] = useState<UserTaskWithDef | null>(null);
  const [viewingTask, setViewingTask] = useState<UserTaskWithDef | null>(null);

  // Submission Form
  const [quantity, setQuantity] = useState(1);
  const [evidenceLink, setEvidenceLink] = useState("");
  const [note, setNote] = useState("");

  const activeTasks = tasks.filter(t => t.status === "PENDING");
  const submittedTasks = tasks.filter(t => t.status === "SUBMITTED");
  const historyTasks = tasks.filter(t => t.status === "APPROVED" || t.status === "REJECTED");

  const openSubmit = (task: UserTaskWithDef) => {
    setSubmittingTask(task);
    setQuantity(1);
    setEvidenceLink("");
    setNote("");
  };

  const handleSubmit = async () => {
    if (!submittingTask) return;
    if (!evidenceLink) {
      toast.error("Evidence link is required");
      return;
    }

    try {
      const result = await submitTask(submittingTask.id, {
        quantity,
        evidenceLink,
        note
      });

      if (result.success && result.data) {
        toast.success("Task submitted successfully!");
        // Update local state
        setTasks(prev => prev.map(t =>
          t.id === submittingTask.id
            ? { ...t, status: "SUBMITTED", submittedAt: new Date(), quantity, evidenceLink, note } as UserTaskWithDef
            : t
        ));
        setSubmittingTask(null);
      } else {
        toast.error(result.error || "Failed to submit");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'PENDING': return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Active</Badge>;
      case 'SUBMITTED': return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Reviewing</Badge>;
      case 'APPROVED': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>;
      case 'REJECTED': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="submitted">In Review ({submittedTasks.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2">
          {activeTasks.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-4">No active tasks.</p>}
          {activeTasks.map(task => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <button
                    className="text-left font-semibold text-lg hover:underline hover:text-primary flex items-start gap-1 group"
                    onClick={() => setViewingTask(task)}
                    title="Xem chi tiết task"
                  >
                    {task.taskItem?.title || task.taskDefinition.name}
                    <Eye className="h-4 w-4 mt-1 opacity-0 group-hover:opacity-60 flex-shrink-0" />
                  </button>
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-xs text-muted-foreground">{task.taskDefinition.name}</p>
                <p className="text-sm text-muted-foreground">Started: {format(new Date(task.startedAt), "dd/MM/yyyy HH:mm")}</p>
              </CardHeader>
              <CardContent className="pb-2 flex-1">
                <p className="font-medium text-emerald-600 flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {task.unitPrice.toLocaleString()} đ / {task.taskDefinition.unit}
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingTask(task)}>
                  <Eye className="mr-1 h-4 w-4" /> Chi tiết
                </Button>
                <Button onClick={() => openSubmit(task)} className="flex-1">
                  <Upload className="mr-2 h-4 w-4" /> Submit Work
                </Button>
              </CardFooter>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="submitted" className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2">
          {submittedTasks.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-4">No tasks in review.</p>}
          {submittedTasks.map(task => (
            <Card key={task.id} className="opacity-90">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{task.taskItem ? task.taskItem.title : task.taskDefinition.name}</CardTitle>
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-sm text-muted-foreground">Submitted: {task.submittedAt ? format(new Date(task.submittedAt), "dd/MM HH:mm") : "-"}</p>
              </CardHeader>
              <CardContent>
                <p>Quantity: {task.quantity} {task.taskDefinition.unit}</p>
                {task.note && <p className="text-sm text-emerald-700 mt-1 font-medium">Ghi chú: {task.note}</p>}
                <p className="text-sm text-muted-foreground truncate mt-1">Ref: {task.evidenceLink}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2">
          {historyTasks.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-4">No history.</p>}
          {historyTasks.map(task => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{task.taskItem ? task.taskItem.title : task.taskDefinition.name}</CardTitle>
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-sm text-muted-foreground">Reviewed: {task.reviewedAt ? format(new Date(task.reviewedAt), "dd/MM/yyyy") : "-"}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center bg-secondary/20 p-2 rounded">
                  <span className="font-medium">Payout:</span>
                  <div className="text-right">
                    <p className="font-bold text-lg">{task.finalAmount?.toLocaleString()} đ</p>
                    {task.bonusPenalty !== 0 && (
                      <p className={`text-xs ${task.bonusPenalty > 0 ? "text-green-600" : "text-red-500"}`}>
                        {task.bonusPenalty > 0 ? "+" : ""}{task.bonusPenalty.toLocaleString()} adjust
                      </p>
                    )}
                  </div>
                </div>
                {task.note && (
                  <div className="text-sm bg-muted/50 p-2 rounded border border-l-4 border-l-blue-400">
                    <span className="font-semibold block text-xs uppercase text-muted-foreground mb-1">Ghi chú của bạn</span>
                    {task.note}
                  </div>
                )}
                {task.adminNote && (
                  <div className="text-sm bg-muted p-2 rounded border border-l-4 border-l-orange-400">
                    <span className="font-semibold block text-xs uppercase text-muted-foreground mb-1">Admin Note</span>
                    {task.adminNote}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!submittingTask} onOpenChange={(open) => !open && setSubmittingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Work</DialogTitle>
            <DialogDescription>
              Submit your work for <b>{submittingTask?.taskDefinition.name}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">Quantity</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{submittingTask?.taskDefinition.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="link" className="text-right">Evidence Link</Label>
              <Input
                id="link"
                placeholder="https://..."
                value={evidenceLink}
                onChange={(e) => setEvidenceLink(e.target.value)}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">Note</Label>
              <Textarea
                id="note"
                placeholder="Any details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => !open && setViewingTask(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl leading-snug">
              {viewingTask?.taskItem?.title || viewingTask?.taskDefinition.name}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 pt-1">
                <span className="inline-flex items-center gap-1 text-xs bg-secondary rounded px-2 py-0.5">
                  {viewingTask?.taskDefinition.name}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {viewingTask?.taskItem?.description ? (
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {viewingTask.taskItem.description}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Không có mô tả chi tiết.</p>
            )}
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <Coins className="h-4 w-4" />
              {viewingTask?.unitPrice.toLocaleString()} đ / {viewingTask?.taskDefinition.unit}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTask(null)}>Đóng</Button>
            <Button onClick={() => { setViewingTask(null); if (viewingTask) openSubmit(viewingTask); }}>
              <Upload className="mr-2 h-4 w-4" /> Submit Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
