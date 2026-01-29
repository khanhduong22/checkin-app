import { calculatePayroll } from "@/lib/payroll";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import ExportButton from "@/components/admin/ExportButton";

export const dynamic = 'force-dynamic';

export default async function PayrollPage({ searchParams }: { searchParams: { month?: string, year?: string } }) {
    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const payroll = await calculatePayroll(month, year);
    
    // Format currency
    const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    const fmtNum = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

    // Prepare Export Data
    const exportData = payroll.map((p: any) => ({
        "ID": p.id,
        "Nhân viên": p.name,
        "Email": p.email,
        "Số công": p.checkinCount,
        "Tổng giờ làm": p.totalHours.toFixed(2),
        "Mức lương/h": p.hourlyRate,
        "Tổng Lương": p.totalSalary
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Bảng Lương</h2>
                     <p className="text-muted-foreground">Tháng {month}/{year}</p>
                </div>
                <div className="flex gap-2 items-center">
                     <ExportButton data={exportData} fileName={`bang-luong-${month}-${year}.csv`} />
                     <div className="h-4 w-px bg-gray-200 mx-2" />
                     {/* Simple navigation - In production use proper UI */}
                     <a href={`/admin/payroll?month=${month === 1 ? 12 : month - 1}&year=${month === 1 ? year - 1 : year}`}>
                        <Button variant="outline" size="sm">◀ Tháng trước</Button>
                     </a>
                     <a href={`/admin/payroll?month=${month === 12 ? 1 : month + 1}&year=${month === 12 ? year + 1 : year}`}>
                        <Button variant="outline" size="sm">Tháng sau ▶</Button>
                     </a>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Nhân viên</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">Số công (ngày)</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">Giờ làm việc</th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Mức lương/h</th>
                                    <th className="h-12 px-4 align-middle font-bold text-gray-900 text-right">Tổng Lương</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {payroll.map((p: any) => (
                                    <tr key={p.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium">
                                            <div className="flex items-center gap-3">
                                                 <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : p.name?.[0]}
                                                 </div>
                                                 <div className="flex flex-col">
                                                    <span>{p.name} {p.role === 'ADMIN' && '🛡️'}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">{p.email}</span>
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-center">{p.checkinCount}</td>
                                        <td className="p-4 align-middle text-center text-blue-600 font-medium">{fmtNum.format(p.totalHours)}h</td>
                                        <td className="p-4 align-middle text-right text-muted-foreground">{fmt.format(p.hourlyRate)}</td>
                                        <td className="p-4 align-middle text-right font-bold text-emerald-600 text-base">
                                            {fmt.format(p.totalSalary)}
                                        </td>
                                    </tr>
                                ))}
                                {payroll.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">Không có dữ liệu chấm công tháng này.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
