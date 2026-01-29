'use client';

import { useState } from 'react';
import { addAllowedIP, deleteAllowedIP } from '@/app/admin/actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function IPManager({ ips }: { ips: any[] }) {
    const [prefix, setPrefix] = useState('');
    const [label, setLabel] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!prefix) return;
        setLoading(true);
        await addAllowedIP(prefix, label);
        setPrefix('');
        setLabel('');
        setLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cấu hình IP Văn Phòng</CardTitle>
                <CardDescription>Chỉ những IP này mới được phép Check-in</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        placeholder="IP Prefix (e.g. 192.168.1.)" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={prefix}
                        onChange={e => setPrefix(e.target.value)}
                    />
                     <input 
                        type="text" 
                        placeholder="Mô tả (e.g. Tầng 1)" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                    />
                    <Button onClick={handleAdd} disabled={loading}>
                        Thêm
                    </Button>
                </div>

                <div className="rounded-md border">
                    {ips.map((ip, i) => (
                        <div key={ip.id} className={`flex items-center justify-between p-4 ${i !== ips.length -1 ? 'border-b' : ''}`}>
                            <div>
                                <div className="font-medium">{ip.prefix}</div>
                                <div className="text-sm text-muted-foreground">{ip.label || 'Không mô tả'}</div>
                            </div>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => deleteAllowedIP(ip.id)}
                            >
                                Xóa
                            </Button>
                        </div>
                    ))}
                    {ips.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">Chưa có IP nào.</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
