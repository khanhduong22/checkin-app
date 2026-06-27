'use client';

import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/vi'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useState, useCallback, useEffect } from 'react';
import { toast } from "sonner";
import { registerShift, deleteShift, updateShift } from "@/app/actions/schedule"; 
import { toggleShiftSwap, takeShift } from "@/app/actions/shift";
import { isShiftLocked } from "@/lib/schedule-lock";
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

moment.locale('vi');
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar as any) as any

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any; 
    isOwner?: boolean; 
    employmentType?: string;
}

export default function ScheduleCalendar({ initialEvents, userId, isAdmin = false, defaultDate, users = [] }: { initialEvents: any[], userId: string, isAdmin?: boolean, defaultDate?: Date, users?: any[] }) {
    const [calDate] = useState(() => {
        if (defaultDate) return defaultDate;
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    });
    const mapEvents = (serverEvents: any[]) => serverEvents.map(e => {
        let parsedStart = new Date(e.start);
        let parsedEnd = new Date(e.end);
        
        // Prevent react-big-calendar from treating midnight ends as multi-day (all-day event)
        if (parsedEnd.getHours() === 0 && parsedEnd.getMinutes() === 0 && (parsedEnd.getTime() - parsedStart.getTime()) > 0) {
             // By subtracting 1 minute (60000ms), it safely remains on the same calendar block and avoids moment.js rounding
             parsedEnd = new Date(parsedEnd.getTime() - 60000);
        }

        const isSwap = e.userId !== userId && e.isOpenForSwap;
        const title = isSwap ? `🔄 Đổi ca: ${e.title}` : e.title;

        return {
            id: e.id,
            title: title || 'Staff',
            start: parsedStart,
            end: parsedEnd,
            resource: e,
            isOwner: e.userId === userId || isAdmin,
            employmentType: e.employmentType || 'PART_TIME',
            allDay: false,
        };
    });

    const [prevInitialEvents, setPrevInitialEvents] = useState(initialEvents);
    const [events, setEvents] = useState<CalendarEvent[]>(() => mapEvents(initialEvents));

    if (initialEvents !== prevInitialEvents) {
        setPrevInitialEvents(initialEvents);
        setEvents(mapEvents(initialEvents));
    }

    const [hideFullTime, setHideFullTime] = useState(true);

    const displayedEvents = events.filter(e => {
        if (hideFullTime && e.employmentType === 'FULL_TIME') return false;
        return true;
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<{start: Date, end: Date} | null>(null);
    const [targetUserId, setTargetUserId] = useState<string>(userId);

    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const handleEventUpdate = useCallback(
        async ({ event, start, end }: any) => {
             if (!event.isOwner) return;

             if (!isAdmin && (isShiftLocked(event.start) || isShiftLocked(start))) {
                 toast.error("Lịch làm của tuần này đã chốt, không thể thay đổi!");
                 return;
             }

             // Optimistic update
             const oldStart = event.start;
             const oldEnd = event.end;
             
             setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start, end } : e));

             try {
                // @ts-ignore
                const res = await updateShift(event.id, start, end);
                if (!res.success) {
                    toast.error(res.error || "Không thể cập nhật");
                    // Rollback
                    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: oldStart, end: oldEnd } : e));
                } else {
                    toast.success("Đã cập nhật");
                }
             } catch (e) {
                 // Rollback
                 setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start: oldStart, end: oldEnd } : e));
             }
        },
        [isAdmin]
    );

    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date, end: Date }) => {
            if (start < new Date()) {
                toast.error("Không thể đăng ký lịch trong quá khứ!");
                return;
            }

            if (!isAdmin && isShiftLocked(start)) {
                toast.error("Lịch làm của tuần này đã chốt, không thể đăng ký thêm!");
                return;
            }

            let finalEnd = end;
            const diff = finalEnd.getTime() - start.getTime();
            const minDuration = 4 * 60 * 60 * 1000; // 4 hours
            
            if (diff < minDuration) {
                finalEnd = new Date(start.getTime() + minDuration);
            }
            
            setPendingEvent({ start, end: finalEnd });
            setTargetUserId(userId); // Reset to current user (self) or keep previous? Reset is safer.
            setModalOpen(true);
        },
        [userId, isAdmin]
    )

    const handleConfirmRegister = async () => {
        if (!pendingEvent) return;

        const { start, end } = pendingEvent;
        // Optimistic UI
        const tempId = Date.now();
        const optimisticEvent: CalendarEvent = {
            id: tempId,
            title: 'Đang xếp lịch...',
            start,
            end,
            isOwner: true,
            employmentType: 'PART_TIME' // Assume cur user part time logic or fetch? UI agnostic.
        };
        setEvents(prev => [...prev, optimisticEvent]);
        setModalOpen(false); 

        // Call server action
        const callRegister = async (override: boolean = false) => {
             const result: any = await registerShift(start, end, override, targetUserId);
             
             if (result.success) {
                toast.success("Đăng ký thành công!");
                setEvents(prev => prev.map(e => e.id === tempId ? { ...e, title: result.title || 'Đã đăng ký', id: result.id || tempId } : e));
             } else {
                if (result.error === 'LIMIT_PART_TIME') {
                    if (isAdmin) {
                         if (window.confirm(`⚠️ CẢNH BÁO: Đã có ${result.count} nhân viên Part-time trong khung giờ này.\n\nBạn có chắc chắn muốn duyệt thêm người này?`)) {
                             await callRegister(true);
                             return;
                         }
                    } else {
                        toast.error("Không thể đăng ký: Đã đủ số lượng Part-time!");
                    }
                } else {
                    toast.error(result.error || "Lỗi đăng ký");
                }
                setEvents(prev => prev.filter(e => e.id !== tempId));
             }
        };

        await callRegister(false);
    }

    const handleSelectEvent = useCallback(
        (event: CalendarEvent) => {
            const isSwap = !event.isOwner && event.resource?.isOpenForSwap;
            if (event.isOwner || isSwap) {
                setSelectedEvent(event);
                setActionModalOpen(true);
            }
        },
        []
    )

    // Generate distinct color from string
    const stringToColor = useCallback((str: string) => {
        if (!str) return '#6b7280';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Tailwind-ish Palette (300-600 range for readability)
        const colors = [
            '#ef4444', // Red
            '#f97316', // Orange
            '#f59e0b', // Amber
            '#84cc16', // Lime
            '#10b981', // Emerald
            '#06b6d4', // Cyan
            '#3b82f6', // Blue
            '#6366f1', // Indigo
            '#8b5cf6', // Violet
            '#d946ef', // Fuchsia
            '#f43f5e', // Rose
            '#0ea5e9', // Sky
            '#14b8a6', // Teal
        ];
        return colors[Math.abs(hash) % colors.length];
    }, []);

    // Get specific color for staff members
    const getEventColor = useCallback((title: string) => {
        if (!title) return { bg: '#6b7280', text: '#ffffff' };
        
        // Extract clean name in case it contains swap indicators
        let cleanName = title.replace('🔄 Đổi ca: ', '').trim();
        const words = cleanName.toLowerCase().split(/\s+/);
        const firstName = words[words.length - 1];

        // Specific color assignments
        if (firstName === 'hân') {
            return { bg: '#fbcfe8', text: '#9d174d' }; // Pink pastel
        }
        if (firstName === 'hiền') {
            return { bg: '#fef08a', text: '#854d0e' }; // Yellow pastel
        }
        if (firstName === 'hương') {
            return { bg: '#0ea5e9', text: '#ffffff' }; // Sky blue
        }
        if (firstName === 'ngân') {
            return { bg: '#e9d5ff', text: '#6b21a8' }; // Purple pastel
        }
        if (firstName === 'uyên') {
            return { bg: '#ef4444', text: '#ffffff' }; // Red
        }
        if (firstName === 'na') {
            return { bg: '#a7f3d0', text: '#065f46' }; // Mint green
        }

        // Default behavior (keep existing color for Phượng, Trang, etc.)
        return { bg: stringToColor(cleanName), text: '#ffffff' };
    }, [stringToColor]);

    const eventPropGetter = useCallback(
        (event: CalendarEvent) => {
            const isSwap = !event.isOwner && event.resource?.isOpenForSwap;
            const colors = isSwap ? { bg: '#8b5cf6', text: '#ffffff' } : getEventColor(event.title);
            return {
                style: {
                    backgroundColor: colors.bg,
                    opacity: 0.9,
                    color: colors.text,
                    border: event.isOwner ? '2px solid white' : '0px', // Highlight own shifts with border
                    display: 'block',
                    zoom: 1, 
                    fontSize: '0.75rem', 
                    boxShadow: event.isOwner ? '0 0 0 2px #000' : (isSwap ? '0 0 0 2px #8b5cf6' : 'none'), // Extra visibility for owner/swap
                },
            }
        },
        [getEventColor]
    )
    
    const slotPropGetter = useCallback(
        (date: Date) => {
            const hour = date.getHours();
             if (hour >= 8 && hour < 17) {
                 return {
                     style: { backgroundColor: '#fafafa' }
                 }
             }
             return {}
        },
        []
    )

    return (
        <div id="schedule-calendar-container" className="h-[750px] bg-white p-4 rounded-xl shadow-sm border flex flex-col">
            <div className="flex items-center justify-end space-x-2 mb-2 px-2 pb-2 border-b">
                <Switch 
                    id="hide-full-time" 
                    checked={hideFullTime} 
                    onCheckedChange={setHideFullTime} 
                />
                <Label htmlFor="hide-full-time" className="cursor-pointer text-sm font-medium">Ẩn nhân viên Full-time</Label>
            </div>

            <DnDCalendar
                localizer={localizer}
                events={displayedEvents}
                startAccessor={(event: any) => new Date(event.start)}
                endAccessor={(event: any) => new Date(event.end)}
                defaultView={Views.WEEK}
                defaultDate={calDate}
                views={[Views.WEEK, Views.DAY]}
                step={30} 
                timeslots={2}
                min={new Date(0, 0, 0, 7, 0, 0)} 
                max={new Date(0, 0, 0, 23, 59, 59)} 
                showMultiDayTimes={true}
                selectable
                resizable
                onEventDrop={handleEventUpdate}
                onEventResize={handleEventUpdate}
                longPressThreshold={100}
                onSelectSlot={(slotInfo: any) => handleSelectSlot(slotInfo)}
                onSelectEvent={(event: any) => handleSelectEvent(event)}
                eventPropGetter={(event: any) => eventPropGetter(event)}
                slotPropGetter={slotPropGetter}
                messages={{
                    next: "Sau",
                    previous: "Trước",
                    today: "Hôm nay",
                    month: "Tháng",
                    week: "Tuần",
                    day: "Ngày",
                    agenda: "Lịch trình",
                    date: "Ngày",
                    time: "Thời gian",
                    event: "Sự kiện",
                    noEventsInRange: "Không có lịch làm việc nào trong khoảng này",
                }}
            />

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận đăng ký ca làm</DialogTitle>
                        <DialogDescription>
                            Bạn muốn đăng ký làm việc vào khung giờ: <br/>
                            <span className="font-bold text-emerald-600 block text-lg my-2">
                                {pendingEvent && moment(pendingEvent.start).format('HH:mm')} - {pendingEvent && moment(pendingEvent.end).format('HH:mm')}
                            </span>
                             (Ngày {pendingEvent && moment(pendingEvent.start).format('DD/MM/YYYY')})
                             <br/>
                             <span className="text-xs text-gray-400 italic mt-1 block">
                                *Hệ thống tự động chọn tối thiểu 4 tiếng.
                             </span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    {isAdmin && users && users.length > 0 && (
                        <div className="py-2">
                            <Label className="mb-2 block text-sm font-medium">Chọn nhân viên (Quyền Admin)</Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nhân viên" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {users.map((u: any) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.nickname || u.name || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleConfirmRegister}>Đăng ký ngay</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedEvent?.isOwner ? "Quản lý ca làm việc của bạn" : "Nhận ca làm từ đồng nghiệp"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvent && (
                                <>
                                    Khung giờ: <span className="font-bold text-emerald-600 block text-lg my-2">
                                        {moment(selectedEvent.start).format('HH:mm')} - {moment(selectedEvent.end).format('HH:mm')}
                                    </span>
                                    Ngày: {moment(selectedEvent.start).format('DD/MM/YYYY')}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEvent && selectedEvent.isOwner ? (
                        <div className="space-y-4 py-4">
                            {!isAdmin && isShiftLocked(selectedEvent.start) ? (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg">
                                    ⚠️ Lịch làm của tuần này đã được chốt. Chỉ Admin mới có quyền sửa đổi.
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500">
                                        Trạng thái đổi ca: <span className="font-bold text-gray-700">{selectedEvent.resource?.isOpenForSwap ? "Đang treo trên chợ đổi ca" : "Chưa đăng đổi ca"}</span>
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Button 
                                            variant={selectedEvent.resource?.isOpenForSwap ? "secondary" : "default"}
                                            onClick={async () => {
                                                setActionModalOpen(false);
                                                const res = await toggleShiftSwap(selectedEvent.id, !selectedEvent.resource?.isOpenForSwap);
                                                if (res.success) {
                                                    toast.success(res.message);
                                                    setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {
                                                        ...e,
                                                        title: selectedEvent.resource?.isOpenForSwap 
                                                            ? e.title.replace('🔄 Đổi ca: ', '') 
                                                            : e.title,
                                                        resource: { ...e.resource, isOpenForSwap: !selectedEvent.resource?.isOpenForSwap }
                                                    } : e));
                                                } else {
                                                    toast.error(res.message || "Lỗi hệ thống");
                                                }
                                            }}
                                        >
                                            {selectedEvent.resource?.isOpenForSwap ? "🚫 Gỡ khỏi chợ đổi ca" : "🔄 Đăng lên chợ đổi ca (Pass ca)"}
                                        </Button>
                                        
                                        <Button 
                                            variant="destructive"
                                            onClick={async () => {
                                                if (confirm("Bạn có chắc chắn muốn xóa ca làm này?")) {
                                                    setActionModalOpen(false);
                                                    const res: any = await deleteShift(selectedEvent.id);
                                                    if (res.success) {
                                                        toast.success("Đã xóa lịch làm việc");
                                                        setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                                                    } else {
                                                        toast.error(res.error || "Không thể xóa lịch này");
                                                    }
                                                }
                                            }}
                                        >
                                            ❌ Xóa ca làm này
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : selectedEvent ? (
                        <div className="space-y-4 py-4 text-center">
                            {!isAdmin && isShiftLocked(selectedEvent.start) ? (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg">
                                    ⚠️ Lịch làm của tuần này đã được chốt. Không thể nhận ca này nữa!
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-600">
                                        Ca làm này được đăng bởi <span className="font-bold">{selectedEvent.resource?.title || 'Đồng nghiệp'}</span>.
                                        Bạn có muốn nhận làm ca này không?
                                    </p>
                                    <Button 
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                        onClick={async () => {
                                            setActionModalOpen(false);
                                            const res = await takeShift(selectedEvent.id);
                                            if (res.success) {
                                                toast.success(res.message);
                                                setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {
                                                    ...e,
                                                    title: e.resource?.title || 'Staff',
                                                    isOwner: true,
                                                    resource: { ...e.resource, userId: userId, isOpenForSwap: false }
                                                } : e));
                                            } else {
                                                toast.error(res.message || "Lỗi khi nhận ca");
                                            }
                                        }}
                                    >
                                        ✅ Đồng ý nhận ca làm
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setActionModalOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
