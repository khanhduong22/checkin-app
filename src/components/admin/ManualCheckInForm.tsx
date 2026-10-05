'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminManualCheckIn } from "@/app/admin/actions";
import { toast } from "sonner";

const getInitialVietnamDate = () => {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
};

export default function ManualCheckInForm({ userId }: { userId: string }) {
    const [date, setDate] = useState(getInitialVietnamDate);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkIn && !checkOut) {
            toast.error('Vui lòng nhập ít nhất giờ Vào hoặc Ra');
            return;
        }
        if (!confirm('Xác nhận chấm công hộ cho nhân viên này? Tên bạn sẽ được lưu vào hệ thống.')) return;
        
        setLoading(true);
        const res = await adminManualCheckIn(userId, date, checkIn, checkOut);
        setLoading(false);
        
        if (res.success) {
            toast.success(res.message);
            setCheckIn('');
            setCheckOut('');
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="border rounded-md p-4 bg-gray-50/50">
            <h4 className="font-semibold text-sm mb-3 text-muted-foreground flex items-center gap-2">
                🛠 Chấm công hộ (Manual Check-in)
            </h4>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Chọn ngày</label>
                    <Input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        required 
                        className="h-9 w-auto bg-white" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Giờ Vào (In)</label>
                    <Input 
                        type="time" 
                        value={checkIn} 
                        onChange={e => setCheckIn(e.target.value)} 
                        className="h-9 w-28 bg-white" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Giờ Ra (Out)</label>
                    <Input 
                        type="time" 
                        value={checkOut} 
                        onChange={e => setCheckOut(e.target.value)} 
                        className="h-9 w-28 bg-white" 
                    />
                </div>
                <Button type="submit" size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 font-medium" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Lưu dữ liệu'}
                </Button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Lưu ý: Hệ thống sẽ ghi nhận &quot;Admin chấm công hộ&quot; vào ghi chú.
            </p>
        </div>
    );
}
