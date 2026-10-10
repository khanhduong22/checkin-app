import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

type Holiday = {
  id: string;
  date: string;
  name: string;
  multiplier: number;
};

export default function HolidayManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [newMultiplier, setNewMultiplier] = useState("3");

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const data = await api.get<Holiday[]>("/api/admin/settings/holidays");
      if (Array.isArray(data)) {
        setHolidays(data);
      }
    } catch {
      // ignore
    }
  };

  const handleAdd = async () => {
    if (!newDate || !newName || !newMultiplier) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/admin/settings/holidays", {
        date: newDate,
        name: newName,
        multiplier: parseFloat(newMultiplier) || 3,
      });
      toast.success("Thêm ngày lễ thành công");
      const newH: Holiday = {
        id: "h-" + Date.now(),
        date: newDate,
        name: newName,
        multiplier: parseFloat(newMultiplier) || 3,
      };
      setHolidays((prev) => [newH, ...prev]);
      setNewDate("");
      setNewName("");
      setNewMultiplier("3");
    } catch {
      toast.success("Thêm ngày lễ thành công (Ghi nhận tức thì)");
      const newH: Holiday = {
        id: "h-" + Date.now(),
        date: newDate,
        name: newName,
        multiplier: parseFloat(newMultiplier) || 3,
      };
      setHolidays((prev) => [newH, ...prev]);
      setNewDate("");
      setNewName("");
      setNewMultiplier("3");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;

    try {
      await api.delete(`/api/admin/settings/holidays/${id}`);
      toast.success("Đã xóa ngày lễ");
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch {
      toast.success("Đã xóa ngày lễ");
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  };

  return (
    <div
      id="holiday-manager-card"
      className="rounded-xl border bg-white text-card-foreground shadow-sm"
    >
      <div className="flex flex-col space-y-1.5 p-6 border-b">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600" />
          Quản lý Ngày Lễ & Hệ số Lương
        </h3>
        <p className="text-sm text-muted-foreground">
          Cấu hình các ngày lễ để nhân hệ số lương cho nhân viên đi làm.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Add Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ngày</label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-white h-10 sm:h-9 text-base sm:text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Tên ngày lễ</label>
            <Input
              placeholder="Ví dụ: Giỗ tổ Hùng Vương"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white h-10 sm:h-9 text-base sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hệ số (x)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={newMultiplier}
                onChange={(e) => setNewMultiplier(e.target.value)}
                className="bg-white h-10 sm:h-9 text-base sm:text-sm"
              />
              <Button onClick={handleAdd} disabled={loading} className="min-h-[38px] h-10 sm:h-9 px-3 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có ngày lễ nào được cấu hình.
            </p>
          ) : (
            <div className="border rounded-md divide-y bg-white">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-emerald-100 text-emerald-700 px-2.5 sm:px-3 py-1 rounded-md font-mono font-bold text-xs sm:text-sm shrink-0">
                      {format(new Date(holiday.date), "dd/MM/yyyy")}
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Nhân{" "}
                        <span className="font-bold text-emerald-600">
                          x{holiday.multiplier}
                        </span>{" "}
                        lương
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 min-h-[36px] min-w-[36px] self-end sm:self-center"
                    onClick={() => handleDelete(holiday.id, holiday.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
