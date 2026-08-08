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
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, RefreshCw } from 'lucide-react'

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

    const [isMobile, setIsMobile] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => new Date());

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
    const [showAllShifts, setShowAllShifts] = useState(isAdmin);

    const displayedEvents = events.filter(e => {
        if (hideFullTime && e.employmentType === 'FULL_TIME') return false;
        
        // If it belongs to the current user, they can always see it
        if (e.resource?.userId === userId) return true;
        
        // If it is open for swap, they can always see it
        if (e.resource?.isOpenForSwap) return true;
        
        // For other people's normal shifts:
        if (!isAdmin) {
            // Staff can only see other people's shifts if they checked "showAllShifts" AND the shift week is locked (public)
            if (!showAllShifts || !isShiftLocked(e.start)) {
                return false;
            }
        } else {
            // Admin can see other people's shifts if "showAllShifts" is checked
            if (!showAllShifts) return false;
        }
        
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
            setTargetUserId(userId); // Reset to current user (self)
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
            employmentType: 'PART_TIME'
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
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
            '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
            '#f43f5e', '#0ea5e9', '#14b8a6'
        ];
        return colors[Math.abs(hash) % colors.length];
    }, []);

    // Get specific color for staff members
    const getEventColor = useCallback((title: string) => {
        if (!title) return { bg: '#6b7280', text: '#ffffff' };
        
        let cleanName = title.replace('🔄 Đổi ca: ', '').trim();
        const words = cleanName.toLowerCase().split(/\s+/);
        const firstName = words[words.length - 1];

        if (firstName === 'hân') return { bg: '#fbcfe8', text: '#9d174d' };
        if (firstName === 'hiền') return { bg: '#fef08a', text: '#854d0e' };
        if (firstName === 'hương') return { bg: '#0ea5e9', text: '#ffffff' };
        if (firstName === 'ngân') return { bg: '#e9d5ff', text: '#6b21a8' };
        if (firstName === 'uyên') return { bg: '#ef4444', text: '#ffffff' };
        if (firstName === 'na') return { bg: '#fef08a', text: '#854d0e' };
        if (firstName === 'trang') return { bg: '#a7f3d0', text: '#065f46' };
        if (firstName === 'anh' || cleanName.toLowerCase().includes('quỳnh anh')) {
            return { bg: '#a5f3fc', text: '#0e7490' };
        }

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
                    border: event.isOwner ? '2px solid white' : '0px',
                    display: 'block',
                    zoom: 1, 
                    fontSize: '0.75rem', 
                    boxShadow: event.isOwner ? '0 0 0 2px #000' : (isSwap ? '0 0 0 2px #8b5cf6' : 'none'),
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

    // Time Selection dropdown helper values
    const timeOptions = [];
    for (let h = 7; h <= 23; h++) {
        const hStr = h.toString().padStart(2, '0');
        timeOptions.push(`${hStr}:00`);
        if (h !== 23) {
            timeOptions.push(`${hStr}:30`);
        }
    }
    timeOptions.push('23:59');

    const handleStartTimeChange = (val: string) => {
        if (!pendingEvent) return;
        const [h, m] = val.split(':').map(Number);
        const newStart = new Date(pendingEvent.start);
        newStart.setHours(h, m, 0, 0);

        let newEnd = new Date(pendingEvent.end);
        if (newEnd <= newStart) {
            newEnd = new Date(newStart.getTime() + 4 * 60 * 60 * 1000);
        }
        setPendingEvent({ start: newStart, end: newEnd });
    };

    const handleEndTimeChange = (val: string) => {
        if (!pendingEvent) return;
        const [h, m] = val.split(':').map(Number);
        const newEnd = new Date(pendingEvent.end);
        newEnd.setHours(h, m, 0, 0);
        setPendingEvent({ start: pendingEvent.start, end: newEnd });
    };

    // Mobile View Setup
    const startOfWeek = moment(selectedDate).startOf('week').toDate();
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        weekDays.push(moment(startOfWeek).add(i, 'days').toDate());
    }

    const dailyEvents = displayedEvents
        .filter(e => moment(e.start).isSame(selectedDate, 'day'))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const hasEventsOnDay = (date: Date) => {
        return displayedEvents.some(e => moment(e.start).isSame(date, 'day'));
    };

    const handlePrevWeek = () => {
        setSelectedDate(prev => moment(prev).subtract(1, 'week').toDate());
    };
    const handleNextWeek = () => {
        setSelectedDate(prev => moment(prev).add(1, 'week').toDate());
    };

    const handleMobileRegister = () => {
        if (selectedDate < moment().startOf('day').toDate()) {
            toast.error("Không thể đăng ký lịch trong quá khứ!");
            return;
        }
        
        if (!isAdmin && isShiftLocked(selectedDate)) {
            toast.error("Lịch làm của tuần này đã chốt, không thể đăng ký thêm!");
            return;
        }

        const start = new Date(selectedDate);
        start.setHours(8, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(12, 0, 0, 0);

        setPendingEvent({ start, end });
        setTargetUserId(userId);
        setModalOpen(true);
    };

    // Responsive rendering
    return (
        <div id="schedule-calendar-container" className="flex flex-col bg-white rounded-xl shadow-sm border p-4 min-h-[600px] md:h-[750px]">
            {isMobile ? (
                // --- MOBILE INTERFACE ---
                <div className="flex flex-col flex-1 space-y-4 relative pb-16">
                    {/* Settings Row */}
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-gray-50 p-3 rounded-lg border text-sm">
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="show-all-shifts-mobile" 
                                checked={showAllShifts} 
                                onCheckedChange={setShowAllShifts} 
                            />
                            <Label htmlFor="show-all-shifts-mobile" className="cursor-pointer text-xs font-semibold">Xem lịch cửa hàng</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="hide-full-time-mobile" 
                                checked={hideFullTime} 
                                onCheckedChange={setHideFullTime} 
                            />
                            <Label htmlFor="hide-full-time-mobile" className="cursor-pointer text-xs font-semibold">Ẩn Full-time</Label>
                        </div>
                    </div>

                    {/* Date Selector Strip Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-700">
                            Tháng {moment(selectedDate).format('M / YYYY')}
                        </h2>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handlePrevWeek}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2 py-0" onClick={() => setSelectedDate(new Date())}>
                                Hôm nay
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleNextWeek}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Date Selector Strip Columns */}
                    <div className="grid grid-cols-7 gap-1 pb-2 border-b">
                        {weekDays.map((d, i) => {
                            const isSelected = moment(d).isSame(selectedDate, 'day');
                            const isToday = moment(d).isSame(new Date(), 'day');
                            const hasEvents = hasEventsOnDay(d);
                            const dayName = moment(d).format('dd'); // T2, T3...
                            
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedDate(d)}
                                    className={`flex flex-col items-center py-2.5 rounded-xl transition duration-150 relative active:scale-95 ${
                                        isSelected 
                                            ? 'bg-emerald-600 text-white shadow-md' 
                                            : 'hover:bg-gray-100 text-gray-700 bg-gray-50/50'
                                    }`}
                                >
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                                        {dayName}
                                    </span>
                                    <span className={`text-base font-extrabold mt-0.5 ${isToday && !isSelected ? 'text-emerald-600 underline decoration-2' : ''}`}>
                                        {moment(d).format('D')}
                                    </span>
                                    {hasEvents && (
                                        <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Shift List Header */}
                    <div className="flex items-center justify-between pt-1">
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            <CalendarIcon className="h-4 w-4 text-emerald-600" />
                            Lịch làm việc ({moment(selectedDate).format('DD/MM/YYYY')})
                        </h3>
                    </div>

                    {/* Daily Shift Cards */}
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
                        {dailyEvents.map((event) => {
                            const isSwap = !event.isOwner && event.resource?.isOpenForSwap;
                            const colors = isSwap ? { bg: '#8b5cf6', text: '#ffffff' } : getEventColor(event.title);
                            
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => handleSelectEvent(event)}
                                    className="bg-white p-3.5 rounded-xl border shadow-sm flex items-center justify-between transition active:scale-95 duration-100 cursor-pointer hover:border-emerald-200"
                                    style={{ borderLeft: `5px solid ${colors.bg}` }}
                                >
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center gap-1.5 font-bold text-gray-800 text-sm">
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                            <span>
                                                {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                                            </span>
                                            <span className="text-xs font-normal text-gray-400">
                                                ({moment.duration(moment(event.end).diff(moment(event.start))).asHours().toFixed(1)}h)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                            <span className="font-semibold text-gray-700">{event.title}</span>
                                            {event.employmentType === 'FULL_TIME' && (
                                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">Full-time</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Event action icons */}
                                    <div className="flex items-center gap-2">
                                        {isSwap && (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                                <RefreshCw className="h-3 w-3 animate-spin" /> Nhận ca
                                            </span>
                                        )}
                                        {event.isOwner && (
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                                                Của bạn
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {dailyEvents.length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center space-y-2">
                                <span className="text-3xl">📭</span>
                                <p className="text-sm font-semibold text-gray-500">Chưa có ai đăng ký ca làm</p>
                                <p className="text-xs text-gray-400">Bấm đăng ký bên dưới để thêm lịch</p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Footer Register Button */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-2 z-10">
                        <Button 
                            onClick={handleMobileRegister} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 shadow-lg rounded-xl flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus className="h-5 w-5" />
                            Đăng ký ca làm ngày {moment(selectedDate).format('DD/MM')}
                        </Button>
                    </div>
                </div>
            ) : (
                // --- DESKTOP INTERFACE ---
                <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-end space-x-6 mb-2 px-2 pb-2 border-b">
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="show-all-shifts" 
                                checked={showAllShifts} 
                                onCheckedChange={setShowAllShifts} 
                            />
                            <Label htmlFor="show-all-shifts" className="cursor-pointer text-sm font-medium">Xem lịch toàn cửa hàng</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="hide-full-time" 
                                checked={hideFullTime} 
                                onCheckedChange={setHideFullTime} 
                            />
                            <Label htmlFor="hide-full-time" className="cursor-pointer text-sm font-medium">Ẩn nhân viên Full-time</Label>
                        </div>
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
                </div>
            )}

            {/* Registration Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-[400px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận đăng ký ca làm</DialogTitle>
                        <DialogDescription>
                            Bạn muốn đăng ký làm việc vào ngày {pendingEvent && moment(pendingEvent.start).format('DD/MM/YYYY')}. Điều chỉnh khung giờ bên dưới:
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-3 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500">Giờ bắt đầu</Label>
                                <Select 
                                    value={pendingEvent ? moment(pendingEvent.start).format('HH:mm') : '08:00'} 
                                    onValueChange={handleStartTimeChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {timeOptions.map(t => (
                                            <SelectItem key={`start-${t}`} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-500">Giờ kết thúc</Label>
                                <Select 
                                    value={pendingEvent ? moment(pendingEvent.end).format('HH:mm') : '12:00'} 
                                    onValueChange={handleEndTimeChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {timeOptions.map(t => (
                                            <SelectItem key={`end-${t}`} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-400 italic">
                            * Ca làm việc phải tối thiểu 4 tiếng.
                        </div>
                    </div>
                    
                    {isAdmin && users && users.length > 0 && (
                        <div className="pb-2">
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

                    <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t">
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleConfirmRegister} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Đăng ký ngay</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Action / Edit / Swap Dialog */}
            <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
                <DialogContent className="max-w-[400px] rounded-xl">
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
                        <div className="space-y-4 py-2">
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
                        <div className="space-y-4 py-2 text-center">
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

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="ghost" onClick={() => setActionModalOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
