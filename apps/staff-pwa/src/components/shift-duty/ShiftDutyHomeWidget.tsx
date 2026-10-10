import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Circle, Users, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCompleteShiftDuty, ShiftDutyItem } from "@/lib/api-client";
import { toast } from "sonner";

interface ShiftDutyHomeWidgetProps {
  currentUserId?: string;
  isAdmin?: boolean;
  duties?: ShiftDutyItem[];
  activeUsers?: { id: string; name: string | null; email: string | null; duties?: ShiftDutyItem[] }[];
}

export default function ShiftDutyHomeWidget({
  currentUserId,
  isAdmin = false,
  duties = [],
  activeUsers = [],
}: ShiftDutyHomeWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"MY_DUTIES" | "TEAMMATES">("MY_DUTIES");
  const [localDuties, setLocalDuties] = useState<ShiftDutyItem[]>(duties);

  React.useEffect(() => {
    setLocalDuties(duties);
  }, [duties]);

  const handleToggle = async (id: string) => {
    setLocalDuties((prev) =>
      (prev || []).map((d) => (d.id === id ? { ...d, isCompleted: !d.isCompleted } : d))
    );

    const res = await toggleCompleteShiftDuty(id);
    if (!res.success) {
      toast.error(res.error || "Không thể cập nhật");
    } else {
      toast.success(
        res.data?.isCompleted
          ? "✅ Đã hoàn thành nhiệm vụ!"
          : "Đã hủy đánh dấu hoàn thành"
      );
    }
  };

  const completedCount = (localDuties || []).filter((d) => d.isCompleted).length;
  const totalTeamDuties = (activeUsers || []).reduce(
    (acc, c) => acc + (c.duties?.length || 0),
    0
  );

  const handleOpenModal = () => {
    const shouldDefaultToTeammates = (localDuties || []).length === 0 && totalTeamDuties > 0;
    setActiveTab(shouldDefaultToTeammates ? "TEAMMATES" : "MY_DUTIES");
    setModalOpen(true);
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            📋
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Nhiệm vụ ca làm việc</h3>
            <p className="text-[11px] text-gray-500">
              {(localDuties || []).length > 0
                ? `Hoàn thành ${completedCount}/${(localDuties || []).length} công việc`
                : totalTeamDuties > 0
                ? `${totalTeamDuties} việc trong ca của đồng nghiệp`
                : "Xem nhiệm vụ của ca làm"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenModal}
          className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
        >
          Xem chi tiết
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {(localDuties || []).length === 0 ? (
        <div className="text-center py-3 bg-gray-50/50 rounded-lg text-xs text-gray-400">
          Chưa có nhiệm vụ đặc biệt nào được giao cho ca hôm nay.
        </div>
      ) : (
        <div className="space-y-1.5">
          {(localDuties || []).slice(0, 3).map((d) => (
            <div
              key={d.id}
              onClick={() => handleToggle(d.id)}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 hover:bg-gray-100/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" className="text-slate-400 hover:text-emerald-600">
                  {d.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs truncate",
                    d.isCompleted ? "line-through text-slate-400" : "text-slate-800 font-medium"
                  )}
                >
                  {d.title}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 shrink-0">
                {d.isCompleted ? "Xong" : "Chờ"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span>📋</span> Danh sách nhiệm vụ ca trực
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nhấn vào từng nhiệm vụ để đánh dấu hoàn thành hoặc xem đồng nghiệp trong ca.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selector: Default MY_DUTIES */}
          <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("MY_DUTIES")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === "MY_DUTIES"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>Việc của tôi ({(localDuties || []).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TEAMMATES")}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === "TEAMMATES"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cả ca làm ({(activeUsers || []).length})</span>
            </button>
          </div>

          <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
            {activeTab === "MY_DUTIES" ? (
              (localDuties || []).length === 0 ? (
                <div className="space-y-3">
                  {totalTeamDuties > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">👥</span>
                        <div className="text-xs text-emerald-950 font-medium">
                          Ca hôm nay có <span className="font-bold">{totalTeamDuties}</span> việc của đồng nghiệp.
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-bold border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100 shrink-0 cursor-pointer"
                        onClick={() => setActiveTab("TEAMMATES")}
                      >
                        Xem cả ca
                      </Button>
                    </div>
                  )}
                  <div className="text-center py-6 text-xs text-stone-400">
                    Không có nhiệm vụ nào được giao cho bạn ca hôm nay.
                  </div>
                </div>
              ) : (
                (localDuties || []).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleToggle(d.id)}
                    className={cn(
                      "p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all",
                      d.isCompleted
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-white border-slate-200 hover:border-emerald-300"
                    )}
                  >
                    <button type="button" className="mt-0.5">
                      {d.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          d.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                        )}
                      >
                        {d.title}
                      </p>
                      {d.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              (activeUsers || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-400">
                  Chưa có nhân viên nào khác trong ca này.
                </div>
              ) : (
                (activeUsers || []).map((u) => (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl border border-stone-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                        {(u.name || "U")[0]}
                      </div>
                      <span className="font-semibold text-stone-900">{u.name || u.email || "Nhân viên"}</span>
                    </div>
                    {u.id === currentUserId && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Bạn
                      </span>
                    )}
                  </div>
                ))
              )
            )}
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer"
              onClick={() => setModalOpen(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
