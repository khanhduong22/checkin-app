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

export default function CheckInButtons({ userId, todayCheckins, todayShift }: { userId: string, todayCheckins: any[], todayShift?: any }) {
    const [loading, setLoading] = useState(false);
    const [ipStatus, setIpStatus] = useState<{ isAllowed: boolean, locationName: string, ip: string } | null>(null);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [reason, setReason] = useState("");

    useEffect(() => {
        getIPStatus().then(setIpStatus);
    }, []);

    const executeCheckIn = async (type: 'checkin' | 'checkout', note?: string) => {
        setLoading(true);
        try {
            const result = await performCheckIn(userId, type, note);
            if (result.success) {
                toast.success(result.message);
                setReason(""); // Reset reason
            } else {
                toast.error(result.message);
            }
        } catch (e) {
            toast.error('Lỗi kết nối server');
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async (type: 'checkin' | 'checkout') => {
        if (ipStatus && !ipStatus.isAllowed) {
            toast.error(`❌ IP không hợp lệ (${ipStatus.ip}).`, {
                description: "Vui lòng kết nối Wifi công ty."
            });
            return;
        }

        // Logic check early checkout
        if (type === 'checkout' && todayShift) {
             const now = new Date();
             const shiftEnd = new Date(todayShift.end);
             
             // If checkout before shift end (with 10 mins tolerance? User didn't specify, strict is safer)
             // Let's enable strict check.
             if (now < shiftEnd) {
                 // Early checkout
                 setReasonModalOpen(true);
                 return;
             }
        }

        await executeCheckIn(type);
    };

    const confirmEarlyCheckout = () => {
        if (!reason.trim()) {
            toast.error("Vui lòng nhập lý do về sớm!");
            return;
        }
        setReasonModalOpen(false);
        executeCheckIn('checkout', reason);
    }

    return (
        <div className="space-y-4">
            {/* Wifi Status Badge */}
            <div className="flex justify-center">
                {!ipStatus ? (
                    <div className="h-6 w-32 bg-gray-200 animate-pulse rounded-full" />
                ) : (
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
                             <>🚫 {ipStatus.locationName} ({ipStatus.ip})</>
                        )}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button
                    onClick={() => handleAction('checkin')}
                    disabled={loading}
                    className="h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700"
                >
                    📍 Check-in
                </Button>
                <Button
                    onClick={() => handleAction('checkout')}
                    disabled={loading}
                    variant="outline"
                    className="h-12 text-sm font-semibold border-2"
                >
                    👋 Check-out
                </Button>
            </div>

            {loading && <div className="mt-4 text-center text-xs text-muted-foreground animate-pulse">Đang xử lý...</div>}

            <HistoryList checkins={todayCheckins} />

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
