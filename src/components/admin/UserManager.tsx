'use client';

import { updateUserRole, updateUserRate, updateUserMonthlySalary, deleteUser } from '@/app/admin/actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { useState } from 'react';

function UserItem({ user }: { user: any }) {
    const [rate, setRate] = useState(user.hourlyRate.toString());
    const [monthlySalary, setMonthlySalary] = useState(user.monthlySalary?.toString() || '6000000');
    const [name, setName] = useState(user.name || '');
    const [loading, setLoading] = useState(false);
    
    // Delete Confirmation State
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteEmailInput, setDeleteEmailInput] = useState('');

    const handleUpdateRate = async () => {
        setLoading(true);
        await updateUserRate(user.id, parseFloat(rate));
        setLoading(false);
    };

    const handleUpdateMonthlySalary = async () => {
        setLoading(true);
        await updateUserMonthlySalary(user.id, parseFloat(monthlySalary));
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

    const handleEmploymentTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as 'FULL_TIME' | 'PART_TIME';
        setLoading(true);
        try {
            const { updateUserEmploymentType } = await import('@/app/admin/actions');
            const res = await updateUserEmploymentType(user.id, newType);
            if (!res.success) alert(res.message);
        } catch (error) {
            alert('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (deleteEmailInput !== user.email) return;
        
        setLoading(true);
        const res = await deleteUser(user.id);
        setLoading(false);
        setShowDeleteDialog(false);
        
        if (!res.success) {
            alert(res.message);
        }
    };

    return (
        <>
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
                    <div className="mt-1">
                        <select 
                            className="text-xs border rounded p-1 bg-white"
                            value={user.employmentType || 'PART_TIME'}
                            onChange={handleEmploymentTypeChange}
                            disabled={loading}
                        >
                            <option value="PART_TIME">Part Time</option>
                            <option value="FULL_TIME">Full Time</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {user.employmentType === 'FULL_TIME' ? (
                        <>
                            <span className="text-sm text-muted-foreground">Lương cứng:</span>
                            <input 
                                type="number" 
                                className="w-28 h-8 rounded border px-2 text-sm text-right"
                                value={monthlySalary}
                                onChange={e => setMonthlySalary(e.target.value)}
                                onBlur={handleUpdateMonthlySalary}
                            />
                        </>
                    ) : (
                        <>
                            <span className="text-sm text-muted-foreground">Lương/h:</span>
                            <input 
                                type="number" 
                                className="w-24 h-8 rounded border px-2 text-sm text-right"
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                                onBlur={handleUpdateRate}
                            />
                        </>
                    )}
                </div>
                
                <Button variant="outline" size="sm" onClick={toggleRole}>
                    {user.role === 'ADMIN' ? 'Gỡ Admin' : 'Cấp Admin'}
                </Button>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Xóa nhân viên?</DialogTitle>
                        <DialogDescription>
                            Hành động này không thể hoàn tác. Toàn bộ dữ liệu chấm công, lịch làm việc của nhân viên này sẽ bị xóa vĩnh viễn.<br/><br/>
                            Vui lòng nhập email <b>{user.email}</b> để xác nhận.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <Label>Nhập lại Email xác nhận</Label>
                        <Input 
                            value={deleteEmailInput}
                            onChange={(e) => setDeleteEmailInput(e.target.value)}
                            placeholder={user.email}
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Hủy</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteUser}
                            disabled={deleteEmailInput !== user.email || loading}
                        >
                            {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
