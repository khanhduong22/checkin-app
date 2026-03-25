"use client";

import { useState } from "react";
import { TaskDefinition } from "@prisma/client";
import { startTask, directSubmitTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Play, PackageOpen } from "lucide-react";
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

interface AvailableTasksListProps {
  tasks: TaskDefinition[];
}

export function AvailableTasksList({ tasks }: AvailableTasksListProps) {
  const [submittingTask, setSubmittingTask] = useState<TaskDefinition | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async (taskId: string) => {
      try {
          const result = await startTask(taskId);
          if (result.success) {
              toast.success("Đã nhận Job WFH! Vào tab Mọi History để nộp bài nhé.");
          } else {
              toast.error((result as any).error || "Failed to start task");
          }
      } catch (error) {
          toast.error("An error occurred");
      }
  };

  const handleDirectSubmit = async () => {
    if (!submittingTask || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await directSubmitTask(submittingTask.id, {
        quantity,
        note
      });

      if (result.success) {
        toast.success("Khai báo Đóng Gói thành công! Đơn đang chờ duyệt.");
        setSubmittingTask(null);
        setQuantity(1);
        setNote("");
      } else {
        toast.error((result as any).error || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi hệ thống khi nộp");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBtnClick = (task: TaskDefinition) => {
    if (task.unit === 'điểm') {
      setSubmittingTask(task);
      setQuantity(1);
      setNote("");
    } else {
      handleStart(task.id);
    }
  };

  if (tasks.length === 0) {
      return <div className="text-center p-8 text-muted-foreground">Không có mã công việc nào đang mở.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col hover:border-primary/50 transition-colors shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{task.name}</CardTitle>
              <CardDescription className="text-emerald-600 font-medium">
                {task.baseReward.toLocaleString()} đ / {task.unit}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
                <p className="text-sm text-muted-foreground">
                    {task.description || "Chưa có mô tả báo cáo."}
                </p>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full shadow-sm" 
                variant={task.unit === 'điểm' ? 'default' : 'secondary'}
                onClick={() => onBtnClick(task)}
              >
                  {task.unit === 'điểm' ? (
                    <><PackageOpen className="mr-2 h-4 w-4" /> Khai báo ngay</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Nhận Job</>
                  )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Direct Submit Dialog for Packing */}
      <Dialog open={!!submittingTask} onOpenChange={(open) => !open && setSubmittingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Khai báo Đóng Gói</DialogTitle>
            <DialogDescription>
              Khai báo số lượng <b>{submittingTask?.name}</b> mà bạn vừa đóng xong. Không cần hình ảnh rườm rà.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">Số lượng</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-emerald-600 font-medium">{submittingTask?.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note" className="text-right">Ghi chú</Label>
              <Textarea
                id="note"
                placeholder="Ví dụ: Đơn Tiki ID #12345 (Nếu cần thiết)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="col-span-3 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDirectSubmit} disabled={isSubmitting} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white">
              {isSubmitting ? "Đang gửi đi..." : "Gửi lên mây ☁️"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
