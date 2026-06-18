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
import { Suspense } from "react";

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
                achievements: true
            }
        })

        // VIEW AS MODE (Admin Only)
        if (user?.role === 'ADMIN' && resolvedSearchParams.viewAsUserId) {
            const targetUser = await prisma.user.findUnique({
                where: { id: resolvedSearchParams.viewAsUserId },
                include: {
                    achievements: true
                }
            });

            if (targetUser) {
                user = targetUser;
                isViewAsMode = true;
            }
        }
    }

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
                        <Link href="/admin/employees">
                            <Button variant="secondary" size="sm" className="h-7 text-xs">Thoát</Button>
                        </Link>
                    </div>
                )}

                {/* Special Days Widget */}
                <Suspense fallback={<SpecialDaysSkeleton />}>
                    <SpecialDaysWidgetWrapper userId={user?.id!} />
                </Suspense>

                {/* Announcements */}
                <div id="home-announcement">
                    <Suspense fallback={<AnnouncementSkeleton />}>
                        <AnnouncementsWrapper />
                    </Suspense>
                </div>

                {/* Rejected Tasks Alert */}
                <Suspense fallback={null}>
                    <RejectedTasksAlertWrapper userId={user?.id!} />
                </Suspense>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm relative overflow-hidden">
                    {/* Streak & Swap Badges */}
                    <Suspense fallback={<StreakAndSwapSkeleton />}>
                        <StreakAndSwapWidget userId={user?.id!} />
                    </Suspense>

                    <div className="p-6 pb-4 flex items-center justify-between">
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
                        {/* Privacy Stats */}
                        <Suspense fallback={<PrivacyStatsSkeleton />}>
                            <PrivacyStatsWrapper userId={user?.id!} />
                        </Suspense>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                        </div>

                        {/* Check-In Buttons */}
                        <div id="home-checkin-buttons">
                            <Suspense fallback={<CheckInButtonsSkeleton />}>
                                <CheckInButtonsWrapper userId={user?.id!} />
                            </Suspense>
                        </div>

                        {/* Gacha Game */}
                        <div id="home-gacha" className="pt-2 space-y-3">
                            <Suspense fallback={<GachaSkeleton />}>
                                <GachaWrapper userId={user?.id!} isAdmin={user?.role === 'ADMIN'} />
                            </Suspense>
                            <a href="/rewards" className="block w-full">
                                <Button variant="outline" className="w-full h-11 text-sm font-bold border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 hover:from-yellow-100 hover:to-orange-100 shadow-sm transition-all hover:scale-[1.01]">
                                    🏆 Bảng Vàng & Khen Thưởng
                                </Button>
                            </a>
                        </div>

                        {/* Sticky Notes Widget */}
                        <div id="home-sticky" className="pt-2">
                            <Suspense fallback={<StickyBoardSkeleton />}>
                                <StickyBoardWrapper currentUser={session?.user} />
                            </Suspense>
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
                                        <Button variant="default" className="w-full h-11 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md transition-all hover:scale-[1.01] relative flex items-center justify-center gap-2">
                                            🎯 Công việc và KPI
                                            <Suspense fallback={null}>
                                                <StaffTasksButtonBadgeWrapper userId={user?.id!} />
                                            </Suspense>
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

// --- Async Component Wrappers ---

async function SpecialDaysWidgetWrapper({ userId }: { userId: string }) {
    const { getSpecialDayUsers } = await import("@/lib/special-days");
    const specialUsers = await getSpecialDayUsers();
    const SpecialDaysWidget = (await import("@/components/home/SpecialDaysWidget")).default;
    return <SpecialDaysWidget specialUsers={specialUsers} currentUserId={userId} enableCalendar={false} />;
}

async function AnnouncementsWrapper() {
    const announcements = await prisma.announcement.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
    });
    const AnnouncementBar = (await import("@/components/AnnouncementBar")).default;
    return <AnnouncementBar announcements={announcements} />;
}

async function RejectedTasksAlertWrapper({ userId }: { userId: string }) {
    const rejectedTasksCount = await prisma.staffTask.count({
        where: {
            assigneeId: userId,
            status: "REJECTED"
        }
    });

    if (rejectedTasksCount === 0) return null;

    return (
        <div className="border border-rose-200 bg-rose-50/90 rounded-xl p-4 flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="p-2 bg-rose-100 rounded-full text-rose-700 leading-none">
                <span className="text-base">⚠️</span>
            </div>
            <div className="flex-grow space-y-1">
                <h3 className="text-sm font-bold text-rose-800">Yêu cầu sửa đổi công việc</h3>
                <p className="text-xs text-rose-700 leading-relaxed">
                    Bạn có <span className="font-extrabold text-rose-900">{rejectedTasksCount}</span> công việc khoán/KPI bị Admin từ chối và yêu cầu sửa đổi.
                </p>
                <div className="pt-1.5">
                    <Link href="/staff-tasks">
                        <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-7 text-xs px-3 shadow-xs">
                            Xem chi tiết & sửa ngay
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

async function StreakAndSwapWidget({ userId }: { userId: string }) {
    const { calculateStreak } = await import("@/lib/streak");
    const [streak, swapCount] = await Promise.all([
        calculateStreak(userId),
        prisma.workShift.count({
            where: {
                isOpenForSwap: true,
                userId: { not: userId },
                start: { gte: new Date() }
            }
        })
    ]);

    return (
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
    );
}

async function PrivacyStatsWrapper({ userId }: { userId: string }) {
    const { getUserMonthlyStats } = await import("@/lib/stats");
    const stats = await getUserMonthlyStats(userId);
    const PrivacyStats = (await import("@/components/PrivacyStats")).default;

    return (
        <div className="space-y-4">
            {stats.lateCount >= 2 && (
                <div className={`border rounded-lg p-3 flex items-start gap-3 mb-4 animate-in fade-in slide-in-from-top-2 ${
                    stats.lateCount >= 4
                        ? 'bg-red-100 border-red-400'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className={`p-2 rounded-full ${stats.lateCount >= 4 ? 'bg-red-200' : 'bg-red-100'}`}>
                        <span className="text-xl">{stats.lateCount >= 4 ? '🚨' : '⚠️'}</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800">
                            {stats.lateCount >= 4 ? '⛔ Bị trừ lương do đi trễ' : 'Cảnh báo đi trễ'}
                        </h3>
                        <p className="text-xs text-red-700 mt-1">
                            Bạn đã đi trễ <span className="font-bold">{stats.lateCount}</span> lần trong tháng này.
                        </p>
                        {stats.latePenaltyHours > 0 && (
                            <div className="mt-2 bg-red-200/60 rounded-md px-2 py-1.5 text-xs text-red-900 space-y-0.5">
                                <div className="flex justify-between">
                                    <span>⏱ Số giờ bị trừ:</span>
                                    <span className="font-bold">{stats.latePenaltyHours} giờ</span>
                                </div>
                                <div className="flex justify-between border-t border-red-300/60 pt-0.5">
                                    <span>💸 Tiền bị trừ:</span>
                                    <span className="font-bold text-red-700">
                                        − {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.latePenaltyAmount)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-red-600 pt-0.5 border-t border-red-300/60">
                                    Từ lần trễ thứ 4, mỗi lần trễ thêm sẽ bị trừ thêm 1 giờ lương.
                                </p>
                            </div>
                        )}
                        {stats.lateCount < 4 && (
                            <p className="text-xs text-red-600 mt-0.5">Vui lòng chú ý thời gian làm việc. Từ lần thứ 4 sẽ bị trừ lương.</p>
                        )}
                    </div>
                </div>
            )}

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
        </div>
    );
}

async function CheckInButtonsWrapper({ userId }: { userId: string }) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayCheckins, todayShift] = await Promise.all([
        prisma.checkIn.findMany({
            where: {
                userId,
                timestamp: { gte: todayStart }
            },
            orderBy: { timestamp: 'desc' }
        }),
        prisma.workShift.findFirst({
            where: {
                userId,
                start: { gte: todayStart, lte: todayEnd }
            },
            orderBy: { start: 'asc' }
        })
    ]);

    return (
        <CheckInButtons
            userId={userId}
            todayCheckins={todayCheckins}
            todayShift={todayShift ? {
                ...todayShift,
                start: todayShift.start.toISOString(),
                end: todayShift.end.toISOString()
            } : null}
        />
    );
}

async function GachaWrapper({ userId, isAdmin }: { userId: string, isAdmin: boolean }) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hasCheckedInToday = await prisma.checkIn.findFirst({
        where: {
            userId,
            timestamp: { gte: todayStart },
            type: 'checkin'
        }
    });

    return <GachaButton userId={userId} hasCheckedIn={!!hasCheckedInToday} isAdmin={isAdmin} />;
}

async function StickyBoardWrapper({ currentUser }: { currentUser: any }) {
    const notes = await prisma.stickyNote.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { user: true }
    });

    const serializedNotes = notes.map((n: any) => ({
        ...n,
        createdAt: n.createdAt.toISOString()
    }));

    const StickyBoard = (await import("@/components/StickyBoard")).default;

    return <StickyBoard notes={serializedNotes} currentUser={currentUser} />;
}

async function StaffTasksButtonBadgeWrapper({ userId }: { userId: string }) {
    const rejectedTasksCount = await prisma.staffTask.count({
        where: {
            assigneeId: userId,
            status: "REJECTED"
        }
    });

    if (rejectedTasksCount === 0) return null;

    return (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white animate-bounce shadow-sm border border-white">
            {rejectedTasksCount}
        </span>
    );
}

// --- Loading Skeletons ---

function AnnouncementSkeleton() {
    return (
        <div className="h-10 bg-gray-200/50 animate-pulse rounded-lg w-full" />
    );
}

function SpecialDaysSkeleton() {
    return (
        <div className="h-14 bg-gray-200/50 animate-pulse rounded-xl w-full" />
    );
}

function StreakAndSwapSkeleton() {
    return (
        <div className="h-6 w-24 bg-gray-200/50 animate-pulse rounded-full" />
    );
}

function PrivacyStatsSkeleton() {
    return (
        <div className="space-y-3 p-4 bg-gray-50/50 border rounded-xl animate-pulse">
            <div className="h-4 bg-gray-200/50 rounded-md w-1/3" />
            <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-gray-200/50 rounded-md" />
                <div className="h-12 bg-gray-200/50 rounded-md" />
                <div className="h-12 bg-gray-200/50 rounded-md" />
            </div>
        </div>
    );
}

function CheckInButtonsSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-12 bg-gray-200/50 rounded-xl w-full" />
            <div className="h-10 bg-gray-200/50 rounded-xl w-full" />
        </div>
    );
}

function GachaSkeleton() {
    return (
        <div className="h-11 bg-gray-200/50 animate-pulse rounded-xl w-full" />
    );
}

function StickyBoardSkeleton() {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200/50 rounded-md w-1/4" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-24 bg-gray-200/50 rounded-lg" />
                <div className="h-24 bg-gray-200/50 rounded-lg" />
            </div>
        </div>
    );
}
