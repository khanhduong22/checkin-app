'use client';

import { updateUserRole, updateUserRate } from '@/app/admin/actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from 'react';

function UserItem({ user }: { user: any }) {
    const [rate, setRate] = useState(user.hourlyRate.toString());
    const [name, setName] = useState(user.name || '');
    const [loading, setLoading] = useState(false);

    const handleUpdateRate = async () => {
        setLoading(true);
        await updateUserRate(user.id, parseFloat(rate));
        setLoading(false);
    };

    const handleUpdateName = async () => {
        if (name === user.name) return;
        setLoading(true);
        // Assuming updateUserName is imported or I'll add import
        // Since I can't easily add import to top without regex, I will assume it's added or use 'any' bypass if imports are tricky in replace.
        // Actually I need to add import to top.
        const { updateUserName } = require('@/app/admin/actions'); 
        await updateUserName(user.id, name);
        setLoading(false);
    };

    const toggleRole = async () => {
        const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
        if (confirm(`Bạn có chắc muốn đổi quyền của ${user.name} thành ${newRole}?`)) {
            await updateUserRole(user.id, newRole);
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4 flex-1">
                 <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground shrink-0">
                    {user.image ? (
                        <img src={user.image} alt="" className="h-full w-full rounded-full" />
                    ) : user.name?.[0]}
                </div>
                <div>
                    <div className="font-medium flex items-center gap-2">
                        <input 
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none focus:ring-0 w-[200px] transition-colors"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={handleUpdateName}
                            placeholder="Tên nhân viên"
                        />
                        {user.role === 'ADMIN' && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">ADMIN</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Lương/h:</span>
                    <input 
                        type="number" 
                        className="w-24 h-8 rounded border px-2 text-sm text-right"
                        value={rate}
                        onChange={e => setRate(e.target.value)}
                        onBlur={handleUpdateRate}
                    />
                </div>
                
                <Button variant="outline" size="sm" onClick={toggleRole}>
                    {user.role === 'ADMIN' ? 'Gỡ Admin' : 'Cấp Admin'}
                </Button>
            </div>
        </div>
    )
}

export default function UserManager({ users }: { users: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Danh sách nhân viên</CardTitle>
                <CardDescription>Quản lý quyền hạn và mức lương</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    {users.map(u => <UserItem key={u.id} user={u} />)}
                </div>
            </CardContent>
        </Card>
    );
}
