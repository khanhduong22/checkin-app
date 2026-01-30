'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, Calendar } from "lucide-react";

function formatVND(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function PayrollDetailView({ stats, userName, monthStr }: { stats: any, userName?: string, monthStr: string }) {
    if (!stats) return <div>Không có dữ liệu</div>;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-emerald-50 border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">Thực lãnh ({monthStr})</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">
                        {formatVND(stats.totalSalary)}
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                        Lương cứng: {formatVND(stats.baseSalary)}
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">Tổng giờ làm</span>
                    </div>
                    <div className="text-2xl font-bold">
                        {stats.totalHours.toFixed(1)}h
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {stats.daysWorked} ngày đi làm
                    </p>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                         <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">Thưởng / Phạt</span>
                    </div>
                    <div className={`text-2xl font-bold ${stats.totalAdjustments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.totalAdjustments > 0 ? '+' : ''}{formatVND(stats.totalAdjustments)}
                    </div>
                </Card>
                
                 <Card className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">Lương theo giờ</span>
                    </div>
                    <div className="text-2xl font-bold">
                         {formatVND(stats.hourlyRate)}/h
                    </div>
                </Card>
            </div>

            <Tabs defaultValue="shifts" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="shifts">Chi tiết Ca làm việc</TabsTrigger>
                    <TabsTrigger value="adjustments">Thưởng / Phạt</TabsTrigger>
                </TabsList>
                
                {/* SHIFTS TAB */}
                <TabsContent value="shifts" className="space-y-4 pt-4">
                    <div className="rounded-md border">
                        <div className="grid grid-cols-5 gap-2 p-3 font-medium text-sm bg-muted/50 border-b">
                            <div className="col-span-1">Ngày</div>
                            <div className="col-span-1 text-center">Giờ vào</div>
                            <div className="col-span-1 text-center">Giờ ra</div>
                            <div className="col-span-1 text-center">Số giờ</div>
                            <div className="col-span-1 text-right">Lương</div>
                        </div>
                        {stats.dailyDetails.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">Chưa có dữ liệu chấm công tháng này.</div>
                        ) : (
                            stats.dailyDetails.map((day: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-5 gap-2 p-3 text-sm border-b last:border-0 hover:bg-gray-50 items-center">
                                    <div className="col-span-1 font-medium">
                                        {new Date(day.date).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}
                                        {!day.isValid && (
                                             <div className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                                                 <AlertCircle className="h-3 w-3" /> {day.error}
                                             </div>
                                        )}
                                    </div>
                                    <div className="col-span-1 text-center text-muted-foreground">
                                        {day.checkIn ? new Date(day.checkIn).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                    </div>
                                    <div className="col-span-1 text-center text-muted-foreground">
                                        {day.checkOut ? new Date(day.checkOut).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                    </div>
                                    <div className="col-span-1 text-center font-mono">
                                        {day.hours > 0 ? day.hours.toFixed(1) + 'h' : '-'}
                                    </div>
                                    <div className="col-span-1 text-right font-medium text-emerald-600">
                                        {day.salary > 0 ? formatVND(day.salary) : '-'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* ADJUSTMENTS TAB */}
                <TabsContent value="adjustments" className="space-y-4 pt-4">
                     <div className="rounded-md border">
                         {stats.adjustments.length === 0 ? (
                             <div className="p-8 text-center text-muted-foreground">Không có khoản thưởng/phạt nào.</div>
                         ) : (
                             stats.adjustments.map((adj: any) => (
                                 <div key={adj.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50">
                                     <div className="flex items-center gap-3">
                                         <div className={`h-8 w-8 rounded-full flex items-center justify-center ${adj.amount >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {adj.amount >= 0 ? '+' : '-'}
                                         </div>
                                         <div>
                                             <p className="font-medium">{adj.reason}</p>
                                             <p className="text-xs text-muted-foreground">
                                                 {new Date(adj.date).toLocaleDateString('vi-VN')}
                                             </p>
                                         </div>
                                     </div>
                                     <div className={`font-bold ${adj.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                         {adj.amount > 0 ? '+' : ''}{formatVND(adj.amount)}
                                     </div>
                                 </div>
                             ))
                         )}
                     </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

