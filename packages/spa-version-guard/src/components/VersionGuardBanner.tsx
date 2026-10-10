import React from 'react';

export interface VersionGuardBannerProps {
  isUpdating: boolean;
  message?: string;
  className?: string;
}

export function VersionGuardBanner({
  isUpdating,
  message = 'Đang cập nhật phiên bản mới nhất...',
  className = '',
}: VersionGuardBannerProps) {
  if (!isUpdating) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-6 py-3.5 bg-[#161822]/95 backdrop-blur-md border border-orange-500/60 rounded-2xl shadow-2xl shadow-orange-500/25 text-white animate-pulse ${className}`}
    >
      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
      <span className="text-sm font-semibold tracking-wide text-orange-400">
        {message}
      </span>
    </div>
  );
}

export default VersionGuardBanner;
