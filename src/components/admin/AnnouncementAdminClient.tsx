'use client';

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createAnnouncement, toggleAnnouncement, deleteAnnouncement } from "@/app/actions/announcement";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch"; 

// Need Switch component, or simple button toggle
// Use button for simpler dev now

const TYPES = [
    { value: 'INFO', label: 'ℹ️ Thông tin' },
    { value: 'WARNING', label: '⚠️ Cảnh báo' },
    { value: 'URGENT', label: '🔥 Khẩn cấp' },
    { value: 'SUCCESS', label: '✅ Tin vui' }
];

export default function AnnouncementAdminClient({ announcements }: { announcements: any[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [type, setType] = useState('INFO');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await createAnnouncement(title, content, type);
        setIsSubmitting(false);
        setIsOpen(false);
        setTitle('');
        setContent('');
        router.refresh();
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        await toggleAnnouncement(id, !currentStatus);
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;
        await deleteAnnouncement(id);
        router.refresh();
    };
    return (
        <div className="space-y-6">
            <Button id="announcement-new-btn" onClick={() => setIsOpen(true)}>📢 Đăng thông báo mới</Button>

            <div id="announcement-list" className="space-y-4">
                {announcements.map((a) => (
                    <Card key={a.id} className={a.active ? "border-l-4 border-l-blue-500" : "opacity-60 bg-gray-50"}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{a.type}</Badge>
                                    <h4 className="font-bold">{a.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">{a.content}</p>
                                <div className="text-xs text-muted-foreground mt-2">
                                    Ngày đăng: {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{a.active ? 'Đang hiện' : 'Đã ẩn'}</span>
                                <Button 
                                    size="sm" 
                                    variant={a.active ? "default" : "secondary"}
                                    onClick={() => handleToggle(a.id, a.active)}
                                >
                                    {a.active ? 'Tắt' : 'Bật'}
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDelete(a.id)}
                                >
                                    Xóa
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

             {/* Modal */}
             {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Đăng Thông Báo Mới</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tiêu đề</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="VD: Thông báo nghỉ lễ..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Loại tin</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                >
                                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nội dung</Label>
                                <Input value={content} onChange={e => setContent(e.target.value)} required placeholder="Nội dung chi tiết..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Hủy</Button>
                                <Button type="submit" disabled={isSubmitting}>Đăng ngay</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
