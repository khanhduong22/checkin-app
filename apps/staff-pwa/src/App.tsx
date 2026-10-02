import React, { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { BottomNavigation, NavTab } from "./components/BottomNavigation";
import { HomeCheckinView } from "./views/HomeCheckinView";
import { ScheduleView } from "./views/ScheduleView";
import { TasksView } from "./views/TasksView";
import { PayrollView } from "./views/PayrollView";
import { ProfileView } from "./views/ProfileView";
import { HistoryView } from "./views/HistoryView";
import { RequestsView } from "./views/RequestsView";
import { LuckyWheelView } from "./views/LuckyWheelView";
import { LoginView } from "./views/LoginView";
import useSWR from "swr";
import {
  getCachedProfile,
  saveCachedProfile,
  DEFAULT_STAFF,
  StaffProfile,
  fetcher,
  getAuthToken,
} from "./lib/api-client";
import { useOfflineQueue } from "./lib/use-offline-queue";
import { initPWARegistration } from "./lib/pwa-register";
import { RouterProvider, usePathname, useRouter } from "./lib/router";

function AppContent() {
  const pathname = usePathname();
  const router = useRouter();

  // Authentication Guard: if no token exists and not on /login, redirect to /login
  useEffect(() => {
    const token = getAuthToken();
    if (!token && pathname !== "/login") {
      router.push("/login");
    }
  }, [pathname, router]);

  const { data: homeRes } = useSWR<{ success: boolean; data: any }>(
    getAuthToken() ? "/api/staff/home-data" : null,
    fetcher
  );
  const liveUser = homeRes?.data?.user;

  const profile: StaffProfile = liveUser
    ? {
        id: liveUser.id,
        name: liveUser.name || "Nhân viên LimArt",
        email: liveUser.email || "",
        role: liveUser.role || "USER",
        avatarUrl: liveUser.image || "/capybara_mascot.png",
        employmentType: liveUser.employmentType || "PART_TIME",
        hourlyRate: liveUser.hourlyRate || 25000,
        streakDays: homeRes?.data?.streak || 0,
        gachaTickets: 1,
        achievements: liveUser.achievements || [],
      }
    : getCachedProfile();

  useEffect(() => {
    if (liveUser) {
      saveCachedProfile(profile);
    }
  }, [liveUser]);

  // Offline queue with silent background sync (no technical badges/banners)
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineQueue();

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncNow().then((res) => {
        if (res && res.syncedCount > 0) {
          toast.success(`Đã tự động đồng bộ ${res.syncedCount} lượt chấm công! 🍊`);
        }
      });
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  // Map pathname to BottomNav tab
  const getTabFromPath = (path: string): NavTab => {
    if (path.startsWith("/schedule")) return "schedule";
    if (path.startsWith("/tasks") || path.startsWith("/packing") || path.startsWith("/carrying") || path.startsWith("/staff-tasks"))
      return "tasks";
    if (path.startsWith("/payroll")) return "payroll";
    if (path.startsWith("/profile")) return "profile";
    return "home";
  };

  const currentTab = getTabFromPath(pathname);

  const handleTabChange = (tab: NavTab) => {
    if (tab === "home") router.push("/");
    else router.push(`/${tab}`);
  };

  // Login view is full-screen without BottomNav
  if (pathname === "/login") {
    return (
      <div
        className="min-h-screen text-stone-900 font-sans selection:bg-amber-400 selection:text-stone-950 flex flex-col justify-center relative"
        style={{
          backgroundImage: 'url(/capybara_bg.png)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="fixed inset-0 bg-[#faf6f0]/85 pointer-events-none -z-10" />
        <Toaster position="top-center" richColors theme="light" closeButton />
        <LoginView />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-stone-900 font-sans selection:bg-amber-400 selection:text-stone-950 flex flex-col relative"
      style={{
        backgroundImage: 'url(/capybara_bg.png)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="fixed inset-0 bg-[#faf6f0]/85 pointer-events-none -z-10" />
      {/* Toast Notifications */}
      <Toaster position="top-center" richColors theme="light" closeButton />

      {/* Centered Mobile Shell Frame (Warm LimArt Tone) */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#faf6f0]/95 shadow-2xl border-x border-orange-100/60 flex flex-col relative backdrop-blur-xs">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {pathname === "/" && <HomeCheckinView />}
          {pathname === "/schedule" && <ScheduleView />}
          {pathname === "/payroll" && <PayrollView />}
          {pathname === "/history" && <HistoryView />}
          {pathname === "/requests" && <RequestsView />}
          {(pathname === "/lucky-wheel" || pathname === "/rewards") && <LuckyWheelView />}
          {(pathname === "/tasks" || pathname === "/packing" || pathname === "/carrying" || pathname === "/staff-tasks") && (
            <TasksView />
          )}
          {pathname === "/profile" && <ProfileView profile={profile} />}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <BottomNavigation
          currentTab={currentTab}
          onChangeTab={handleTabChange}
        />
      </div>
    </div>
  );
}

export const App: React.FC = () => {
  // Initialize PWA Service Worker Registration
  useEffect(() => {
    initPWARegistration();
  }, []);

  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
};

export default App;
