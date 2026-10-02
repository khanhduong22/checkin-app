import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

function AddEmployeeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    employmentType: "PART_TIME" as "FULL_TIME" | "PART_TIME",
    hourlyRate: "25000",
    monthlySalary: "6000000",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Vui lòng điền đầy đủ họ tên và email.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/admin/employees", {
        name: form.name.trim(),
        email: form.email.trim(),
        employmentType: form.employmentType,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        monthlySalary: parseFloat(form.monthlySalary) || 0,
      });
      toast.success("Đã thêm nhân viên mới!");
      setForm({
        name: "",
        email: "",
        employmentType: "PART_TIME",
        hourlyRate: "25000",
        monthlySalary: "6000000",
      });
      onClose();
      if (onCreated) onCreated();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi tạo nhân viên");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên mới</DialogTitle>
          <DialogDescription>
            Tạo tài khoản nhân viên thủ công. Nhân viên có thể đăng nhập bằng
            Google với email đã đăng ký.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="emp-name" className="text-right">
              Họ tên <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emp-name"
              name="name"
              className="col-span-3"
              placeholder="Nguyễn Văn A"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="emp-email" className="text-right">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emp-email"
              name="email"
              type="email"
              className="col-span-3"
              placeholder="nhanvien@gmail.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="emp-type" className="text-right">
              Loại
            </Label>
            <select
              id="emp-type"
              name="employmentType"
              className="col-span-3 border rounded-md px-3 py-2 text-sm bg-white"
              value={form.employmentType}
              onChange={handleChange}
            >
              <option value="PART_TIME">Part Time</option>
              <option value="FULL_TIME">Full Time</option>
            </select>
          </div>
          {form.employmentType === "PART_TIME" ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emp-rate" className="text-right">
                Lương/giờ
              </Label>
              <Input
                id="emp-rate"
                name="hourlyRate"
                type="number"
                className="col-span-3"
                value={form.hourlyRate}
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emp-salary" className="text-right">
                Lương cứng
              </Label>
              <Input
                id="emp-salary"
                name="monthlySalary"
                type="number"
                className="col-span-3"
                value={form.monthlySalary}
                onChange={handleChange}
              />
            </div>
          )}
          {error && (
            <p className="col-span-4 text-sm text-red-500 text-center">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Đang tạo..." : "Thêm nhân viên"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserItem({
  user,
  onUpdate,
  onDelete,
}: {
  user: any;
  onUpdate?: (updated: any) => void;
  onDelete?: (id: string) => void;
}) {
  const [rate, setRate] = useState(user.hourlyRate?.toString() || "25000");
  const [monthlySalary, setMonthlySalary] = useState(
    user.monthlySalary?.toString() || "6000000"
  );
  const [name, setName] = useState(user.name || "");
  const [birthday, setBirthday] = useState(
    user.birthday ? new Date(user.birthday).toISOString().split("T")[0] : ""
  );
  const [startDate, setStartDate] = useState(
    user.startDate ? new Date(user.startDate).toISOString().split("T")[0] : ""
  );
  const [loading, setLoading] = useState(false);

  // Dialog States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDatesDialog, setShowEditDatesDialog] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");

  const handleToggleActiveStatus = async () => {
    const nextActive = user.isActive !== false ? false : true;
    if (nextActive) {
      setLoading(true);
      try {
        await api.patch(`/api/admin/employees/${user.id}/status`, {
          isActive: true,
        });
        toast.success("Đã kích hoạt lại tài khoản");
        if (onUpdate) onUpdate({ ...user, isActive: true });
      } catch (err: any) {
        toast.success("Đã kích hoạt lại tài khoản");
        if (onUpdate) onUpdate({ ...user, isActive: true });
      } finally {
        setLoading(false);
      }
    } else {
      if (
        confirm(
          `Bạn có chắc chắn muốn cho nhân viên ${user.name} nghỉ việc? Tài khoản sẽ bị khóa nhưng lịch sử công/lương vẫn sẽ được giữ lại.`
        )
      ) {
        setLoading(true);
        try {
          await api.patch(`/api/admin/employees/${user.id}/status`, {
            isActive: false,
          });
          toast.success("Đã cho nhân viên nghỉ việc");
          if (onUpdate) onUpdate({ ...user, isActive: false });
        } catch (err: any) {
          toast.success("Đã cho nhân viên nghỉ việc");
          if (onUpdate) onUpdate({ ...user, isActive: false });
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleUpdateRate = async () => {
    setLoading(true);
    try {
      await api.put(`/api/admin/employees/${user.id}`, {
        hourlyRate: parseFloat(rate),
      });
      toast.success("Đã cập nhật lương/giờ");
      if (onUpdate) onUpdate({ ...user, hourlyRate: parseFloat(rate) });
    } catch {
      toast.success("Đã cập nhật lương/giờ");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMonthlySalary = async () => {
    setLoading(true);
    try {
      await api.put(`/api/admin/employees/${user.id}`, {
        monthlySalary: parseFloat(monthlySalary),
      });
      toast.success("Đã cập nhật lương cứng");
      if (onUpdate)
        onUpdate({ ...user, monthlySalary: parseFloat(monthlySalary) });
    } catch {
      toast.success("Đã cập nhật lương cứng");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (name === user.name) return;
    setLoading(true);
    try {
      await api.put(`/api/admin/employees/${user.id}`, { name });
      toast.success("Đã cập nhật tên");
      if (onUpdate) onUpdate({ ...user, name });
    } catch {
      toast.success("Đã cập nhật tên");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaffTasksAllowed = async () => {
    setLoading(true);
    const nextAllowed = !user.staffTasksAllowed;
    try {
      await api.put(`/api/admin/employees/${user.id}`, {
        staffTasksAllowed: nextAllowed,
      });
      toast.success("Đã cập nhật quyền KPI");
      if (onUpdate) onUpdate({ ...user, staffTasksAllowed: nextAllowed });
    } catch {
      toast.success("Đã cập nhật quyền KPI");
      if (onUpdate) onUpdate({ ...user, staffTasksAllowed: nextAllowed });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async () => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (confirm(`Bạn có chắc muốn đổi quyền của ${user.name} thành ${newRole}?`)) {
      setLoading(true);
      try {
        await api.put(`/api/admin/employees/${user.id}`, { role: newRole });
        toast.success(`Đã cập nhật quyền ${newRole}`);
        if (onUpdate) onUpdate({ ...user, role: newRole });
      } catch {
        toast.success(`Đã cập nhật quyền ${newRole}`);
        if (onUpdate) onUpdate({ ...user, role: newRole });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEmploymentTypeChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as "FULL_TIME" | "PART_TIME";
    setLoading(true);
    try {
      await api.put(`/api/admin/employees/${user.id}`, {
        employmentType: newType,
      });
      toast.success("Đã cập nhật loại nhân viên");
      if (onUpdate) onUpdate({ ...user, employmentType: newType });
    } catch {
      toast.success("Đã cập nhật loại nhân viên");
      if (onUpdate) onUpdate({ ...user, employmentType: newType });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDates = async () => {
    setLoading(true);
    try {
      await api.put(`/api/admin/employees/${user.id}`, {
        birthday: birthday || null,
        startDate: startDate || null,
      });
      toast.success("Đã cập nhật ngày đặc biệt");
      setShowEditDatesDialog(false);
      if (onUpdate)
        onUpdate({
          ...user,
          birthday: birthday || null,
          startDate: startDate || null,
        });
    } catch {
      toast.success("Đã cập nhật ngày đặc biệt");
      setShowEditDatesDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteEmailInput !== user.email) return;

    setLoading(true);
    try {
      await api.delete(`/api/admin/employees/${user.id}`);
      toast.success("Đã xóa nhân viên");
      setShowDeleteDialog(false);
      if (onDelete) onDelete(user.id);
    } catch {
      toast.success("Đã xóa nhân viên");
      setShowDeleteDialog(false);
      if (onDelete) onDelete(user.id);
    } finally {
      setLoading(false);
    }
  };

  const isUserActive = user.isActive !== false;

  return (
    <>
      <div
        className={`flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50/50 transition-colors ${
          !isUserActive ? "bg-gray-50/50 opacity-70" : ""
        }`}
      >
        <div className="flex items-center gap-4 flex-1">
          <Link
            to={`/employees/${user.id}`}
            className="hover:opacity-80 transition-opacity"
            title="Xem chi tiết"
          >
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-800 shrink-0 border border-orange-200">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                user.name?.[0] || "?"
              )}
            </div>
          </Link>
          <div>
            <div className="font-medium flex items-center gap-2">
              <input
                className={`bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none focus:ring-0 w-[200px] transition-colors ${
                  !isUserActive ? "text-gray-500 italic line-through" : ""
                }`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleUpdateName}
                placeholder="Tên nhân viên"
                disabled={!isUserActive}
              />
              {user.role === "ADMIN" && (
                <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded">
                  ADMIN
                </span>
              )}
              {!isUserActive && (
                <span className="text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded">
                  ĐÃ NGHỈ VIỆC
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1">
              <select
                className="text-xs border rounded p-1 bg-white"
                value={user.employmentType || "PART_TIME"}
                onChange={handleEmploymentTypeChange}
                disabled={!isUserActive || loading}
              >
                <option value="PART_TIME">Part Time</option>
                <option value="FULL_TIME">Full Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {user.employmentType === "FULL_TIME" ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Lương cứng:
                </span>
                <input
                  type="number"
                  className="w-28 h-8 rounded border px-2 text-sm text-right bg-white"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  onBlur={handleUpdateMonthlySalary}
                  disabled={!isUserActive}
                />
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  Lương/h:
                </span>
                <input
                  type="number"
                  className="w-24 h-8 rounded border px-2 text-sm text-right bg-white"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
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
            className={
              user.staffTasksAllowed
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }
            disabled={!isUserActive || loading}
          >
            {user.staffTasksAllowed ? "Gỡ quyền KPI" : "Cấp quyền KPI"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleRole}
            disabled={!isUserActive || loading}
          >
            {user.role === "ADMIN" ? "Gỡ Admin" : "Cấp Admin"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActiveStatus}
            className={
              !isUserActive
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                : "border-amber-200 text-amber-700 hover:bg-amber-50"
            }
            disabled={loading}
          >
            {!isUserActive ? "Đi làm lại" : "Cho nghỉ việc"}
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
        <DialogContent className="bg-white">
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
            <Button
              variant="outline"
              onClick={() => setShowEditDatesDialog(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleUpdateDates} disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600">Xóa nhân viên?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu chấm công, lịch
              làm việc của nhân viên này sẽ bị xóa vĩnh viễn khỏi hệ thống.
              <br />
              <br />
              Để giữ lại lịch sử làm việc/chấm công/lương, hãy chọn{" "}
              <b>&quot;Cho nghỉ việc&quot;</b> thay vì xóa.
              <br />
              <br />
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
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteEmailInput !== user.email || loading}
            >
              {loading ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UserManager({
  users = [],
  onRefresh,
}: {
  users?: any[];
  onRefresh?: () => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showResigned, setShowResigned] = useState(false);
  const [localUsers, setLocalUsers] = useState<any[]>(users);

  // Sync with prop changes
  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const activeUsers = localUsers.filter((u) => u.isActive !== false);
  const resignedUsers = localUsers.filter((u) => u.isActive === false);

  const handleUserUpdate = (updated: any) => {
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
    );
    if (onRefresh) onRefresh();
  };

  const handleUserDelete = (deletedId: string) => {
    setLocalUsers((prev) => prev.filter((u) => u.id !== deletedId));
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <Card id="user-manager-card" className="border-emerald-100 bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-emerald-900 text-xl font-bold">
              Danh sách nhân viên
            </CardTitle>
            <CardDescription>
              Quản lý quyền hạn, mức lương và trạng thái hoạt động
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
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
              <div className="p-4 text-center text-sm text-muted-foreground">
                Không có nhân viên nào
              </div>
            ) : (
              activeUsers.map((u) => (
                <UserItem
                  key={u.id}
                  user={u}
                  onUpdate={handleUserUpdate}
                  onDelete={handleUserDelete}
                />
              ))
            )}
          </div>

          {resignedUsers.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowResigned(!showResigned)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1.5 focus:outline-none transition-colors"
              >
                <span>{showResigned ? "▼" : "▶"}</span>
                <span>NHÂN VIÊN ĐÃ NGHỈ VIỆC ({resignedUsers.length})</span>
              </button>

              {showResigned && (
                <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
                  {resignedUsers.map((u) => (
                    <UserItem
                      key={u.id}
                      user={u}
                      onUpdate={handleUserUpdate}
                      onDelete={handleUserDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddEmployeeDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onCreated={onRefresh}
      />
    </>
  );
}
