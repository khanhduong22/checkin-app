'use client';

import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/vi'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { registerShift, deleteShift } from "@/app/actions/schedule"; // Import actions
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

moment.locale('vi');
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop(Calendar)

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any; 
    isOwner?: boolean; // Can modify?
}

export default function ScheduleCalendar({ initialEvents, userId, isAdmin = false, defaultDate = new Date() }: { initialEvents: any[], userId: string, isAdmin?: boolean, defaultDate?: Date }) {
    const [events, setEvents] = useState<CalendarEvent[]>(initialEvents.map(e => ({
        id: e.id,
        title: e.title || 'Staff',
        start: new Date(e.start),
        end: new Date(e.end),
        resource: e,
        isOwner: e.userId === userId || isAdmin
    })));

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<{start: Date, end: Date} | null>(null);

    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date, end: Date }) => {
            // Check if start time is in past?
            if (start < new Date()) {
                toast.error("Không thể đăng ký lịch trong quá khứ!");
                return;
            }
            
            setPendingEvent({ start, end });
            setModalOpen(true);
        },
        [events]
    )

    const handleConfirmRegister = async () => {
        if (!pendingEvent) return;

        const { start, end } = pendingEvent;
        // Optimistic UI: Add immediately
        const tempId = Date.now();
        const optimisticEvent: CalendarEvent = {
            id: tempId,
            title: 'Đang xếp lịch...',
            start,
            end,
            isOwner: true
        };
        setEvents(prev => [...prev, optimisticEvent]);
        setModalOpen(false); // Close modal immediately

        // Call server action
        const callRegister = async (override: boolean = false) => {
             const result: any = await registerShift(start, end, override);
             
             if (result.success) {
                toast.success("Đăng ký thành công!");
                setEvents(prev => prev.map(e => e.id === tempId ? { ...e, title: 'Đã đăng ký', id: result.id || tempId } : e));
             } else {
                if (result.error === 'LIMIT_PART_TIME') {
                    if (isAdmin) {
                         // Show native confirm or custom dialog
                         if (window.confirm(`⚠️ CẢNH BÁO: Đã có ${result.count} nhân viên Part-time trong khung giờ này.\n\nBạn có chắc chắn muốn duyệt thêm người này (Ví dụ: Ngày lễ)?`)) {
                             // Retry with override
                             await callRegister(true);
                             return;
                         }
                    } else {
                        toast.error("Không thể đăng ký: Đã đủ số lượng Part-time!");
                    }
                } else {
                    toast.error(result.error || "Lỗi đăng ký");
                }
                // Rollback
                setEvents(prev => prev.filter(e => e.id !== tempId));
             }
        };

        await callRegister(false);
    }

    const handleSelectEvent = useCallback(
        (event: CalendarEvent) => {
            if (!event.isOwner) {
                 toast.info(`Lịch của ${event.title}`);
                 return;
            }

            if (confirm(`Bạn muốn xóa lịch làm việc ${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}?`)) {
                deleteShift(event.id).then((res: any) => {
                    if (res.success) {
                        toast.success("Đã xóa lịch làm việc");
                         // Remove from state
                         setEvents((prev) => prev.filter((e) => e.id !== event.id))
                    } else {
                        toast.error("Không thể xóa lịch này");
                    }
                });
            }
        },
        []
    )

    // Style events
    const eventPropGetter = useCallback(
        (event: CalendarEvent) => ({
             style: {
                 backgroundColor: event.isOwner ? '#10b981' : '#6b7280', // Green for me, Gray for others
                 opacity: 0.8,
                 color: 'white',
                 border: '0px',
                 display: 'block'
             },
        }),
        []
    )
    
    // Style business hours background
    const slotPropGetter = useCallback(
        (date: Date) => {
            const hour = date.getHours();
             if (hour >= 8 && hour < 17) {
                 return {
                     style: {
                         backgroundColor: '#fafafa', // Slightly different bg for office hours? Or default white.
                         // Maybe highlight non-working hours?
                     }
                 }
             }
             return {}
        },
        []
    )

    return (
        <div className="h-[600px] bg-white p-4 rounded-xl shadow-sm border">
            <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => new Date(event.start)}
                endAccessor={(event: any) => new Date(event.end)}
                defaultView={Views.WEEK}
                defaultDate={defaultDate} // Use prop
                views={[Views.WEEK, Views.DAY]}
                step={60} // 60 mins per slot
                min={new Date(0, 0, 0, 7, 0, 0)} // Start at 7:00
                max={new Date(0, 0, 0, 21, 0, 0)} // End at 21:00
                selectable
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
                            <span className="font-bold text-emerald-600">
                                {pendingEvent && moment(pendingEvent.start).format('HH:mm')} - {pendingEvent && moment(pendingEvent.end).format('HH:mm')}
                            </span>
                            <br/>
                            (Ngày {pendingEvent && moment(pendingEvent.start).format('DD/MM/YYYY')})
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleConfirmRegister}>Đăng ký ngay</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
