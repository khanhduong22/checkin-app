"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitRequest } from "@/app/actions/request";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HeadlessCombobox } from "@/components/ui/headless-combobox";

const TYPES = [
    { value: 'LATE', label: 'Xin đi muộn' },
    { value: 'EARLY', label: 'Xin về sớm' },
    { value: 'MISSING', label: 'Quên Check-in/out' },
    { value: 'LEAVE', label: 'Xin nghỉ phép' },
    { value: 'WFH', label: 'Xin làm từ xa (WFH)' },
    { value: 'OTHER', label: 'Khác' }
];

export default function RequestListClient({ requests }: { requests: any[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<string>('LATE');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await submitRequest(date, type, reason);
        setIsSubmitting(false);
        if (res.success) {
            setIsOpen(false);
            setReason('');
            router.refresh();
        } else {
            alert(res.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <a href="/">
                    <Button variant="outline" size="sm">← Home</Button>
                </a>
                <h1 className="text-xl font-bold">Yêu cầu / Giải trình</h1>
                <Button id="create-request-btn" onClick={() => setIsOpen(true)}>📝 Tạo yêu cầu</Button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {requests.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">Chưa có yêu cầu nào.</div>
                ) : requests.map((r: any) => (
                    <Card key={r.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{TYPES.find(t => t.value === r.type)?.label || r.type}</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {new Date(r.date).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div className="font-medium text-sm">{r.reason}</div>
                            </div>
                            <div>
                                {r.status === 'PENDING' && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Đang chờ</Badge>}
                                {r.status === 'APPROVED' && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Đã duyệt</Badge>}
                                {r.status === 'REJECTED' && <Badge variant="destructive">Từ chối</Badge>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold mb-4">Gửi yêu cầu mới</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Ngày</Label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Loại yêu cầu</Label>
                                    <HeadlessCombobox
                                        items={TYPES}
                                        value={type}
                                        onChange={setType}
                                        valueKey="value"
                                        displayKey="label"
                                        placeholder="Chọn loại yêu cầu..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lý do chi tiết</Label>
                                    <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="VD: Hỏng xe, Xin phép đi muộn..." required />
                                </div>
                                <div className="pt-4 flex justify-end gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Hủy</Button>
                                    <Button type="submit" disabled={isSubmitting}>Gửi ngay</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
