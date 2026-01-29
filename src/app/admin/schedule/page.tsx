import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AssignShiftButton from "@/components/admin/AssignShiftButton";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage({ searchParams }: { searchParams: { date?: string, view?: string } }) {
    const view = searchParams.view || 'day'; // 'day' | 'week'
    const dateStr = searchParams.date || new Date().toISOString().split('T')[0];
    const selectedDate = new Date(dateStr);

    // Get All Users
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

    // === WEEK VIEW ===
    if (view === 'week') {
        // Calculate Week Range
        const dayOfWeek = selectedDate.getDay(); // 0 (Sun) - 6 (Sat)
        // Assume week starts on Monday (1)
        const diffToMon = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(selectedDate); startOfWeek.setDate(diffToMon); startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);

        const shifts = await prisma.workShift.findMany({
            where: { date: { gte: startOfWeek, lte: endOfWeek } },
            include: { user: true }
        });

        // Generate 7 Days
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            weekDays.push(d);
        }

        return (
            <div className="space-y-6">
                 {/* Header & Nav */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                         <h2 className="text-2xl font-bold tracking-tight">Lịch làm việc (Tuần)</h2>
                         <p className="text-muted-foreground">
                            {startOfWeek.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'})} - {endOfWeek.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric', year: 'numeric'})}
                         </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="flex border rounded-md overflow-hidden bg-white">
                            <a href={`?view=day&date=${dateStr}`} className="px-3 py-1.5 text-sm hover:bg-gray-100 border-r">Ngày</a>
                            <span className="px-3 py-1.5 text-sm bg-blue-50 font-semibold text-blue-700">Tuần</span>
                        </div>
                        <div className="w-px bg-gray-200 h-8 mx-2 hidden md:block" />
                        
                        {/* Nav Buttons */}
                         <form>
                            <input type="hidden" name="view" value="week" />
                            <input type="hidden" name="date" value={new Date(selectedDate.getTime() - 7 * 86400000).toISOString().split('T')[0]} />
                            <Button variant="outline" size="sm" type="submit">◀ Tuần trước</Button>
                         </form>
                         <form>
                            <input type="hidden" name="view" value="week" />
                            <input type="hidden" name="date" value={new Date(selectedDate.getTime() + 7 * 86400000).toISOString().split('T')[0]} />
                            <Button variant="outline" size="sm" type="submit">Tuần sau ▶</Button>
                         </form>
                    </div>
                </div>

                {/* Week Grid */}
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[1000px] grid grid-cols-7 gap-2">
                         {weekDays.map((day, idx) => {
                             const dayShifts = shifts.filter((s:any) => new Date(s.date).toDateString() === day.toDateString());
                             const isToday = new Date().toDateString() === day.toDateString();

                             return (
                                 <div key={idx} className={`border rounded-lg p-2 ${isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-white'}`}>
                                     <div className={`text-center font-bold mb-2 pb-2 border-b ${isToday ? 'text-blue-700' : ''}`}>
                                         {day.toLocaleDateString('vi-VN', { weekday: 'short' })} <span className="text-xs font-normal">({day.getDate()}/{day.getMonth()+1})</span>
                                     </div>
                                     <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                         {dayShifts.map((s:any) => (
                                             <div key={s.id} className={`p-1.5 rounded text-xs border ${
                                                 s.shift === 'MORNING' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                                                 s.shift === 'AFTERNOON' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                                                 s.shift === 'FULL' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                                                 'bg-purple-50 border-purple-100 text-purple-800'
                                             }`}>
                                                 <div className="font-semibold truncate">{s.user.name}</div>
                                                 <div className="opacity-75 text-[10px]">
                                                     {s.shift === 'FULL' ? 'Full' : (s.shift === 'CUSTOM' ? `${s.startTime}-${s.endTime}` : s.shift)}
                                                 </div>
                                             </div>
                                         ))}
                                         {dayShifts.length === 0 && <div className="text-center text-muted-foreground text-[10px] py-4">-</div>}
                                     </div>
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>
        );
    }

    // === DAY VIEW (Existing Logic) ===
    const startOfDay = new Date(selectedDate); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selectedDate); endOfDay.setHours(23,59,59,999);

    const shifts = await prisma.workShift.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        include: { user: true }
    });

    const morningShifts = shifts.filter((s: any) => s.shift === 'MORNING' || s.shift === 'FULL');
    const afternoonShifts = shifts.filter((s: any) => s.shift === 'AFTERNOON' || s.shift === 'FULL');
    const customShifts = shifts.filter((s: any) => s.shift === 'CUSTOM');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Lịch làm việc</h2>
                     <p className="text-muted-foreground">{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                     <AssignShiftButton users={users} currentDate={dateStr} />
                     <div className="w-px bg-gray-200 h-8 mx-2 hidden md:block" />
                     
                     {/* View Switch */}
                     <div className="flex border rounded-md overflow-hidden bg-white">
                        <span className="px-3 py-1.5 text-sm bg-blue-50 font-semibold text-blue-700">Ngày</span>
                        <a href={`?view=week&date=${dateStr}`} className="px-3 py-1.5 text-sm hover:bg-gray-100 border-l">Tuần</a>
                     </div>

                     <div className="w-px bg-gray-200 h-8 mx-2 hidden md:block" />

                     <form>
                        <input type="hidden" name="date" value={new Date(selectedDate.getTime() - 86400000).toISOString().split('T')[0]} />
                        <Button variant="outline" size="sm" type="submit">◀ Trước</Button>
                     </form>
                     <form>
                        <input type="hidden" name="date" value={new Date(selectedDate.getTime() + 86400000).toISOString().split('T')[0]} />
                        <Button variant="outline" size="sm" type="submit">Sau ▶</Button>
                     </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Morning Column */}
                <Card className="border-t-4 border-t-amber-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            🌤️ Ca Sáng (08:30)
                            <span className="text-sm font-normal text-muted-foreground">{morningShifts.length}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {morningShifts.length === 0 ? <div className="text-muted-foreground text-sm italic">Trống.</div> : (
                            <div className="space-y-3">
                                {morningShifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                           {s.user.image ? <img src={s.user.image} className="w-full h-full object-cover"/> : s.user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{s.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{s.shift === 'FULL' ? 'Cả ngày' : 'Sáng'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Afternoon Column */}
                <Card className="border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-lg flex justify-between">
                            ☀️ Ca Chiều (13:30)
                            <span className="text-sm font-normal text-muted-foreground">{afternoonShifts.length}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {afternoonShifts.length === 0 ? <div className="text-muted-foreground text-sm italic">Trống.</div> : (
                             <div className="space-y-3">
                                {afternoonShifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                            {s.user.image ? <img src={s.user.image} className="w-full h-full object-cover"/> : s.user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{s.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{s.shift === 'FULL' ? 'Cả ngày' : 'Chiều'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Custom Shift Column */}
                <Card className="border-t-4 border-t-purple-500">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-lg flex justify-between">
                            ⚡ Ca Tùy Chỉnh
                            <span className="text-sm font-normal text-muted-foreground">{customShifts.length}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {customShifts.length === 0 ? <div className="text-muted-foreground text-sm italic">Trống.</div> : (
                             <div className="space-y-3">
                                {customShifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 bg-purple-50/50">
                                        <div className="h-8 w-8 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                                            {s.user.image ? <img src={s.user.image} className="w-full h-full object-cover"/> : s.user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{s.user.name}</div>
                                            <div className="text-xs font-mono text-purple-700 font-semibold my-0.5">
                                                {s.startTime} - {s.endTime}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
