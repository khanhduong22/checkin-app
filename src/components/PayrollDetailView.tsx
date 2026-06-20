'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, Calendar, Gift } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{stats.daysWorked} ngày đi làm</span>
                        {stats.totalDeficiencies && stats.totalDeficiencies > 0 ? (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">
                                ⚠️ {stats.totalDeficiencies} lỗi quy trình
                            </span>
                        ) : null}
                    </div>
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
                    <div className="p-4 bg-gray-50/50 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Chi tiết Ca làm việc</h3>
                        <div className="hidden sm:flex text-[10px] text-muted-foreground gap-3 font-medium">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-gray-100/60 border block"></span> Số liệu gốc
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-xs bg-blue-50/20 border border-blue-100 block"></span> Số liệu đã đối soát
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {stats.dailyDetails.length === 0 ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu chấm công tháng này.</div>
                        ) : (
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="w-full text-xs border-collapse min-w-[800px]">
                                    <thead className="bg-gray-50/80 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 backdrop-blur-xs z-10">
                                        <tr>
                                            <th className="p-2.5 text-left border-r border-gray-200 font-bold text-gray-900" rowSpan={2}>Ngày & Ca</th>
                                            <th className="p-1.5 text-center border-r border-gray-200 text-gray-700 bg-gray-100/40" colSpan={4}>Số liệu thô (Raw)</th>
                                            <th className="p-1.5 text-center border-r border-gray-200 text-blue-700 bg-blue-50/20" colSpan={4}>Số liệu đối soát (Audited)</th>
                                            <th className="p-2.5 text-center font-bold text-gray-900" rowSpan={2}>Bất thường / Trạng thái</th>
                                        </tr>
                                        <tr className="border-b border-gray-200 bg-gray-50/50">
                                            <th className="p-1.5 text-center font-semibold text-gray-600 bg-gray-100/10">Vào</th>
                                            <th className="p-1.5 text-center font-semibold text-gray-600 bg-gray-100/10">Ra</th>
                                            <th className="p-1.5 text-center font-semibold text-gray-600 bg-gray-100/10">Giờ</th>
                                            <th className="p-1.5 text-right font-semibold text-gray-600 border-r border-gray-200 bg-gray-100/10">Lương thô</th>
                                            
                                            <th className="p-1.5 text-center font-semibold text-blue-600 bg-blue-50/10">Vào</th>
                                            <th className="p-1.5 text-center font-semibold text-blue-600 bg-blue-50/10">Ra</th>
                                            <th className="p-1.5 text-center font-semibold text-blue-600 bg-blue-50/10">Giờ</th>
                                            <th className="p-1.5 text-right font-semibold text-blue-600 border-r border-gray-200 bg-blue-50/10">Lương</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {stats.dailyDetails.map((day: any, idx: number) => {
                                            const hasAnomalies = day.anomalies && day.anomalies.length > 0;
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    {/* Ngày & Ca */}
                                                    <td className="p-2.5 border-r border-gray-100 font-medium">
                                                        <div className="font-semibold text-gray-900">
                                                            {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate max-w-[120px]" title={day.shift}>
                                                            {day.shift || 'Ngoài ca'}
                                                        </div>
                                                    </td>

                                                    {/* Số liệu thô */}
                                                    <td className="p-2 text-center text-gray-600 bg-gray-50/20 font-mono">
                                                        {day.rawCheckIn ? new Date(day.rawCheckIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="p-2 text-center text-gray-600 bg-gray-50/20 font-mono">
                                                        {day.rawCheckOut ? new Date(day.rawCheckOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="p-2 text-center font-mono text-gray-700 bg-gray-50/20">
                                                        {day.rawHours && day.rawHours > 0 ? `${day.rawHours.toFixed(2)}h` : '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-mono text-gray-600 border-r border-gray-100 bg-gray-50/20">
                                                        {day.rawSalary && day.rawSalary > 0 ? formatVND(day.rawSalary) : '-'}
                                                    </td>

                                                    {/* Số liệu đối soát */}
                                                    <td className="p-2 text-center text-blue-850 bg-blue-50/5 font-mono">
                                                        {day.auditedCheckIn ? new Date(day.auditedCheckIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="p-2 text-center text-blue-850 bg-blue-50/5 font-mono">
                                                        {day.auditedCheckOut ? new Date(day.auditedCheckOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="p-2 text-center font-mono font-bold text-blue-900 bg-blue-50/5">
                                                        {day.hours > 0 ? `${day.hours.toFixed(2)}h` : '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-700 border-r border-gray-100 bg-blue-50/5">
                                                        {day.salary > 0 ? formatVND(day.salary) : '-'}
                                                    </td>

                                                    {/* Bất thường / Đối soát */}
                                                    <td className="p-2.5">
                                                        <div className="flex flex-col items-center gap-1.5 justify-center">
                                                            {hasAnomalies ? (
                                                                <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                                                                    {day.anomalies.map((ano: string, aIdx: number) => {
                                                                        let badgeStyle = "bg-gray-50 text-gray-700 border-gray-200";
                                                                        if (ano.includes("Đi muộn") || ano.includes("Thiếu check-in") || ano.includes("Quên check-out")) {
                                                                            badgeStyle = "bg-rose-50 text-rose-700 border-rose-100 font-medium";
                                                                        } else if (ano.includes("Vào sớm") || ano.includes("Về sớm")) {
                                                                            badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                                                                        } else if (ano.includes("WFH") || ano.includes("Làm việc từ xa")) {
                                                                            badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-100";
                                                                        } else if (ano.includes("Ngày lễ")) {
                                                                            badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold";
                                                                        }
                                                                        return (
                                                                            <Badge key={aIdx} variant="outline" className={`text-[9px] px-1.5 py-0.5 font-normal rounded-sm leading-none ${badgeStyle}`}>
                                                                                {ano}
                                                                            </Badge>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                day.hours > 0 ? (
                                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-normal rounded-sm bg-green-50 text-green-700 border-green-100 leading-none">
                                                                        Bình thường
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-[10px] text-muted-foreground">Không làm việc</span>
                                                                )
                                                            )}

                                                            {day.hours > 0 && day.salary - (day.rawSalary || 0) !== 0 && (
                                                                <span className={`text-[10px] font-bold mt-0.5 ${day.salary - (day.rawSalary || 0) > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                                                    {day.salary - (day.rawSalary || 0) > 0 ? '+' : ''}{formatVND(day.salary - (day.rawSalary || 0)).replace('₫', 'đ')}
                                                                </span>
                                                            )}
                                                            
                                                            {day.hours > 0 && (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <button className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-0.5 mt-0.5 transition-colors">
                                                                            Chi tiết đối soát 🔍
                                                                        </button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="max-w-md bg-white border border-gray-200 shadow-xl rounded-xl">
                                                                        <DialogHeader>
                                                                            <DialogTitle className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                                                                <span>🔍 Đối soát ngày {new Date(day.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                                            </DialogTitle>
                                                                        </DialogHeader>
                                                                        <div className="space-y-4 text-xs mt-2 text-gray-700">
                                                                            {/* Raw Info */}
                                                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5 font-medium">
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-gray-500">Lịch làm việc (Shift):</span>
                                                                                    <span className="text-gray-800">{day.shift || 'Ngoài lịch (Không gán ca)'}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-gray-500">Giờ vào thực tế:</span>
                                                                                    <span className="text-gray-800">{day.rawCheckIn ? new Date(day.rawCheckIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-gray-500">Giờ ra thực tế:</span>
                                                                                    <span className="text-gray-800">{day.rawCheckOut ? new Date(day.rawCheckOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Logic explanation */}
                                                                            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg space-y-2">
                                                                                <h4 className="font-bold text-blue-800 uppercase tracking-wide text-[10px]">Giải thích công thức:</h4>
                                                                                <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
                                                                                    {day.shift ? (
                                                                                        <>
                                                                                            <li>
                                                                                                Có lịch làm việc cố định gán: <span className="font-semibold text-gray-800">{day.shift}</span>.
                                                                                            </li>
                                                                                            {day.anomalies?.includes("Vào sớm (Làm tròn ca)") && (
                                                                                                <li>
                                                                                                    <strong>Làm tròn check-in sớm:</strong> Do vào sớm hơn lịch bắt đầu, hệ thống làm tròn giờ tính công về <span className="font-semibold text-blue-700">bằng giờ bắt đầu của ca</span> để tránh ngoài giờ chưa duyệt.
                                                                                                </li>
                                                                                            )}
                                                                                            {day.anomalies?.includes("Đi muộn") && (
                                                                                                <li>
                                                                                                    <strong>Đi muộn:</strong> Giờ vào trễ hơn lịch ca bắt đầu. Giờ làm tính từ lúc check-in thực tế.
                                                                                                </li>
                                                                                            )}
                                                                                            {day.anomalies?.includes("Về sớm (Đã duyệt)") ? (
                                                                                                <li>
                                                                                                    <strong>Về sớm (Đã duyệt):</strong> Ra sớm hơn ca làm nhưng đã được admin phê duyệt phép, hệ thống vẫn tính tròn công đến hết ca.
                                                                                                </li>
                                                                                            ) : day.anomalies?.includes("Về sớm") ? (
                                                                                                <li>
                                                                                                    <strong>Về sớm (Không phép):</strong> Ra sớm hơn ca làm, giờ làm tính đến lúc check-out thực tế.
                                                                                                </li>
                                                                                            ) : null}
                                                                                        </>
                                                                                    ) : (
                                                                                        <li>Không có ca làm việc gán: Tính 100% thời gian làm việc thực tế từ lúc check-in đến lúc check-out.</li>
                                                                                    )}
                                                                                    <li className="text-blue-700 font-semibold">
                                                                                        Tổng thời gian tính công: {day.hours.toFixed(2)}h
                                                                                    </li>
                                                                                </ul>
                                                                            </div>

                                                                            {/* Salary Calculation */}
                                                                            <div className="border-t pt-3 space-y-2">
                                                                                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">Chi tiết lương:</h4>
                                                                                <div className="space-y-1 bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100 font-medium">
                                                                                    <div className="flex justify-between">
                                                                                        <span>Giờ tính công:</span>
                                                                                        <span className="font-mono font-bold text-gray-850">{day.hours.toFixed(2)}h</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span>Lương theo giờ (dynamicHourlyRate):</span>
                                                                                        <span className="font-mono font-bold text-gray-850">{formatVND(stats.dynamicHourlyRate || stats.hourlyRate)}/h</span>
                                                                                    </div>
                                                                                    {day.multiplier > 1 && (
                                                                                        <div className="flex justify-between text-amber-600 font-semibold">
                                                                                            <span>Hệ số ngày lễ:</span>
                                                                                            <span>x{day.multiplier}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex justify-between border-t border-dashed border-emerald-200 pt-1.5 font-bold text-emerald-700 text-sm">
                                                                                        <span>Lương tạm tính trong ngày:</span>
                                                                                        <span>{formatVND(day.salary)}</span>
                                                                                    </div>
                                                                                    {day.salary - (day.rawSalary || 0) !== 0 && (
                                                                                        <div className={`flex justify-between border-t border-dashed border-emerald-300 pt-1.5 font-bold text-sm ${day.salary - (day.rawSalary || 0) > 0 ? 'text-blue-750' : 'text-rose-750'}`}>
                                                                                            <span>Chênh lệch đối soát:</span>
                                                                                            <span>{day.salary - (day.rawSalary || 0) > 0 ? '+' : ''}{formatVND(day.salary - (day.rawSalary || 0))}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
