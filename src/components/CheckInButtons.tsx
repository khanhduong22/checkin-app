'use client';

import { performCheckIn, getIPStatus } from "@/app/actions";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner"; // Use sonner

// ... Keep HistoryList as is ...
function HistoryList({ checkins }: { checkins: any[] }) {
    if (checkins.length === 0) return null;
    return (
        <div className="mt-8">
             <h3 className="mb-4 text-sm font-medium text-muted-foreground">Lịch sử hôm nay</h3>
             <div className="rounded-md border">
                {checkins.map((c, i) => (
                    <div key={c.id} className={cn("flex items-center justify-between p-4", i !== checkins.length - 1 && "border-b")}>
                        <div className="flex items-center gap-4">
                             <div className={cn("h-2.5 w-2.5 rounded-full", c.type === 'checkin' ? "bg-emerald-500" : "bg-orange-500")} />
                             <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                    {c.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                </span>
                             </div>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">
                             {new Date(c.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                ))}
             </div>
        </div>
    )
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ChevronRight, CheckCircle2, Circle, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { getTodayUserShiftDuties, toggleCompleteShiftDuty } from "@/actions/shift-duty-actions";

export default function CheckInButtons({ userId, todayCheckins, todayShift }: { userId: string, todayCheckins: any[], todayShift?: any }) {
    const [loading, setLoading] = useState(false);
    const [ipStatus, setIpStatus] = useState<{ isAllowed: boolean, locationName: string, ip: string } | null>(null);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [todayDuties, setTodayDuties] = useState<any[]>([]);
    const [dutyModalOpen, setDutyModalOpen] = useState(false);
    const [uncompletedWarningOpen, setUncompletedWarningOpen] = useState(false);

    useEffect(() => {
        getIPStatus()
            .then(setIpStatus)
            .catch(err => {
                console.error("Error loading IP status:", err);
                setIpStatus({
                    isAllowed: false,
                    locationName: "Lỗi kết nối IP",
                    ip: "Không rõ"
                });
            });

        // Load today's assigned shift duties
        getTodayUserShiftDuties(userId)
            .then(res => {
                if (res.success && res.data) {
                    setTodayDuties(res.data);
                }
            })
            .catch(err => console.error("Error loading today shift duties:", err));
    }, [userId]);

    const executeCheckIn = async (type: 'checkin' | 'checkout', note?: string) => {
        setLoading(true);
        try {
            const result = await performCheckIn(userId, type, note);
            if (result.success) {
                toast.success(result.message);
                setReason(""); // Reset reason
                if (type === 'checkin') {
                    const duties = (result as any).todayDuties || [];
                    setTodayDuties(duties);
                    setDutyModalOpen(true);
                } else {
                    // Refresh duties after checkout
                    getTodayUserShiftDuties(userId).then(r => r.success && setTodayDuties(r.data || []));
                }
            } else {
                toast.error(result.message);
            }
        } catch (e) {
            toast.error('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    };

    const proceedWithCheckout = async () => {
        if (todayShift) {
            const now = new Date();
            const shiftEnd = new Date(todayShift.end);
            if (now < shiftEnd) {
                // Early checkout
                setReasonModalOpen(true);
                return;
            }
        }
        await executeCheckIn('checkout');
    };

    const handleAction = async (type: 'checkin' | 'checkout') => {
        if (ipStatus && !ipStatus.isAllowed) {
            toast.error(`❌ IP không hợp lệ (${ipStatus.ip}).`, {
                description: "Vui lòng kết nối Wifi công ty."
            });
            return;
        }

        if (type === 'checkin') {
            await executeCheckIn('checkin');
            return;
        }

        if (type === 'checkout') {
            // Cách 2: Cảnh báo nhẹ / Nhắc nhở nếu còn nhiệm vụ chưa hoàn thành
            const uncompleted = todayDuties.filter(d => !d.isCompleted);
            if (uncompleted.length > 0) {
                setUncompletedWarningOpen(true);
                return;
            }
            await proceedWithCheckout();
        }
    };

    const confirmEarlyCheckout = () => {
        if (!reason.trim()) {
            toast.error("Vui lòng nhập lý do về sớm!");
            return;
        }
        setReasonModalOpen(false);
        executeCheckIn('checkout', reason);
    };

    const handleToggleDuty = async (dutyId: string) => {
        const res = await toggleCompleteShiftDuty(dutyId);
        if (res.success && res.data) {
            setTodayDuties(prev => prev.map(d => d.id === dutyId ? { ...d, isCompleted: res.data.isCompleted } : d));
            toast.success(res.data.isCompleted ? "✅ Đã hoàn thành nhiệm vụ!" : "Đã hủy đánh dấu hoàn thành");
        } else {
            toast.error(res.error || "Không thể cập nhật trạng thái");
        }
    };

    const completedCount = todayDuties.filter(d => d.isCompleted).length;
    const uncompletedDuties = todayDuties.filter(d => !d.isCompleted);

    return (
        <div className="space-y-4">
            {/* Wifi Status Badge */}
            <div className="flex flex-col items-center gap-1.5">
                {!ipStatus ? (
                    <div className="h-6 w-32 bg-gray-200 animate-pulse rounded-full" />
                ) : (
                    <>
                        <Badge variant={ipStatus.isAllowed ? "default" : "destructive"} className={cn("px-3 py-1 flex items-center gap-1.5", ipStatus.isAllowed ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200" : "")}>
                            {ipStatus.isAllowed ? (
                                <>
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    {ipStatus.locationName}
                                </>
                            ) : (
                                 <>🚫 {ipStatus.locationName}</>
                            )}
                        </Badge>
                        {!ipStatus.isAllowed && (
                            <div className="text-[10px] font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 max-w-full break-all text-center">
                                IP hiện tại: {ipStatus.ip}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={() => handleAction('checkin')}
                    disabled={loading}
                    className="h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                    📍 Check-in
                </Button>
                <Button
                    onClick={() => handleAction('checkout')}
                    disabled={loading}
                    variant="outline"
                    className="h-12 text-sm font-semibold border-2 hover:bg-slate-50 shadow-sm"
                >
                    👋 Check-out
                </Button>
            </div>

            {/* Quick Button to re-open Today Duties Popup */}
            {todayDuties.length > 0 && (
                <div className="pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDutyModalOpen(true)}
                        className="w-full bg-gradient-to-r from-emerald-50/90 to-teal-50/90 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 text-emerald-950 rounded-xl p-3 h-auto shadow-2xs flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-2.5 text-left">
                            <span className="text-xl">📋</span>
                            <div>
                                <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-950">
                                    Nhiệm vụ ca làm hôm nay
                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                                        {completedCount}/{todayDuties.length} xong
                                    </Badge>
                                </div>
                                <div className="text-[11px] text-emerald-700/90 font-normal">
                                    Nhấn để xem và tích hoàn thành nhiệm vụ
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                </div>
            )}

            {loading && <div className="mt-4 text-center text-xs text-muted-foreground animate-pulse">Đang xử lý...</div>}

            <HistoryList checkins={todayCheckins} />

            {/* Check-in Shift Duty Popup Dialog */}
            <Dialog open={dutyModalOpen} onOpenChange={setDutyModalOpen}>
                <DialogContent className="max-w-md max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border-emerald-100 shadow-2xl">
                    <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white text-center relative overflow-hidden">
                        <div className="mx-auto w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner mb-2 animate-bounce">
                            🎯
                        </div>
                        <DialogTitle className="text-lg font-bold text-white tracking-tight">
                            Check-in thành công!
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100 text-xs mt-1 font-medium">
                            {todayDuties.length > 0 
                                ? "Nhiệm vụ của bạn hôm nay là:" 
                                : "Chào mừng bạn đến với ca làm hôm nay!"}
                        </DialogDescription>
                    </div>

                    <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/40">
                        {todayDuties.length === 0 ? (
                            <div className="text-center py-6 px-4 space-y-2 bg-white rounded-xl border border-dashed border-slate-200">
                                <span className="text-3xl block">✨</span>
                                <p className="font-bold text-slate-800 text-sm">Hôm nay bạn không có nhiệm vụ đặc biệt nào!</p>
                                <p className="text-xs text-slate-500">Chúc bạn có một ca làm việc vui vẻ, tập trung và tràn đầy năng lượng.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-slate-500 flex items-center justify-between px-1">
                                    <span>Danh sách nhiệm vụ ({todayDuties.length})</span>
                                    <span className="text-[11px] text-emerald-600 font-medium">
                                        Đã xong {completedCount}/{todayDuties.length}
                                    </span>
                                </div>

                                {todayDuties.map((duty, idx) => (
                                    <div 
                                        key={duty.id} 
                                        onClick={() => handleToggleDuty(duty.id)}
                                        className={cn(
                                            "border rounded-xl p-3.5 bg-white shadow-2xs transition-all space-y-2 cursor-pointer select-none",
                                            duty.isCompleted 
                                                ? "border-emerald-200 bg-emerald-50/30" 
                                                : "border-slate-200/90 hover:border-emerald-300 hover:shadow-xs"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5">
                                                <button
                                                    type="button"
                                                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleDuty(duty.id);
                                                    }}
                                                >
                                                    {duty.isCompleted ? (
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                                                    ) : (
                                                        <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-500" />
                                                    )}
                                                </button>
                                                <div>
                                                    <h4 className={cn(
                                                        "font-bold text-sm leading-snug transition-all",
                                                        duty.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                                                    )}>
                                                        {duty.title}
                                                    </h4>
                                                </div>
                                            </div>
                                            <Badge 
                                                variant="outline" 
                                                className={cn(
                                                    "text-[10px] px-2 py-0.5 shrink-0 font-semibold",
                                                    duty.isCompleted 
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {duty.isCompleted ? "✅ Đã xong" : "⏳ Chưa xong"}
                                            </Badge>
                                        </div>

                                        {duty.description && (
                                            <div className={cn(
                                                "text-xs rounded-lg p-2.5 border leading-relaxed whitespace-pre-wrap ml-7",
                                                duty.isCompleted 
                                                    ? "bg-slate-100/60 text-slate-400 border-slate-100" 
                                                    : "bg-slate-50 text-slate-600 border-slate-100"
                                            )}>
                                                <span className="font-semibold text-slate-700 block mb-0.5 text-[11px]">
                                                    Mô tả chi tiết:
                                                </span>
                                                {duty.description}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="text-[11px] text-center text-slate-400 pt-1">
                                    💡 Nhấn vào từng mục để đánh dấu hoàn thành nhiệm vụ
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-3 bg-white border-t flex flex-row gap-2 justify-end">
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9"
                            onClick={() => setDutyModalOpen(false)}
                        >
                            Đã hiểu & Bắt đầu ca làm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Option 2: Uncompleted Duties Warning on Checkout */}
            <Dialog open={uncompletedWarningOpen} onOpenChange={setUncompletedWarningOpen}>
                <DialogContent className="max-w-[420px] rounded-2xl border-amber-200">
                    <DialogHeader className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl">
                            ⚠️
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900">
                            Nhiệm vụ ca làm chưa hoàn thành!
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 leading-relaxed">
                            Bạn còn <span className="font-extrabold text-amber-700">{uncompletedDuties.length}</span> nhiệm vụ trong ca hôm nay chưa được đánh dấu hoàn thành. Bạn có chắc chắn muốn Check-out không?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-2 space-y-2 max-h-48 overflow-y-auto bg-amber-50/50 p-3 rounded-xl border border-amber-200/80">
                        {uncompletedDuties.map((d, idx) => (
                            <div key={d.id} className="text-xs text-amber-950 font-medium flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-amber-100">
                                <span className="font-bold text-amber-700 shrink-0">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900">{d.title}</p>
                                    {d.description && (
                                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                            {d.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t">
                        <Button 
                            variant="outline" 
                            className="flex-1 text-xs h-9 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"
                            onClick={() => {
                                setUncompletedWarningOpen(false);
                                setDutyModalOpen(true);
                            }}
                        >
                            📋 Kiểm tra nhiệm vụ
                        </Button>
                        <Button 
                            variant="destructive"
                            className="flex-1 text-xs h-9 font-bold bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                                setUncompletedWarningOpen(false);
                                proceedWithCheckout();
                            }}
                        >
                            Vẫn Check-out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Early Checkout Reason Dialog */}
            <Dialog open={reasonModalOpen} onOpenChange={setReasonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bạn đang về sớm!</DialogTitle>
                        <DialogDescription>
                            Chưa đến giờ tan ca theo lịch đăng ký. Vui lòng nhập lý do để được duyệt Check-out.
                            <br/>
                            <span className="font-bold text-emerald-600">Giờ tan ca: {todayShift && new Date(todayShift.end).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Lý do về sớm</Label>
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Nhập lý do..." 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReasonModalOpen(false)}>Hủy</Button>
                        <Button onClick={confirmEarlyCheckout}>Xác nhận & Check-out</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
