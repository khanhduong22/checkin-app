'use client';

import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/vi'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { registerShift, deleteShift, updateShift } from "@/app/actions/schedule"; 
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
const DnDCalendar = withDragAndDrop(Calendar)

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any; 
    isOwner?: boolean; 
    employmentType?: string;
}

export default function ScheduleCalendar({ initialEvents, userId, isAdmin = false, defaultDate = new Date(), users = [] }: { initialEvents: any[], userId: string, isAdmin?: boolean, defaultDate?: Date, users?: any[] }) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents.map(e => ({
        id: e.id,
        title: e.title || 'Staff',
        start: new Date(e.start),
        end: new Date(e.end),
        resource: e,
        isOwner: e.userId === userId || isAdmin,
        employmentType: e.employmentType || 'PART_TIME', 
    })));

    const [hideFullTime, setHideFullTime] = useState(true);

    const displayedEvents = events.filter(e => {
        if (hideFullTime && e.employmentType === 'FULL_TIME') return false;
        return true;
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<{start: Date, end: Date} | null>(null);
    const [targetUserId, setTargetUserId] = useState<string>(userId);

    const handleEventUpdate = useCallback(
        async ({ event, start, end }: any) => {
             if (!event.isOwner) return;

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
        []
    );

    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date, end: Date }) => {
            if (start < new Date()) {
                toast.error("Không thể đăng ký lịch trong quá khứ!");
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
        [events]
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
                setEvents(prev => prev.map(e => e.id === tempId ? { ...e, title: 'Đã đăng ký', id: result.id || tempId } : e));
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
            if (!event.isOwner) {
                 // toast.info(`Lịch của ${event.title}`);
                 return;
            }

            if (confirm(`Bạn muốn xóa lịch làm việc ${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}?`)) {
                deleteShift(event.id).then((res: any) => {
                    if (res.success) {
                        toast.success("Đã xóa lịch làm việc");
                         setEvents((prev) => prev.filter((e) => e.id !== event.id))
                    } else {
                        toast.error("Không thể xóa lịch này");
                    }
                });
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

    const eventPropGetter = useCallback(
        (event: CalendarEvent) => {
            const backgroundColor = stringToColor(event.title);
            return {
                style: {
                    backgroundColor: backgroundColor,
                    opacity: 0.9,
                    color: 'white',
                    border: event.isOwner ? '2px solid white' : '0px', // Highlight own shifts with border
                    display: 'block',
                    zoom: 1, 
                    fontSize: '0.75rem', 
                    boxShadow: event.isOwner ? '0 0 0 2px #000' : 'none', // Extra visibility for owner
                },
            }
        },
        [stringToColor]
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
        <div className="h-[750px] bg-white p-4 rounded-xl shadow-sm border flex flex-col">
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
                defaultDate={defaultDate}
                views={[Views.WEEK, Views.DAY]}
                step={30} 
                timeslots={2}
                min={new Date(0, 0, 0, 7, 0, 0)} 
                max={new Date(0, 0, 0, 21, 0, 0)} 
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
        </div>
    )
}
