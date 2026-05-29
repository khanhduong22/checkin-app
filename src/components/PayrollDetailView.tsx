'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, Calendar, Gift } from "lucide-react";

function formatVND(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export default function PayrollDetailView({ stats, userName, monthStr, isClosed }: { stats: any, userName?: string, monthStr: string, isClosed?: boolean }) {
    if (!stats) return <div>Không có dữ liệu</div>;

    // When month is closed, use finalNet as the displayed total (includes bonusAmount)
    const displayTotal = isClosed && stats.finalNet != null ? stats.finalNet : stats.totalSalary;
    // bonusAmount is only set when the month has been closed (chốt lương)
    const bonusAmount: number = stats.bonusAmount || 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4 bg-emerald-50 border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase">Thực lãnh ({monthStr})</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-900">
                        {formatVND(displayTotal)}
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

                {/* Show Thưởng tháng card when month is closed and bonusAmount > 0 */}
                {isClosed && bonusAmount > 0 ? (
                    <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <Gift className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase">Thưởng tháng ({stats.bonusPercent}%)</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                            +{formatVND(bonusAmount)}
                        </div>
                    </Card>
                ) : (
                    <Card className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase">Lương theo giờ</span>
                        </div>
                        <div className="text-2xl font-bold">
                            {formatVND(stats.hourlyRate)}/h
                        </div>
                    </Card>
                )}
            </div>

            {stats.isThuKpiSalary && (
                <Card className="p-5 bg-indigo-50/50 border-indigo-200/80 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-700 mb-3">
                        <span className="text-xl">🎯</span>
                        <span className="text-sm font-bold uppercase tracking-wide">Chi tiết lương hiệu suất & KPI</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-indigo-900">
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                            <p className="text-[11px] text-indigo-500 font-medium uppercase tracking-wider">Lương cứng WFH</p>
                            <p className="text-xl font-bold text-indigo-950 mt-1">{formatVND(stats.fixedBaseSalary)}</p>
                            <p className="text-[10px] text-indigo-400 mt-0.5">Không phụ thuộc vào số giờ làm</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                            <p className="text-[11px] text-indigo-500 font-medium uppercase tracking-wider font-semibold">Lương hiệu suất KPI (Đạt {(stats.kpiCompletionRate * 100).toFixed(0)}%)</p>
                            <p className="text-xl font-bold text-indigo-950 mt-1">{formatVND(stats.kpiSalary)}</p>
                            <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                                Hoàn thành: {stats.kpiTasksApproved}/{stats.kpiTasksTotal} công việc
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-red-100 shadow-2xs">
                            <p className="text-[11px] text-red-500 font-medium uppercase tracking-wider">Khấu trừ KPI chưa đạt</p>
                            <p className="text-xl font-bold text-red-700 mt-1">-{formatVND(3000000 - stats.kpiSalary)}</p>
                            <p className="text-[10px] text-red-400 mt-0.5">Bị trừ do chưa hoàn thành 100% việc</p>
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-6 pt-2">
                {/* Lịch sử Thưởng/Phạt Card */}
                <Card className="overflow-hidden">
                    <div className="p-4 bg-gray-50/50 border-b">
                        <h3 className="font-bold text-gray-900">Lịch sử Thưởng/Phạt</h3>
                    </div>
                    <div className="p-4">
                        {stats.adjustments.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">Không có khoản thưởng/phạt nào.</div>
                        ) : (
                            <div className="space-y-4">
                                {stats.adjustments.map((adj: any) => (
                                    <div key={adj.id} className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm text-gray-800">{adj.reason}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(adj.date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                        <div className={`font-bold text-sm ${adj.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {adj.amount > 0 ? '+' : ''}{formatVND(adj.amount).replace('₫', 'đ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Chi tiết Ca làm việc Card */}
                <Card className="overflow-hidden">
                    <div className="p-4 bg-gray-50/50 border-b">
                        <h3 className="font-bold text-gray-900">Chi tiết Ca làm việc</h3>
                    </div>
                    <div>
                        <div className="grid grid-cols-5 gap-2 p-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b">
                            <div className="col-span-1">Ngày</div>
                            <div className="col-span-1 text-center">Giờ vào</div>
                            <div className="col-span-1 text-center">Giờ ra</div>
                            <div className="col-span-1 text-center">Số giờ</div>
                            <div className="col-span-1 text-right">Lương</div>
                        </div>
                        {stats.dailyDetails.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu chấm công tháng này.</div>
                        ) : (
                            <div className="max-h-[600px] overflow-auto">
                                {stats.dailyDetails.map((day: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-5 gap-2 p-3 text-sm border-b last:border-0 hover:bg-gray-50 items-center">
                                        <div className="col-span-1 font-medium text-xs">
                                            {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                            {!day.isValid && (
                                                <div className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                                                    <AlertCircle className="h-3 w-3" /> {day.error}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-1 text-center text-muted-foreground text-xs">
                                            {day.checkIn ? new Date(day.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </div>
                                        <div className="col-span-1 text-center text-muted-foreground text-xs">
                                            {day.checkOut ? new Date(day.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </div>
                                        <div className="col-span-1 text-center font-mono text-xs">
                                            {day.hours > 0 ? day.hours.toFixed(1) + 'h' : '-'}
                                        </div>
                                        <div className="col-span-1 text-right font-medium text-emerald-600 text-xs">
                                            {day.salary > 0 ? formatVND(day.salary) : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
