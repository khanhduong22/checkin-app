'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAdjustment } from "@/app/actions/payroll";
import { useRouter } from "next/navigation";

export default function PayrollAdminClient({ data }: { data: any[] }) {
    const router = useRouter();
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.map(user => (
                    <Card key={user.id} className="overflow-hidden">
                        <CardHeader className="bg-gray-50 pb-2">
                            <CardTitle className="text-base flex justify-between">
                                <span>{user.name}</span>
                                <span className="text-emerald-600">{f(user.stats.totalSalary)}</span>
                            </CardTitle>
                            <div className="text-xs text-muted-foreground flex justify-between">
                                <span>{user.email}</span>
                                <span>{user.stats.totalHours.toFixed(1)}h</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                             <div className="text-xs space-y-1">
                                <div className="flex justify-between"><span>Lương cứng:</span> <span>{f(user.stats.baseSalary)}</span></div>
                                <div className="flex justify-between"><span>Điều chỉnh:</span> <span className={user.stats.totalAdjustments > 0 ? "text-emerald-600" : "text-red-600"}>{f(user.stats.totalAdjustments)}</span></div>
                            </div>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs"
                                onClick={() => setSelectedUser(user)}
                            >
                                💸 Thưởng / Phạt
                            </Button>

                            {/* Recent History */}
                             {user.recentAdjustments.length > 0 && (
                                <div className="border-t pt-2 mt-2">
                                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Gần đây:</p>
                                    {user.recentAdjustments.slice(0, 2).map((adj: any) => (
                                        <div key={adj.id} className="text-[10px] flex justify-between text-muted-foreground">
                                            <span>{adj.reason}</span>
                                            <span className={adj.amount > 0 ? "text-green-600" : "text-red-500"}>
                                                {adj.amount > 0 ? '+' : ''}{f(adj.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
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
