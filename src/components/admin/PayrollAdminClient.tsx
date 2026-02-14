'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAdjustment } from "@/app/actions/payroll";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Plus, FileText, Banknote } from "lucide-react"; 
import PayrollMonthSelector from "@/components/PayrollMonthSelector";
export default function PayrollAdminClient({ 
    data, 
    month, 
    year, 
    isClosed, 
    initialBonusPercent,
    initialBonusTargets = ['PART_TIME']
}: { 
    data: any[], 
    month: number, 
    year: number, 
    isClosed: boolean, 
    initialBonusPercent: number,
    initialBonusTargets?: string[]
}) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Bonus & Close Logic
    const [bonusPercent, setBonusPercent] = useState(initialBonusPercent);
    const [bonusTargets, setBonusTargets] = useState<string[]>(initialBonusTargets);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isUpdatingBonus, setIsUpdatingBonus] = useState(false);

    // Update local state when props change
    useEffect(() => {
        setBonusPercent(initialBonusPercent);
        setBonusTargets(initialBonusTargets);
    }, [initialBonusPercent, initialBonusTargets]);

    const filteredData = data.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate total including bonus if open, or use snapshot data
    const totalBase = filteredData.reduce((sum, u) => sum + (u.stats.totalSalary || 0), 0);
    // If closed, stats.finalNet should exist in snapshot content. If open, we calculate.
    const totalWithBonus = isClosed 
        ? filteredData.reduce((sum, u) => sum + (u.stats.finalNet || u.stats.totalSalary), 0)
        : filteredData.reduce((sum, u) => {
            const shouldApply = bonusTargets.includes(u.stats.employmentType);
            const bonus = shouldApply ? (u.stats.baseSalary * bonusPercent / 100) : 0;
            return sum + u.stats.totalSalary + bonus;
        }, 0);

    const handleDownloadCSV = () => {
        const headers = ['Tên', 'Email', 'Loại HĐ', 'Ngày công', 'Nghỉ phép', 'Giờ làm', 'Lương cứng', 'Thưởng %', 'Thưởng/Phạt', 'Thực lãnh'];
        const rows = filteredData.map(u => {
            const shouldApply = isClosed ? false : bonusTargets.includes(u.stats.employmentType);
            const bonusAmount = isClosed 
                ? (u.stats.bonusAmount || 0) 
                : (shouldApply ? (u.stats.baseSalary * bonusPercent / 100) : 0);
            
            return [
             `"${u.name}"`,
             u.email,
             u.stats.employmentType,
             u.stats.standardDays ? `"${u.stats.daysWorked}/${u.stats.standardDays}"` : u.stats.daysWorked,
             u.stats.leaveCount || 0,
             u.stats.totalHours.toFixed(1),
             u.stats.baseSalary,
             bonusAmount,
             u.stats.totalAdjustments,
             isClosed ? (u.stats.finalNet || u.stats.totalSalary) : (u.stats.totalSalary + bonusAmount)
        ]});
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bang_luong_${month}_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSubmitting(true);
        await addAdjustment(selectedUser.id, parseInt(amount), reason);
        setIsSubmitting(false);
        setAmount('');
        setReason('');
        setSelectedUser(null);
        router.refresh(); // Refresh page to re-calculate stats
    };

    const handleUpdateBonus = async () => {
        setIsUpdatingBonus(true);
        const { updatePayrollBonus } = await import("@/app/actions/payroll");
        await updatePayrollBonus(month, year, bonusPercent, bonusTargets as any);
        setIsUpdatingBonus(false);
        router.refresh();
    };

    const handleCloseMonth = async () => {
        if (!confirm(`Bạn có chắc chắn muốn CHỐT lương tháng ${month}/${year}? Dữ liệu sẽ được lưu trữ và không thể chỉnh sửa.`)) return;
        setIsClosing(true);
        const { closePayrollMonth } = await import("@/app/actions/payroll");
        await closePayrollMonth(month, year, bonusPercent, bonusTargets as any);
        setIsClosing(false);
        router.refresh();
    };

    const handleReopenMonth = async () => {
        if (!confirm(`Mở lại tháng ${month}/${year}? Dữ liệu snapshot cũ sẽ BỊ XÓA khi bạn chốt lại lần sau.`)) return;
        setIsClosing(true);
        const { reopenPayrollMonth } = await import("@/app/actions/payroll");
        await reopenPayrollMonth(month, year);
        setIsClosing(false);
        router.refresh();
    };

    const f = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    
    // Generate options for Month Selector (e.g., last 12 months)
    const monthOptions = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        monthOptions.push({ value: `${y}-${m}`, label: `Tháng ${m}/${y}` });
    }

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-[180px]">
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Tháng làm việc</label>
                        <PayrollMonthSelector current={`${year}-${month}`} options={monthOptions} baseUrl="/admin/payroll" />
                    </div>
                    
                    {!isClosed && (
                        <div className="flex gap-2 items-end">
                            <div className="w-[150px]">
                                <label className="text-xs font-semibold text-muted-foreground block mb-1">Thưởng tháng (%)</label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number" 
                                        value={bonusPercent} 
                                        onChange={e => setBonusPercent(parseFloat(e.target.value))}
                                        className="h-9"
                                        min={0}
                                        max={100}
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={handleUpdateBonus} 
                                        disabled={isUpdatingBonus || (bonusPercent === initialBonusPercent && JSON.stringify(bonusTargets) === JSON.stringify(initialBonusTargets))}
                                        title="Lưu thưởng"
                                    >
                                        {isUpdatingBonus ? "..." : "Lưu"}
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Target Selection Dropdown */}
                            <div className="relative">
                                <label className="text-xs font-semibold text-muted-foreground block mb-1">Áp dụng cho</label>
                                <Button 
                                    variant="outline" 
                                    className="h-9 w-[180px] justify-between font-normal text-xs"
                                    onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                                >
                                    {bonusTargets.length === 2 ? "Tất cả nhân viên" : bonusTargets.length === 0 ? "Không chọn" : bonusTargets.includes('PART_TIME') ? "Part-time" : "Full-time"}
                                    <span className="opacity-50">▼</span>
                                </Button>
                                
                                {showTargetDropdown && (
                                    <div className="absolute top-full left-0 mt-1 w-[180px] bg-white border rounded shadow-md z-50 p-2 space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={bonusTargets.includes('PART_TIME')}
                                                onChange={(e) => {
                                                    if (e.target.checked) setBonusTargets([...bonusTargets, 'PART_TIME']);
                                                    else setBonusTargets(bonusTargets.filter(t => t !== 'PART_TIME'));
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm">Part-time</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={bonusTargets.includes('FULL_TIME')}
                                                onChange={(e) => {
                                                    if (e.target.checked) setBonusTargets([...bonusTargets, 'FULL_TIME']);
                                                    else setBonusTargets(bonusTargets.filter(t => t !== 'FULL_TIME'));
                                                }}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm">Full-time</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                     {isClosed && (
                        <div className="w-[150px]">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Thưởng tháng</label>
                            <div className="font-bold text-emerald-600 flex items-center h-9">
                                {bonusPercent}%
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-end gap-2">
                    <Button id="payroll-export-btn" variant="outline" onClick={handleDownloadCSV} className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                        <FileText className="h-4 w-4 mr-2" />
                        Xuất Excel
                    </Button>
                    
                    {isClosed ? (
                        <Button variant="outline" onClick={handleReopenMonth} disabled={isClosing} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                            {isClosing ? "Đang xử lý..." : "Mở lại tháng"}
                        </Button>
                    ) : (
                        <Button onClick={handleCloseMonth} disabled={isClosing || filteredData.length === 0} className="bg-purple-600 hover:bg-purple-700">
                            <Banknote className="h-4 w-4 mr-2" />
                            {isClosing ? "Đang chốt..." : "Chốt lương tháng"}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex justify-between gap-4">
                <Input 
                    id="payroll-search-input"
                    placeholder="Tìm kiếm nhân viên..." 
                    className="max-w-sm bg-white" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div id="payroll-table-container" className="rounded-md border bg-white">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[250px]">Nhân viên</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Giờ công</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Lương</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Thưởng {bonusPercent}%</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[150px]">Thưởng / Phạt</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[150px]">Tổng cộng</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[140px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredData.map((user) => {
                                const shouldApply = !isClosed && bonusTargets.includes(user.stats.employmentType);
                                const bonusAmount = isClosed
                                    ? (user.stats.bonusAmount || 0)
                                    : (shouldApply ? (user.stats.baseSalary * bonusPercent / 100) : 0);

                                const finalSalary = isClosed 
                                    ? (user.stats.finalNet ?? user.stats.totalSalary)
                                    : (user.stats.totalSalary + bonusAmount);

                                return (
                                <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                {user.name?.[0] || '?'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle font-mono">
                                        {user.stats.employmentType === 'FULL_TIME' ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{user.stats.totalHours.toFixed(1)}h</span>
                                                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground font-sans">
                                                        {user.stats.daysWorked}/{user.stats.standardDays} công
                                                    </span>
                                                </div>
                                                {user.stats.leaveCount > 0 && (
                                                    <span className="text-[10px] text-red-600 font-semibold">
                                                        Nghỉ: {user.stats.leaveCount}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="font-bold text-sm">{user.stats.totalHours.toFixed(1)}h</span>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle text-right font-medium text-gray-700">
                                        {f(user.stats.baseSalary)}
                                    </td>
                                    <td className="p-4 align-middle text-right font-medium text-blue-600">
                                        {bonusAmount > 0 ? "+" : ""}{f(bonusAmount)}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className={`font-medium ${user.stats.totalAdjustments > 0 ? "text-emerald-600" : user.stats.totalAdjustments < 0 ? "text-red-500" : "text-gray-500"}`}>
                                                {user.stats.totalAdjustments > 0 ? "+" : ""}{f(user.stats.totalAdjustments)}
                                            </span>
                                            {!isClosed && user.recentAdjustments?.length > 0 && (
                                                <span className="text-[10px] text-muted-foreground line-clamp-1">
                                                    Mới nhất: {user.recentAdjustments[0].reason}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <span className="font-bold text-emerald-700 text-base">
                                            {f(finalSalary)}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 px-2"
                                                onClick={() => setSelectedUser(user)}
                                                title="Thưởng/Phạt"
                                                disabled={isClosed}
                                            >
                                                ±
                                            </Button>
                                            <Link href={`/admin/employees/${user.id}`}>
                                                <Button variant="default" size="sm" className="h-8 px-3 text-xs">
                                                    Chi tiết
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                        <tfoot className="bg-muted font-bold text-sm">
                            <tr>
                                <td colSpan={5} className="p-4 text-right uppercase">Tổng cộng ({filteredData.length} nhân viên):</td>
                                <td className="p-4 text-emerald-600 font-bold text-lg text-right">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalWithBonus)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-1">Điều chỉnh lương</h3>
                        <p className="text-sm text-muted-foreground mb-4">Nhân viên: <b>{selectedUser.name}</b></p>
                        
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Số tiền (+ Thưởng, - Phạt)</label>
                                <Input 
                                    type="number" 
                                    placeholder="VD: 50000 hoặc -20000" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    autoFocus
                                />
                                <div className="flex gap-2 text-xs">
                                    <span 
                                        className="cursor-pointer text-blue-600 underline" 
                                        onClick={() => { setAmount('50000'); setReason('Thưởng Streak tuần'); }}
                                    >+50k (Streak)</span>
                                    <span 
                                        className="cursor-pointer text-red-600 underline" 
                                        onClick={() => { setAmount('-50000'); setReason('Đi muộn > 15p'); }}
                                    >-50k (Muộn)</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lý do</label>
                                <Input 
                                    placeholder="VD: Thưởng doanh số..." 
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    required 
                                />
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setSelectedUser(null)}>Hủy</Button>
                                <Button type="submit" disabled={isSubmitting}>Lưu</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
