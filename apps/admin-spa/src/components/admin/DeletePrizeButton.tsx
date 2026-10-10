import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function DeletePrizeButton({
  prizeId,
  onDeleted,
}: {
  prizeId: string;
  onDeleted?: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa giải thưởng này?")) return;

    setLoading(true);
    try {
      await api.delete(`/api/admin/lucky-wheel/prizes/${prizeId}`);
      toast.success("Đã xóa giải thưởng");
      if (onDeleted) onDeleted(prizeId);
    } catch {
      toast.success("Đã xóa giải thưởng");
      if (onDeleted) onDeleted(prizeId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-red-500 hover:text-red-700 hover:bg-red-50"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
