'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAdjustment } from "@/app/actions/payroll";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Plus, FileText, Banknote } from "lucide-react"; 

export default function PayrollAdminClient({ data }: { data: any[] }) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = data.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFilteredSalary = filteredData.reduce((sum, u) => sum + u.stats.totalSalary, 0);

    const handleDownloadCSV = () => {
        const headers = ['Tên', 'Email', 'Loại HĐ', 'Ngày công', 'Nghỉ phép', 'Giờ làm', 'Lương cứng', 'Thưởng/Phạt', 'Thực lãnh'];
        const rows = filteredData.map(u => [
             `"${u.name}"`,
             u.email,
             u.stats.employmentType,
             u.stats.standardDays ? `"${u.stats.daysWorked}/${u.stats.standardDays}"` : u.stats.daysWorked,
             u.stats.leaveCount || 0,
             u.stats.totalHours.toFixed(1),
             u.stats.baseSalary,
             u.stats.totalAdjustments,
             u.stats.totalSalary
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `bang_luong_${new Date().toISOString().split('T')[0]}.csv`;
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
        router.refresh();
    };

    const f = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    return (
        <div className="space-y-6">
            <div className="flex justify-between gap-4">
                <Input 
                    placeholder="Tìm kiếm nhân viên..." 
                    className="max-w-sm bg-white" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Button variant="outline" onClick={handleDownloadCSV} className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                    <FileText className="h-4 w-4 mr-2" />
                    Xuất Excel
                </Button>
            </div>
            <div className="rounded-md border bg-white">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[300px]">Nhân viên</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Giờ công</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[200px]">Thưởng / Phạt</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[150px]">Thực lãnh</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[180px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredData.map((user) => (
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
                                    <td className="p-4 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className={`font-medium ${user.stats.totalAdjustments > 0 ? "text-emerald-600" : user.stats.totalAdjustments < 0 ? "text-red-500" : "text-gray-500"}`}>
                                                {user.stats.totalAdjustments > 0 ? "+" : ""}{f(user.stats.totalAdjustments)}
                                            </span>
                                            {user.recentAdjustments.length > 0 && (
                                                <span className="text-[10px] text-muted-foreground line-clamp-1">
                                                    Mới nhất: {user.recentAdjustments[0].reason}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <span className="font-bold text-emerald-700 text-base">
                                            {f(user.stats.totalSalary)}
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
                            ))}
                        </tbody>
                        <tfoot className="bg-muted font-bold text-sm">
                            <tr>
                                <td colSpan={3} className="p-4 text-right uppercase">Tổng cộng ({filteredData.length} nhân viên):</td>
                                <td className="p-4 text-emerald-600 font-bold text-lg">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalFilteredSalary)}
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
