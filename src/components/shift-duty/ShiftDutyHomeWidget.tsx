"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  getTodayShiftDutiesWithTeammates, 
  toggleCompleteShiftDuty, 
  createShiftDuty, 
  deleteShiftDuty 
} from "@/actions/shift-duty-actions";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Circle, 
  Users, 
  User as UserIcon, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Sparkles, 
  Clock, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ShiftDutyHomeWidgetProps {
  currentUserId: string;
  isAdmin: boolean;
  activeUsers?: { id: string; name: string | null; email: string | null }[];
}

export default function ShiftDutyHomeWidget({
  currentUserId,
  isAdmin,
  activeUsers = [],
}: ShiftDutyHomeWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"MY_DUTIES" | "TEAMMATES">("MY_DUTIES");
  const [loading, setLoading] = useState(false);
  const [myDuties, setMyDuties] = useState<any[]>([]);
  const [colleagues, setColleagues] = useState<any[]>([]);

  // Admin Quick Add State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addAssigneeId, setAddAssigneeId] = useState(currentUserId);
  const [savingDuty, setSavingDuty] = useState(false);

  const fetchDuties = async () => {
    setLoading(true);
    try {
      const res = await getTodayShiftDutiesWithTeammates(currentUserId);
      if (res.success && res.data) {
        setMyDuties(res.data.myDuties);
        setColleagues(res.data.colleagues);
      }
    } catch (err) {
      console.error("Error fetching shift duties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuties();
  }, [currentUserId]);

  const handleToggle = async (id: string) => {
    // Optimistic UI update
    setMyDuties((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, isCompleted: !d.isCompleted } : d
      )
    );

    const res = await toggleCompleteShiftDuty(id);
    if (!res.success) {
      toast.error(res.error || "Không thể cập nhật trạng thái");
      fetchDuties(); // rollback
    } else {
      toast.success(
        res.data?.isCompleted
          ? "✅ Đã đánh dấu hoàn thành!"
          : "Đã chuyển về chưa hoàn thành"
      );
    }
  };

  const handleCreate = async () => {
    if (!addTitle.trim()) {
      toast.error("Vui lòng nhập tên công việc");
      return;
    }
    setSavingDuty(true);
    const res = await createShiftDuty({
      title: addTitle.trim(),
      description: addDesc.trim() || null,
      userId: addAssigneeId,
      date: new Date(),
    });
    setSavingDuty(false);

    if (res.success) {
      toast.success("Đã giao nhiệm vụ thành công!");
      setAddTitle("");
      setAddDesc("");
      setShowAddForm(false);
      fetchDuties();
    } else {
      toast.error(res.error || "Lỗi khi giao việc");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ "${title}" không? (Thao tác dành cho Admin thu hồi nếu giao nhầm)`)) return;
    const res = await deleteShiftDuty(id);
    if (res.success) {
      toast.success("Đã xóa nhiệm vụ!");
      fetchDuties();
    } else {
      toast.error(res.error || "Không thể xóa nhiệm vụ");
    }
  };

  const completedCount = myDuties.filter((d) => d.isCompleted).length;
  const totalMyDuties = myDuties.length;

  return (
    <>
      {/* Home Button Widget */}
      <button
        type="button"
        onClick={() => {
          setActiveTab("MY_DUTIES");
          setModalOpen(true);
          fetchDuties();
        }}
        className="w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl p-3.5 shadow-md hover:shadow-lg transition-all text-left flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shrink-0 shadow-inner">
            📋
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              Nhiệm vụ ca làm việc
              {totalMyDuties > 0 && (
                <span className="bg-white/25 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {completedCount}/{totalMyDuties} xong
                </span>
              )}
            </div>
            <div className="text-xs text-emerald-100 font-normal">
              {totalMyDuties > 0
                ? `Bạn có ${totalMyDuties} nhiệm vụ hôm nay • Bấm để xem chi tiết`
                : "Xem nhiệm vụ của bạn & đồng nghiệp trong ca hôm nay"}
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
      </button>

      {/* Main Shift Duty Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border-emerald-100">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white relative">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📋</span> Nhiệm vụ ca làm việc hôm nay
                </DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                  Theo dõi công việc cá nhân và phối hợp cùng đồng nghiệp trong ca
                </DialogDescription>
              </div>
              {isAdmin && !showAddForm && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs bg-white text-emerald-800 hover:bg-emerald-50 font-bold gap-1 shadow-sm shrink-0"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Giao việc
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4 bg-emerald-950/25 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("MY_DUTIES")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  activeTab === "MY_DUTIES"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-emerald-100 hover:text-white hover:bg-white/10"
                )}
              >
                <UserIcon className="h-3.5 w-3.5" /> Việc của tôi ({totalMyDuties})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("TEAMMATES")}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  activeTab === "TEAMMATES"
                    ? "bg-white text-emerald-900 shadow-sm"
                    : "text-emerald-100 hover:text-white hover:bg-white/10"
                )}
              >
                <Users className="h-3.5 w-3.5" /> Cả ca làm ({colleagues.length + 1} người)
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {/* Admin Quick Add Form */}
            {isAdmin && showAddForm && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-700" /> Giao nhiệm vụ mới cho ca hôm nay
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    Đóng
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Giao cho nhân viên <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={addAssigneeId}
                    onChange={(e) => setAddAssigneeId(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-white text-xs"
                  >
                    {activeUsers.length > 0 ? (
                      activeUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))
                    ) : (
                      <option value={currentUserId}>Tôi (Chính mình)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Tên công việc <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="VD: Kiểm tra quầy hàng, kiểm kê date bánh, đóng đơn..."
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    className="h-8 text-xs bg-white"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Mô tả chi tiết công việc
                  </Label>
                  <Textarea
                    placeholder="Yêu cầu cụ thể, lưu ý cần làm..."
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    className="text-xs bg-white resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddForm(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={handleCreate}
                    disabled={savingDuty}
                  >
                    {savingDuty ? "Đang lưu..." : "Lưu & Giao việc"}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 1: MY DUTIES */}
            {activeTab === "MY_DUTIES" && (
              <div className="space-y-3">
                {myDuties.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed rounded-xl p-4 space-y-2">
                    <span className="text-3xl block">✨</span>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Bạn chưa có nhiệm vụ nào được giao hôm nay!
                    </h4>
                    <p className="text-xs text-slate-500">
                      Chúc bạn một ca làm việc vui vẻ, tập trung và năng suất.
                    </p>
                  </div>
                ) : (
                  myDuties.map((duty, idx) => (
                    <div
                      key={duty.id}
                      className={cn(
                        "border rounded-xl p-3.5 bg-white shadow-2xs transition-all space-y-2",
                        duty.isCompleted
                          ? "border-emerald-200 bg-emerald-50/20"
                          : "border-slate-200 hover:border-emerald-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-start gap-2.5 flex-1 cursor-pointer"
                          onClick={() => handleToggle(duty.id)}
                        >
                          <button
                            type="button"
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                              duty.isCompleted
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 hover:border-emerald-500 bg-white"
                            )}
                          >
                            {duty.isCompleted ? (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            ) : null}
                          </button>
                          <div>
                            <h4
                              className={cn(
                                "font-bold text-sm leading-snug",
                                duty.isCompleted
                                  ? "line-through text-slate-400"
                                  : "text-slate-900"
                              )}
                            >
                              {duty.title}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-semibold",
                              duty.isCompleted
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            )}
                          >
                            {duty.isCompleted ? "✅ Đã xong" : "⏳ Chưa xong"}
                          </Badge>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(duty.id, duty.title)}
                              title="Xóa nhiệm vụ (nếu giao nhầm)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {duty.description && (
                        <div className="text-xs text-slate-600 bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 leading-relaxed whitespace-pre-wrap ml-7.5">
                          <span className="font-semibold text-slate-700 block mb-0.5 text-[11px]">
                            Mô tả chi tiết:
                          </span>
                          {duty.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: TEAMMATES IN SAME SHIFT (Hiển thị mặc định) */}
            {activeTab === "TEAMMATES" && (
              <div className="space-y-4">
                {/* Banner tóm tắt nhiệm vụ của bạn kèm nút chuyển nhanh */}
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📌</span>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        Nhiệm vụ của bạn: {completedCount}/{totalMyDuties} hoàn thành
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {totalMyDuties > 0
                          ? "Bấm 'Việc của tôi' để tích hoàn thành nhiệm vụ cá nhân"
                          : "Bạn chưa có nhiệm vụ nào được giao hôm nay"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-bold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100 shrink-0 shadow-2xs"
                    onClick={() => setActiveTab("MY_DUTIES")}
                  >
                    Việc của tôi
                  </Button>
                </div>

                {colleagues.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed rounded-xl p-4 text-xs text-slate-500">
                    Không có đồng nghiệp nào khác đăng ký ca hôm nay.
                  </div>
                ) : (
                  colleagues.map((colleague) => (
                    <div
                      key={colleague.user.id}
                      className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                            {colleague.user.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              {colleague.user.name || colleague.user.email}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {colleague.shiftTime}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {colleague.duties.length} việc
                        </Badge>
                      </div>

                      {/* Colleagues Duty Items */}
                      {colleague.duties.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">
                          Chưa có nhiệm vụ cụ thể được giao cho bạn này.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {colleague.duties.map((duty: any) => (
                            <div
                              key={duty.id}
                              className="text-xs bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={cn(
                                    "font-semibold",
                                    duty.isCompleted
                                      ? "line-through text-slate-400"
                                      : "text-slate-800"
                                  )}
                                >
                                  {duty.isCompleted ? "✅ " : "▫️ "} {duty.title}
                                </span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(duty.id, duty.title)}
                                    className="text-slate-400 hover:text-red-600 text-[10px]"
                                    title="Xóa nhiệm vụ"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {duty.description && (
                                <p className="text-[11px] text-slate-500 pl-4 whitespace-pre-wrap">
                                  {duty.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-3 bg-white border-t flex flex-row justify-end">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="text-xs h-9 font-semibold"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
