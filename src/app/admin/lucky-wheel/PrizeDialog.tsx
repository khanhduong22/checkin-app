'use client';

import { createPrize, updatePrize } from "./actions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

export default function PrizeDialog({ prize }: { prize?: any }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [name, setName] = useState(prize?.name || '');
    const [description, setDescription] = useState(prize?.description || '');
    const [type, setType] = useState(prize?.type || 'PHYSICAL');
    const [quantity, setQuantity] = useState(prize?.quantity?.toString() || '1');
    const [remaining, setRemaining] = useState(prize?.remaining?.toString() || '1');
    const [probability, setProbability] = useState(prize?.probability?.toString() || '0');
    const [active, setActive] = useState(prize ? prize.active : true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const data = { name, description, type, quantity, remaining, probability, active };
        let res;
        
        if (prize) {
            res = await updatePrize(prize.id, data);
        } else {
            res = await createPrize(data);
        }

        setLoading(false);
        if (res.success) {
            setOpen(false);
            if (!prize) {
                // Reset form if create
                setName('');
                setDescription('');
                setQuantity('1');
                setRemaining('1');
                setProbability('0');
            }
        } else {
            alert(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {prize ? (
                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                ) : (
                    <Button><Plus className="mr-2 h-4 w-4" /> Thêm giải</Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{prize ? 'Sửa giải thưởng' : 'Thêm giải thưởng mới'}</DialogTitle>
                    <DialogDescription>
                        Cấu hình chi tiết quà tặng trong vòng quay.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Tên giải</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Mô tả</Label>
                        <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Loại</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PHYSICAL">Quà hiện vật</SelectItem>
                                <SelectItem value="POINT">Điểm rèn luyện</SelectItem>
                                <SelectItem value="LUCK">Chúc may mắn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="qty" className="text-right">Tổng SL</Label>
                        <Input id="qty" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="remain" className="text-right">Còn lại</Label>
                        <Input id="remain" type="number" value={remaining} onChange={e => setRemaining(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="prob" className="text-right">Tỷ lệ (%)</Label>
                        <Input id="prob" type="number" step="0.01" value={probability} onChange={e => setProbability(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Hiển thị</Label>
                        <div className="flex items-center space-x-2">
                             <Switch checked={active} onCheckedChange={setActive} />
                             <span>{active ? 'Hiện' : 'Ẩn'}</span>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>{loading ? 'Lưu...' : 'Lưu thay đổi'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
