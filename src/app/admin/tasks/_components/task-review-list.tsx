"use client";

import { useState } from "react";
import { UserTask, User, TaskDefinition } from "@prisma/client";
import { reviewTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type UserTaskWithRelations = UserTask & {
    user: User;
    taskDefinition: TaskDefinition;
};

interface TaskReviewListProps {
  initialTasks: UserTaskWithRelations[];
}

export function TaskReviewList({ initialTasks }: TaskReviewListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [reviewingTask, setReviewingTask] = useState<UserTaskWithRelations | null>(null);
  
  // Review form state
  const [bonusPenalty, setBonusPenalty] = useState(0);
  const [adminNote, setAdminNote] = useState("");

  const handleReview = async (decision: "APPROVED" | "REJECTED") => {
      if (!reviewingTask) return;

      try {
          const result = await reviewTask(reviewingTask.id, decision, {
              bonusPenalty,
              adminNote
          });

          if (result.success) {
              setTasks(tasks.filter(t => t.id !== reviewingTask.id));
              setReviewingTask(null);
              setBonusPenalty(0);
              setAdminNote("");
              toast.success(`Task ${decision.toLowerCase()} successfully`);
          } else {
              toast.error(result.error || "Failed to review task");
          }
      } catch (error) {
          toast.error("An error occurred");
      }
  };

  const openReview = (task: UserTaskWithRelations) => {
      setReviewingTask(task);
      setBonusPenalty(0);
      setAdminNote("");
      
      // Auto-calculate penalty if overdue (> 7 days from start to submit)
      // Wait, we need submittedAt. If submittedAt is null (shouldn't be for pending review tasks), use now.
      const submitted = task.submittedAt ? new Date(task.submittedAt) : new Date();
      const started = new Date(task.startedAt);
      const diffTime = Math.abs(submitted.getTime() - started.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 7) {
          const baseAmount = task.unitPrice * task.quantity;
          const penalty = -(baseAmount * 0.5); // 50% penalty
          setBonusPenalty(penalty);
          setAdminNote(`Overdue by ${diffDays} days (Started: ${format(started, 'dd/MM')}). Auto penalty applied.`);
      }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pending Reviews</h2>
      {tasks.length === 0 ? (
          <p className="text-muted-foreground">No pending tasks to review.</p>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Correctness</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.user.name}</TableCell>
              <TableCell>
                  <div className="flex flex-col">
                      <span>{task.taskDefinition.name}</span>
                      <span className="text-xs text-muted-foreground">{task.unitPrice.toLocaleString()} đ/{task.taskDefinition.unit}</span>
                  </div>
              </TableCell>
              <TableCell>{task.quantity} {task.taskDefinition.unit}</TableCell>
              <TableCell className="font-bold">
                  {(task.quantity * task.unitPrice).toLocaleString()} đ
              </TableCell>
              <TableCell>
                  {task.evidenceLink ? (
                      <a href={task.evidenceLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:underline">
                          View Proof <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                  ) : "No link"}
              </TableCell>
              <TableCell>{task.submittedAt ? format(new Date(task.submittedAt), "dd/MM HH:mm") : "-"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" onClick={() => openReview(task)}>
                    Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingTask} onOpenChange={(open) => !open && setReviewingTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
                Review work from <b>{reviewingTask?.user.name}</b> for task <b>{reviewingTask?.taskDefinition.name}</b>.
            </DialogDescription>
          </DialogHeader>
          
          {reviewingTask && (
              <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <span className="font-semibold block">Quantity:</span>
                          {reviewingTask.quantity} {reviewingTask.taskDefinition.unit}
                      </div>
                      <div>
                          <span className="font-semibold block">Base Total:</span>
                          {(reviewingTask.quantity * reviewingTask.unitPrice).toLocaleString()} đ
                      </div>
                      <div className="col-span-2">
                          <span className="font-semibold block">User Note:</span>
                          <p className="bg-muted p-2 rounded text-xs">{reviewingTask.note || "No note"}</p>
                      </div>
                       <div className="col-span-2">
                          <span className="font-semibold block">Evidence:</span>
                          {reviewingTask.evidenceLink ? (
                              <a href={reviewingTask.evidenceLink} target="_blank" className="text-blue-500 underline break-all">
                                  {reviewingTask.evidenceLink}
                              </a>
                          ) : "None"}
                      </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bonus" className="text-right">Bonus/Penalty</Label>
                        <Input
                          id="bonus"
                          type="number"
                          value={bonusPenalty}
                          onChange={(e) => setBonusPenalty(Number(e.target.value))}
                          className="col-span-3"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">Negative for penalty, positive for bonus.</p>
                      
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="note" className="text-right">Admin Note</Label>
                        <Textarea
                          id="note"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="col-span-3"
                          placeholder="Reason for penalty/bonus or rejection..."
                        />
                      </div>
                      
                      <div className="bg-secondary/20 p-3 rounded flex justify-between items-center">
                          <span className="font-bold">Final Payout:</span>
                          <span className="text-lg font-bold text-primary">
                              {Math.max(0, (reviewingTask.quantity * reviewingTask.unitPrice) + bonusPenalty).toLocaleString()} đ
                          </span>
                      </div>
                  </div>
              </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="destructive" onClick={() => handleReview("REJECTED")}>
                <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            <div className="flex-1"></div>
            <Button variant="default" onClick={() => handleReview("APPROVED")}>
                <Check className="mr-2 h-4 w-4" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
