import React from "react";
import { Loader2 } from "lucide-react";

export function AdminPageLoadingSkeleton() {
  return (
    <div className="w-full min-h-[70vh] p-3 sm:p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 sm:w-64 bg-stone-200 dark:bg-stone-800 rounded-lg animate-pulse" />
          <div className="h-4 w-32 sm:w-48 bg-stone-100 dark:bg-stone-800/60 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Đang tải trang...</span>
          </div>
          <div className="h-9 w-24 bg-stone-200 dark:bg-stone-800 rounded-md animate-pulse" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-200/70 dark:border-stone-800 bg-card p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-orange-100/70 dark:bg-orange-950/40 animate-pulse" />
            </div>
            <div className="h-7 w-28 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
            <div className="h-3 w-36 bg-stone-100 dark:bg-stone-800/60 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content Area / Table Skeleton */}
      <div className="rounded-xl border border-stone-200/70 dark:border-stone-800 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-full sm:w-48 bg-stone-100 dark:bg-stone-800/60 rounded-md animate-pulse" />
            <div className="h-9 w-20 bg-stone-200 dark:bg-stone-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Table Rows skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-stone-50/70 dark:bg-stone-800/30 border border-stone-100/80 dark:border-stone-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 sm:w-48 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
                  <div className="h-3 w-20 sm:w-28 bg-stone-100 dark:bg-stone-800/60 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-6 w-16 bg-stone-200 dark:bg-stone-800 rounded-full animate-pulse hidden sm:block" />
                <div className="h-4 w-20 bg-stone-200 dark:bg-stone-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
