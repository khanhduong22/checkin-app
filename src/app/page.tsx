import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma"
import CheckInButtons from "@/components/CheckInButtons"
import { Button } from "@/components/ui/button"
import GachaButton from "@/components/GachaButton";
import HomeTour from "@/components/home/HomeTour";
import TourHelpButton from "@/components/TourHelpButton";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ viewAsUserId?: string }> }) {
    let session = await getServerSession(authOptions)
    let user;
    let isViewAsMode = false;
    const resolvedSearchParams = await searchParams;

    // --- DEV MODE: BYPASS LOGIN ---
    if (!session) {
        redirect('/login')
    } else {
        user = await prisma.user.findUnique({
            where: { email: session.user?.email! },
            include: {
                checkins: {
                    where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                    orderBy: { timestamp: 'desc' }
                },
                achievements: true
            }
        })

        // VIEW AS MODE (Admin Only)
        if (user?.role === 'ADMIN' && resolvedSearchParams.viewAsUserId) {
            const targetUser = await prisma.user.findUnique({
                where: { id: resolvedSearchParams.viewAsUserId },
                include: {
                    checkins: {
                        where: { timestamp: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                        orderBy: { timestamp: 'desc' }
                    },
                    achievements: true
                }
            });

            if (targetUser) {
                user = targetUser;
                isViewAsMode = true;
            }
        }
    }

    const { getUserMonthlyStats } = await import("@/lib/stats");
    const stats = await getUserMonthlyStats(user?.id!);

    // New Features
    const { calculateStreak } = await import("@/lib/streak");
    const streak = await calculateStreak(user?.id!);

    const announcements = await prisma.announcement.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
    });
    const AnnouncementBar = (await import("@/components/AnnouncementBar")).default;
    const StickyBoard = (await import("@/components/StickyBoard")).default;
    const PrivacyStats = (await import("@/components/PrivacyStats")).default;
    const SpecialDaysWidget = (await import("@/components/home/SpecialDaysWidget")).default;

    const { getSpecialDayUsers } = await import("@/lib/special-days");
    const specialUsers = await getSpecialDayUsers();

    // Auto-run birthday bonus (safe: duplicate-checked per day)
    const { runBirthdayBonus } = await import("@/lib/birthday-bonus");
    await runBirthdayBonus();

    // Auto-run packing bonus (safe: duplicate-checked per month)
    const { runPackingBonus } = await import("@/lib/packing-bonus");
    await runPackingBonus();

    // Auto-run carrying bonus (safe: duplicate-checked per month)
    const { runCarryingBonus } = await import("@/lib/carrying-bonus");
    await runCarryingBonus();

    const notes = await prisma.stickyNote.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { user: true }
    });

    // Serialize Notes for Client Component
    const serializedNotes = notes.map((n: any) => ({
        ...n,
        createdAt: n.createdAt.toISOString()
    }));

    // Check available swaps
    const swapCount = user ? await prisma.workShift.count({
        where: {
            isOpenForSwap: true,
            userId: { not: user.id },
            start: { gte: new Date() }
        }
    }) : 0;

    // Check checkin status for Gacha
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const hasCheckedInToday = user ? await prisma.checkIn.findFirst({
        where: {
            userId: user.id,
            timestamp: { gte: todayStart },
            type: 'checkin'
        }
    }) : false;

    // Get today's shift
    const todayStart2 = new Date();
    todayStart2.setHours(0, 0, 0, 0);
    const todayEnd2 = new Date();
    todayEnd2.setHours(23, 59, 59, 999);

    const todayShift = user ? await prisma.workShift.findFirst({
        where: {
            userId: user.id,
            start: {
                gte: todayStart2,
                lte: todayEnd2
            }
        },
        orderBy: { start: 'asc' } // Should prioritize earliest shift if multiple? Or last? Usually earliest.
    }) : null;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
            <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in duration-500">
                <HomeTour key="tour-v1.8.0" />
                <TourHelpButton />


                {isViewAsMode && (
                    <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">👀</span>
                            <span className="font-bold text-sm">Chế độ xem Dashboard của: {user?.name}</span>
                        </div>
                        <a href="/admin/employees">
                            <Button variant="secondary" size="sm" className="h-7 text-xs">Thoát</Button>
                        </a>
                    </div>
                )}

                {/* Special Days Widget */}
                <SpecialDaysWidget specialUsers={specialUsers} currentUserId={user?.id} enableCalendar={false} />

                {/* Announcements */}
                <div id="home-announcement">
                    <AnnouncementBar announcements={announcements} />
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm relative overflow-hidden">
                    {/* Streak Badge */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {swapCount > 0 && (
                            <a href="/schedule" className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-[10px] font-bold border border-purple-200 shadow-sm animate-pulse hover:bg-purple-200 transition-colors">
                                🎁 {swapCount} kèo thơm
                            </a>
                        )}
                        {streak > 0 && (
                            <div className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-[10px] font-bold border border-orange-200 shadow-sm">
                                🔥 {streak}
                            </div>
                        )}
                    </div>

                    <div className={`p-6 pb-4 flex items-center justify-between ${streak > 0 || swapCount > 0 ? 'mt-6' : ''}`}>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Chấm Công</h1>
                            <p id="home-user-info" className="text-sm text-muted-foreground flex items-center gap-1">
                                Xin chào, {user?.name}
                                {user?.achievements?.map((a: any) => {
                                    if (a.code === 'LUCKY_STAR') return <span key={a.id} title="Ngôi Sao May Mắn">🌟</span>;
                                    if (a.code === 'GACHA_KING') return <span key={a.id} title="Vua Nhân Phẩm">👑</span>;
                                    return null;
                                })}
                            </p>
                        </div>
                        {/* LOGO REPLACEMENT */}
                        <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-yellow-50 overflow-hidden shadow-sm border border-yellow-100">
                            <Image
                                src="/logo.png"
                                alt="LimArt"
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>

                    <div className="px-6 pb-6 space-y-6">

                        {/* Lateness Reminder */}
                        {/* @ts-ignore */}
                        {stats.lateCount >= 2 && (
                            <div className={`border rounded-lg p-3 flex items-start gap-3 mb-4 animate-in fade-in slide-in-from-top-2 ${
                                // @ts-ignore
                                stats.lateCount >= 4
                                    ? 'bg-red-100 border-red-400'
                                    : 'bg-red-50 border-red-200'
                                }`}>
                                <div className={`p-2 rounded-full ${/* @ts-ignore */ stats.lateCount >= 4 ? 'bg-red-200' : 'bg-red-100'}`}>
                                    {/* @ts-ignore */}
                                    <span className="text-xl">{stats.lateCount >= 4 ? '🚨' : '⚠️'}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-red-800">
                                        {/* @ts-ignore */}
                                        {stats.lateCount >= 4 ? '⛔ Bị trừ lương do đi trễ' : 'Cảnh báo đi trễ'}
                                    </h3>
                                    <p className="text-xs text-red-700 mt-1">
                                        Bạn đã đi trễ <span className="font-bold">{/* @ts-ignore */}{stats.lateCount}</span> lần trong tháng này.
                                    </p>
                                    {/* @ts-ignore */}
                                    {stats.latePenaltyHours > 0 && (
                                        <div className="mt-2 bg-red-200/60 rounded-md px-2 py-1.5 text-xs text-red-900 space-y-0.5">
                                            <div className="flex justify-between">
                                                <span>⏱ Số giờ bị trừ:</span>
                                                <span className="font-bold">{/* @ts-ignore */}{stats.latePenaltyHours} giờ</span>
                                            </div>
                                            <div className="flex justify-between border-t border-red-300/60 pt-0.5">
                                                <span>💸 Tiền bị trừ:</span>
                                                <span className="font-bold text-red-700">
                                                    {/* @ts-ignore */}
                                                    − {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.latePenaltyAmount)}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-red-600 pt-0.5 border-t border-red-300/60">
                                                Từ lần trễ thứ 4, mỗi lần trễ thêm sẽ bị trừ thêm 1 giờ lương.
                                            </p>
                                        </div>
                                    )}
                                    {/* @ts-ignore */}
                                    {stats.lateCount < 4 && (
                                        <p className="text-xs text-red-600 mt-0.5">Vui lòng chú ý thời gian làm việc. Từ lần thứ 4 sẽ bị trừ lương.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Privacy Stats */}
                        <div id="home-privacy-stats">
                            <PrivacyStats
                                totalHours={stats.totalHours}
                                totalSalary={stats.totalSalary}
                                daysWorked={stats.daysWorked}
                                baseSalary={stats.baseSalary}
                                totalAdjustments={stats.totalAdjustments}
                                latePenaltyHours={(stats as any).latePenaltyHours}
                                latePenaltyAmount={(stats as any).latePenaltyAmount}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                        </div>

                        <div id="home-checkin-buttons">
                            <CheckInButtons
                                userId={user?.id!}
                                todayCheckins={user?.checkins || []}
                                todayShift={todayShift ? {
                                    ...todayShift,
                                    start: todayShift.start.toISOString(),
                                    end: todayShift.end.toISOString()
                                } : null}
                            />
                        </div>

                        {/* Gacha Game */}
                        <div id="home-gacha" className="pt-2 space-y-3">
                            <GachaButton userId={user?.id!} hasCheckedIn={!!hasCheckedInToday} isAdmin={user?.role === 'ADMIN'} />
                            <a href="/rewards" className="block w-full">
                                <Button variant="outline" className="w-full h-11 text-sm font-bold border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 hover:from-yellow-100 hover:to-orange-100 shadow-sm transition-all hover:scale-[1.01]">
                                    🏆 Bảng Vàng & Khen Thưởng
                                </Button>
                            </a>
                        </div>

                        {/* Sticky Notes Widget */}
                        <div id="home-sticky" className="pt-2">
                            <StickyBoard notes={serializedNotes} currentUser={session?.user} />
                        </div>

                        <div id="home-nav">
                            <div className="flex gap-3 pt-2">
                                <a href="/history" className="flex-1">
                                    <Button variant="outline" className="w-full text-xs">
                                        📜 Lịch sử
                                    </Button>
                                </a>
                                <a href="/payroll" className="flex-1">
                                    <Button variant="outline" className="w-full text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
                                        💰 Chi tiết lương
                                    </Button>
                                </a>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <a href="/schedule" className="block w-full">
                                    <Button variant="outline" className="w-full text-xs">
                                        📅 Đăng ký Lịch
                                    </Button>
                                </a>
                                <a href="/requests" className="block w-full">
                                    <Button variant="ghost" className="w-full text-xs text-muted-foreground bg-gray-100/50">
                                        📝 Xin giải trình
                                    </Button>
                                </a>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <a href="/tasks" className="block w-full">
                                    <Button variant="default" className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-1">
                                        💼 Job WFH
                                    </Button>
                                </a>
                                <a href="/packing" className="block w-full">
                                    <Button variant="default" className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white px-1">
                                        📦 Đóng gói
                                    </Button>
                                </a>
                                <a href="/carrying" className="block w-full">
                                    <Button variant="default" className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white px-1">
                                        🛗 Bưng lầu
                                    </Button>
                                </a>
                            </div>

                            {(user?.staffTasksAllowed || user?.role === 'ADMIN') && (
                                <div className="mt-3">
                                    <a href="/staff-tasks" className="block w-full">
                                        <Button variant="default" className="w-full h-11 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md transition-all hover:scale-[1.01]">
                                            🎯 Công việc và KPI
                                        </Button>
                                    </a>
                                </div>
                            )}
                        </div>
                        {/* Admin Link... */}
                        {user?.role === 'ADMIN' && (
                            <div className="pt-2 text-center border-t border-dashed mt-4">
                                <a href="/admin" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 mt-4">
                                    🔧 Admin Dashboard
                                </a>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <div className="mt-6 text-[10px] text-muted-foreground font-mono opacity-50">
                Lim Art Internal Tool
            </div>
        </main>
    )
}
