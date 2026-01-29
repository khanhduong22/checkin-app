'use client';

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PrivacyStats({ totalHours, totalSalary, daysWorked }: { totalHours: number, totalSalary: number, daysWorked: number }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary/50 p-3 relative group cursor-pointer" onClick={() => setIsVisible(!isVisible)}>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex justify-between items-center">
                    Lương Tạm Tính
                    {isVisible ? <EyeOff className="h-3 w-3 opacity-50" /> : <Eye className="h-3 w-3 opacity-50" />}
                </div>
                <div className={`text-2xl font-bold text-emerald-600 transition-all ${isVisible ? '' : 'blur-md select-none'}`}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalSalary)}
                </div>
                <div className="text-[10px] text-muted-foreground">Click để hiện/ẩn</div>
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-3">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chăm chỉ</div>
                 <div className="text-2xl font-bold text-primary">{daysWorked}</div>
                 <div className="text-[10px] text-muted-foreground">Ngày công ({totalHours.toFixed(1)}h)</div>
            </div>
        </div>
    );
}
