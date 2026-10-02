import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import AdminTour from "@/components/admin/AdminTour";
import TourHelpButton from "@/components/admin/TourHelpButton";
import ChangelogPopup from "@/components/admin/ChangelogPopup";
import { LATEST_VERSION, CHANGELOGS } from "@/lib/changelogs";
import { Toaster } from "sonner";

export function AdminLayout() {
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-slate-800 font-sans">
      {/* Toast Notification Provider */}
      <Toaster position="top-right" richColors closeButton />

      {/* Guided Tour System */}
      <AdminTour />
      <TourHelpButton />

      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[240px] z-40">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-[240px] flex flex-col min-h-screen">
        <Header onOpenChangelog={() => setChangelogOpen(true)} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Changelog Popup */}
      <ChangelogPopup
        open={changelogOpen}
        onOpenChange={setChangelogOpen}
        latestVersion={LATEST_VERSION}
        changelog={CHANGELOGS[0]}
      />
    </div>
  );
}
