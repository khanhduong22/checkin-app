
"use client";

import { TaskItem, TaskDefinition } from "@prisma/client";
import { startTask } from "@/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Loader2, Coins, Clock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type TaskItemWithDef = TaskItem & {
  taskDefinition: TaskDefinition;
};

interface MarketplaceListProps {
  items: TaskItemWithDef[];
}

export function MarketplaceList({ items }: MarketplaceListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleClaim = async (item: TaskItemWithDef) => {
    try {
      setLoadingId(item.id);
      
      // Call startTask with both taskDefId and taskItemId
      const result = await startTask(item.taskDefId, item.id);

      if (result.success) {
        toast.success(`Đã nhận task "${item.title}" thành công!`);
        router.refresh(); // Refresh to update lists
      } else {
        toast.error((result as any).error || "Không thể nhận task");
      }
    } catch (error) {
      toast.error("Đã có lỗi xảy ra");
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div id="marketplace-list" className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
        Hiện tại không có task cụ thể nào trên chợ.
      </div>
    );
  }

  return (
    <div id="marketplace-list" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-start">
                <Badge variant="outline">{item.taskDefinition.name}</Badge>
                {item.deadline && (
                    <Badge variant="secondary" className="text-xs">
                        Hết hạn {formatDistanceToNow(new Date(item.deadline), { addSuffix: true, locale: vi })}
                    </Badge>
                )}
            </div>
            <CardTitle className="mt-2 text-lg line-clamp-2" title={item.title}>
              {item.title}
            </CardTitle>
            <CardDescription className="line-clamp-3">
              {item.description || item.taskDefinition.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-foreground">
                    {item.taskDefinition.baseReward.toLocaleString()} đ
                </span>
                <span>/ {item.taskDefinition.unit}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Đăng {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: vi })}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
                className="w-full" 
                onClick={() => handleClaim(item)}
                disabled={!!loadingId}
            >
              {loadingId === item.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang nhận...
                </>
              ) : (
                "Nhận Task Ngay"
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
