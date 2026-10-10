import React, { useState, useEffect } from 'react';
import { VersionRelease } from '../types';

export interface WhatsNewModalProps {
  release?: VersionRelease;
  forceOpen?: boolean;
  storageKey?: string;
  onClose?: () => void;
  onAction?: () => void;
  actionText?: string;
  className?: string;
}

const DEFAULT_STORAGE_KEY = 'checkin_seen_version';

export function WhatsNewModal({
  release,
  forceOpen = false,
  storageKey = DEFAULT_STORAGE_KEY,
  onClose,
  onAction,
  actionText = 'BẮT ĐẦU TRẢI NGHIỆM',
  className = '',
}: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    if (!release) return;

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const seenVersion = localStorage.getItem(storageKey);
        if (seenVersion !== release.version) {
          // Slight delay so the page renders first before gracefully opening modal
          const timer = setTimeout(() => setIsOpen(true), 600);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, [forceOpen, release, storageKey]);

  const handleDismiss = () => {
    if (release && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, release.version);
      } catch {}
    }
    setIsOpen(false);
    onClose?.();
  };

  const handleAction = () => {
    if (release && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, release.version);
      } catch {}
    }
    setIsOpen(false);
    onClose?.();
    onAction?.();
  };

  if (!isOpen || !release) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in ${className}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-modal-title"
    >
      <div
        className="relative w-full max-w-[420px] max-h-[88vh] overflow-hidden rounded-3xl bg-[#0D121F] border border-sky-500/30 shadow-[0_0_50px_rgba(56,189,248,0.25)] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative pt-6 px-6 pb-4 border-b border-white/10 flex items-start justify-between">
          <div className="flex flex-col gap-1.5 pr-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                PHIÊN BẢN {release.version}
              </span>
              {release.releaseDate && (
                <span className="text-[11px] text-slate-400 font-mono">{release.releaseDate}</span>
              )}
            </div>
            <h2 id="whats-new-modal-title" className="text-xl font-bold text-white tracking-tight">
              {release.title}
            </h2>
            {release.subtitle && (
              <p className="text-xs text-slate-400 line-clamp-2">
                {release.subtitle}
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Changelog Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
          {release.changes && release.changes.length > 0 ? (
            release.changes.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px] select-none">
                    {item.icon || '✨'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border ${
                          item.badgeColor || 'text-sky-400 border-sky-500/30 bg-sky-500/10'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Phiên bản mới với nhiều cải tiến hiệu năng và độ ổn định.
            </p>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-white/10 bg-[#0A0E18]/80 backdrop-blur-md">
          <button
            onClick={handleAction}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:opacity-95 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2"
          >
            <span>{actionText}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default WhatsNewModal;
