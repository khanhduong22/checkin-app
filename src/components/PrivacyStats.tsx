'use client';

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PrivacyStats({ totalHours, totalSalary, daysWorked, baseSalary, totalAdjustments }: { totalHours: number, totalSalary: number, daysWorked: number, baseSalary?: number, totalAdjustments?: number }) {
    const [isVisible, setIsVisible] = useState(false);

    // Format currency
    const f = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary/50 p-3 relative group cursor-pointer" onClick={() => setIsVisible(!isVisible)}>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex justify-between items-center">
                    Thực Nhận
                    {isVisible ? <EyeOff className="h-3 w-3 opacity-50" /> : <Eye className="h-3 w-3 opacity-50" />}
                </div>
                <div className={`text-2xl font-bold text-emerald-600 transition-all ${isVisible ? '' : 'blur-md select-none'}`}>
                    {f(totalSalary)}
                </div>
                
                {/* Breakdown Detail */}
                {isVisible && (baseSalary !== undefined) && (
                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 border-t pt-1 border-dashed">
                       <div className="flex justify-between"><span>Lương cứng:</span> <span>{f(baseSalary)}</span></div>
                       {totalAdjustments !== 0 && (
                           <div className={`flex justify-between font-medium ${totalAdjustments! > 0 ? 'text-green-600' : 'text-red-500'}`}>
                               <span>{totalAdjustments! > 0 ? 'Thưởng:' : 'Phạt:'}</span> 
                               <span>{totalAdjustments! > 0 ? '+' : ''}{f(totalAdjustments!)}</span>
                           </div>
                       )}
                    </div>
                )}
                {!isVisible && <div className="text-[10px] text-muted-foreground">Click để xem chi tiết</div>}
            </div>
            
            <div className="rounded-lg bg-secondary/50 p-3">
                 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chăm chỉ</div>
                 <div className="text-2xl font-bold text-primary">{daysWorked}</div>
                 <div className="text-[10px] text-muted-foreground">Ngày công ({totalHours.toFixed(1)}h)</div>
            </div>
        </div>
    );
}
