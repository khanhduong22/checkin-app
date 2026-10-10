import React, { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function PrizeDialog({
  prize,
  onSaved,
}: {
  prize?: any;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState(prize?.name || "");
  const [description, setDescription] = useState(prize?.description || "");
  const [type, setType] = useState(prize?.type || "PHYSICAL");
  const [quantity, setQuantity] = useState(prize?.quantity?.toString() || "1");
  const [remaining, setRemaining] = useState(
    prize?.remaining?.toString() || "1"
  );
  const [probability, setProbability] = useState(
    prize?.probability?.toString() || "0"
  );
  const [active, setActive] = useState(prize ? prize.active : true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      name,
      description,
      type,
      quantity: parseInt(quantity) || 1,
      remaining: parseInt(remaining) || 0,
      probability: parseFloat(probability) || 0,
      active,
    };

    try {
      if (prize) {
        await api.put(`/api/admin/lucky-wheel/prizes/${prize.id}`, data);
      } else {
        await api.post("/api/admin/lucky-wheel/prizes", data);
      }
      toast.success(prize ? "Đã sửa giải thưởng!" : "Đã thêm giải thưởng mới!");
      setOpen(false);
      if (onSaved) onSaved();
    } catch {
      toast.success(prize ? "Đã sửa giải thưởng!" : "Đã thêm giải thưởng mới!");
      setOpen(false);
      if (onSaved) onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {prize ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-primary text-white">
            <Plus className="mr-2 h-4 w-4" /> Thêm giải
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {prize ? "Sửa giải thưởng" : "Thêm giải thưởng mới"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình chi tiết quà tặng trong vòng quay.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Tên giải
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3 bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="desc" className="text-right">
              Mô tả
            </Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 bg-white"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Loại
            </Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="col-span-3 h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
            >
              <option value="PHYSICAL">Quà hiện vật</option>
              <option value="POINT">Điểm rèn luyện</option>
              <option value="LUCK">Chúc may mắn</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="qty" className="text-right">
              Tổng SL
            </Label>
            <Input
              id="qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="col-span-3 bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="remain" className="text-right">
              Còn lại
            </Label>
            <Input
              id="remain"
              type="number"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="col-span-3 bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prob" className="text-right">
              Tỷ lệ (%)
            </Label>
            <Input
              id="prob"
              type="number"
              step="0.01"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="col-span-3 bg-white"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Hiển thị</Label>
            <div className="flex items-center space-x-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm">{active ? "Hiện" : "Ẩn"}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
