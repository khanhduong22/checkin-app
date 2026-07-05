'use client';

import { updateUserRole, updateUserRate, updateUserMonthlySalary, deleteUser, createUser, updateUserActiveStatus } from '@/app/admin/actions';
import { toggleUserStaffTasksAllowed } from '@/actions/staff-task-actions';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        employmentType: 'PART_TIME' as 'FULL_TIME' | 'PART_TIME',
        hourlyRate: '25000',
        monthlySalary: '6000000',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.name.trim() || !form.email.trim()) {
            setError('Vui lòng điền đầy đủ họ tên và email.');
            return;
        }
        setLoading(true);
        const res = await createUser({
            name: form.name.trim(),
            email: form.email.trim(),
            employmentType: form.employmentType,
            hourlyRate: parseFloat(form.hourlyRate) || 0,
            monthlySalary: parseFloat(form.monthlySalary) || 0,
        });
        setLoading(false);
        if (res.success) {
            setForm({ name: '', email: '', employmentType: 'PART_TIME', hourlyRate: '25000', monthlySalary: '6000000' });
            onClose();
        } else {
            setError(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Thêm nhân viên mới</DialogTitle>
                    <DialogDescription>
                        Tạo tài khoản nhân viên thủ công. Nhân viên có thể đăng nhập bằng Google với email đã đăng ký.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="emp-name" className="text-right">Họ tên <span className="text-red-500">*</span></Label>
                        <Input id="emp-name" name="name" className="col-span-3" placeholder="Nguyễn Văn A" value={form.name} onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="emp-email" className="text-right">Email <span className="text-red-500">*</span></Label>
                        <Input id="emp-email" name="email" type="email" className="col-span-3" placeholder="nhanvien@gmail.com" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="emp-type" className="text-right">Loại</Label>
                        <select
                            id="emp-type"
                            name="employmentType"
                            className="col-span-3 border rounded-md px-3 py-2 text-sm"
                            value={form.employmentType}
                            onChange={handleChange}
                        >
                            <option value="PART_TIME">Part Time</option>
                            <option value="FULL_TIME">Full Time</option>
                        </select>
                    </div>
                    {form.employmentType === 'PART_TIME' ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emp-rate" className="text-right">Lương/giờ</Label>
                            <Input id="emp-rate" name="hourlyRate" type="number" className="col-span-3" value={form.hourlyRate} onChange={handleChange} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emp-salary" className="text-right">Lương cứng</Label>
                            <Input id="emp-salary" name="monthlySalary" type="number" className="col-span-3" value={form.monthlySalary} onChange={handleChange} />
                        </div>
                    )}
                    {error && <p className="col-span-4 text-sm text-red-500 text-center">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Đang tạo...' : 'Thêm nhân viên'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UserItem({ user }: { user: any }) {
    const [rate, setRate] = useState(user.hourlyRate.toString());
    const [monthlySalary, setMonthlySalary] = useState(user.monthlySalary?.toString() || '6000000');
    const [name, setName] = useState(user.name || '');
    const [birthday, setBirthday] = useState(user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
    const [startDate, setStartDate] = useState(user.startDate ? new Date(user.startDate).toISOString().split('T')[0] : '');
    const [loading, setLoading] = useState(false);

    // Dialog States
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditDatesDialog, setShowEditDatesDialog] = useState(false);
    const [deleteEmailInput, setDeleteEmailInput] = useState('');

    const handleToggleActiveStatus = async () => {
        const nextActive = user.isActive !== false ? false : true;
        if (nextActive) {
            setLoading(true);
            const res = await updateUserActiveStatus(user.id, true);
            setLoading(false);
            if (!res.success) alert(res.message);
        } else {
            if (confirm(`Bạn có chắc chắn muốn cho nhân viên ${user.name} nghỉ việc? Tài khoản sẽ bị đăng xuất ngay lập tức và không thể truy cập lại, nhưng lịch sử công/lương vẫn sẽ được giữ lại.`)) {
                setLoading(true);
                const res = await updateUserActiveStatus(user.id, false);
                setLoading(false);
                if (!res.success) alert(res.message);
            }
        }
    };

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
        const { updateUserName } = require('@/app/admin/actions');
        await updateUserName(user.id, name);
        setLoading(false);
    };

    const handleToggleStaffTasksAllowed = async () => {
        setLoading(true);
        const nextAllowed = !user.staffTasksAllowed;
        const res = await toggleUserStaffTasksAllowed(user.id, nextAllowed);
        setLoading(false);
        if (!res.success) {
            alert(res.error || "Gặp lỗi cập nhật quyền.");
        }
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

    const handleUpdateDates = async () => {
        setLoading(true);
        // @ts-ignore
        const { updateUserDates } = await import('@/app/admin/actions');

        await updateUserDates(
            user.id,
            birthday ? new Date(birthday) : null,
            startDate ? new Date(startDate) : null
        );

        setLoading(false);
        setShowEditDatesDialog(false);
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

    const isUserActive = user.isActive !== false;

    return (
        <>
            <div className={`flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors ${!isUserActive ? 'bg-gray-50/50 opacity-70' : ''}`}>
                <div className="flex items-center gap-4 flex-1">
                    <a href={`/admin/employees/${user.id}`} className="hover:opacity-80 transition-opacity" title="Xem chi tiết">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground shrink-0">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : user.name?.[0]}
                        </div>
                    </a>
                    <div>
                        <div className="font-medium flex items-center gap-2">
                            <input
                                className={`bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none focus:ring-0 w-[200px] transition-colors ${!isUserActive ? 'text-gray-500 italic line-through' : ''}`}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onBlur={handleUpdateName}
                                placeholder="Tên nhân viên"
                                disabled={!isUserActive}
                            />
                            {user.role === 'ADMIN' && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">ADMIN</span>}
                            {!isUserActive && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded">ĐÃ NGHỈ VIỆC</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="mt-1">
                            <select
                                className="text-xs border rounded p-1 bg-white"
                                value={user.employmentType || 'PART_TIME'}
                                onChange={handleEmploymentTypeChange}
                                disabled={!isUserActive || loading}
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
                                    className="w-28 h-8 rounded border px-2 text-sm text-right bg-white"
                                    value={monthlySalary}
                                    onChange={e => setMonthlySalary(e.target.value)}
                                    onBlur={handleUpdateMonthlySalary}
                                    disabled={!isUserActive}
                                />
                            </>
                        ) : (
                            <>
                                <span className="text-sm text-muted-foreground">Lương/h:</span>
                                <input
                                    type="number"
                                    className="w-24 h-8 rounded border px-2 text-sm text-right bg-white"
                                    value={rate}
                                    onChange={e => setRate(e.target.value)}
                                    onBlur={handleUpdateRate}
                                    disabled={!isUserActive}
                                />
                            </>
                        )}
                    </div>

                    <Button 
                        variant={user.staffTasksAllowed ? "default" : "outline"} 
                        size="sm" 
                        onClick={handleToggleStaffTasksAllowed}
                        className={user.staffTasksAllowed ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
                        disabled={!isUserActive || loading}
                    >
                        {user.staffTasksAllowed ? 'Gỡ quyền KPI' : 'Cấp quyền KPI'}
                    </Button>

                    <Button variant="outline" size="sm" onClick={toggleRole} disabled={!isUserActive || loading}>
                        {user.role === 'ADMIN' ? 'Gỡ Admin' : 'Cấp Admin'}
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleToggleActiveStatus}
                        className={!isUserActive ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-amber-200 text-amber-700 hover:bg-amber-50"}
                        disabled={loading}
                    >
                        {!isUserActive ? 'Đi làm lại' : 'Cho nghỉ việc'}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        title="Chỉnh sửa ngày đặc biệt"
                        onClick={() => setShowEditDatesDialog(true)}
                        disabled={!isUserActive}
                    >
                        <span className="text-xl">📅</span>
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

            <Dialog open={showEditDatesDialog} onOpenChange={setShowEditDatesDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cập nhật ngày đặc biệt</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa ngày sinh và ngày bắt đầu làm việc của <b>{user.name}</b>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dob" className="text-right">
                                Ngày sinh
                            </Label>
                            <Input
                                id="dob"
                                type="date"
                                className="col-span-3"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start-date" className="text-right">
                                Ngày vào làm
                            </Label>
                            <Input
                                id="start-date"
                                type="date"
                                className="col-span-3"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDatesDialog(false)}>Hủy</Button>
                        <Button onClick={handleUpdateDates} disabled={loading}>
                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Xóa nhân viên?</DialogTitle>
                        <DialogDescription>
                            Hành động này không thể hoàn tác. Toàn bộ dữ liệu chấm công, lịch làm việc của nhân viên này sẽ bị xóa vĩnh viễn khỏi hệ thống.<br /><br />
                            Để giữ lại lịch sử làm việc/chấm công/phần lương, hãy chọn **"Cho nghỉ việc"** thay vì xóa.<br /><br />
                            Vui lòng nhập email <b>{user.email}</b> để xác nhận xóa vĩnh viễn.
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
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showResigned, setShowResigned] = useState(false);

    const activeUsers = users.filter(u => u.isActive !== false);
    const resignedUsers = users.filter(u => u.isActive === false);

    return (
        <>
            <Card id="user-manager-card" className="border-emerald-100">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="text-emerald-900">Danh sách nhân viên</CardTitle>
                        <CardDescription>Quản lý quyền hạn, mức lương và trạng thái hoạt động</CardDescription>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <UserPlus className="h-4 w-4" />
                        Thêm nhân viên
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-md border border-emerald-100 overflow-hidden bg-white">
                        <div className="bg-emerald-50/50 px-4 py-2 text-xs font-semibold text-emerald-800 border-b border-emerald-100">
                            ĐANG LÀM VIỆC ({activeUsers.length})
                        </div>
                        {activeUsers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Không có nhân viên nào</div>
                        ) : (
                            activeUsers.map(u => <UserItem key={u.id} user={u} />)
                        )}
                    </div>

                    {resignedUsers.length > 0 && (
                        <div className="space-y-2">
                            <button 
                                onClick={() => setShowResigned(!showResigned)}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1.5 focus:outline-none transition-colors"
                            >
                                <span>{showResigned ? '▼' : '▶'}</span>
                                <span>NHÂN VIÊN ĐÃ NGHỈ VIỆC ({resignedUsers.length})</span>
                            </button>
                            
                            {showResigned && (
                                <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
                                    {resignedUsers.map(u => <UserItem key={u.id} user={u} />)}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AddEmployeeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
        </>
    );
}
