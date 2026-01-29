import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulePage({ searchParams }: { searchParams: { date?: string } }) {
    // Default to today or selected date
    const dateStr = searchParams.date || new Date().toISOString().split('T')[0];
    const selectedDate = new Date(dateStr);
    
    // Get shifts for this date
    // Note: Prisma Query needs range for Date match if passing DateTime
    // Let's broaden search to whole day range
    const startOfDay = new Date(selectedDate); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(selectedDate); endOfDay.setHours(23,59,59,999);

    const shifts = await prisma.workShift.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        },
        include: { user: true }
    });

    const morningShifts = shifts.filter((s: any) => s.shift === 'MORNING' || s.shift === 'FULL');
    const afternoonShifts = shifts.filter((s: any) => s.shift === 'AFTERNOON' || s.shift === 'FULL');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                     <h2 className="text-2xl font-bold tracking-tight">Lịch làm việc</h2>
                     <p className="text-muted-foreground">{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Morning Column */}
                <Card className="border-t-4 border-t-amber-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            ☀️ Ca Sáng (08:30 - 12:00)
                            <span className="text-sm font-normal text-muted-foreground">{morningShifts.length} nhân sự</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {morningShifts.length === 0 ? (
                            <div className="text-muted-foreground text-sm italic">Chưa có ai đăng ký.</div>
                        ) : (
                            <div className="space-y-3">
                                {morningShifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                           {s.user.image ? <img src={s.user.image} className="w-full h-full object-cover"/> : s.user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{s.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{s.shift === 'FULL' ? 'Làm cả ngày' : 'Chỉ buổi sáng'}</div>
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
                            🌤️ Ca Chiều (13:30 - 17:30)
                            <span className="text-sm font-normal text-muted-foreground">{afternoonShifts.length} nhân sự</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {afternoonShifts.length === 0 ? (
                            <div className="text-muted-foreground text-sm italic">Chưa có ai đăng ký.</div>
                        ) : (
                             <div className="space-y-3">
                                {afternoonShifts.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs overflow-hidden">
                                            {s.user.image ? <img src={s.user.image} className="w-full h-full object-cover"/> : s.user.name?.[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{s.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{s.shift === 'FULL' ? 'Làm cả ngày' : 'Chỉ buổi chiều'}</div>
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
