import { useState, useEffect, useCallback } from "react";

export const STORAGE_KEY_DISMISSED = "limart_staff_pwa_dismissed";
export const PWA_OPEN_PROMPT_EVENT = "limart:open-pwa-install";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Triggers the PWA install modal to open from anywhere in the app,
 * bypassing dismissal state.
 */
export function triggerPwaInstallPrompt(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PWA_OPEN_PROMPT_EVENT));
  }
}

/**
 * Checks if the web app is running in PWA standalone display mode.
 */
export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Standard W3C display-mode check (Chrome, Safari 16.4+, Edge, Firefox)
  const isDisplayStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches;

  // 2. iOS Safari legacy navigator property
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // 3. Android Trusted Web Activity / WebAPK
  const isTwa = typeof document !== "undefined" && document.referrer.includes("android-app://");

  return isDisplayStandalone || isIosStandalone || isTwa;
}

/**
 * Detects if the current user is browsing from a mobile device or tablet.
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isSmallViewport = window.innerWidth <= 768;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  return isIOS || isAndroid || (isSmallViewport && hasTouch);
}

/**
 * Identifies the mobile platform for tailored installation instructions.
 */
export function getMobilePlatform(): "ios" | "android" | "other" {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  return "other";
}

// Global cached deferred prompt in case event fired before hook mounted
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePwaInstallPrompt(autoPromptDelayMs = 2500) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = isPwaStandalone();
    const mobile = isMobileDevice();
    const plat = getMobilePlatform();

    setIsStandalone(standalone);
    setIsMobile(mobile);
    setPlatform(plat);

    // If global deferred prompt was already captured
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    // Listen for Chromium native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // Listen for manual trigger events from elsewhere in the app (e.g. ProfileView)
    const handleManualOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener(PWA_OPEN_PROMPT_EVENT, handleManualOpen);

    // Check if dismissed previously
    const isDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === "true";

    // Auto-prompt on mobile if not in PWA standalone mode and not dismissed
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (mobile && !standalone && !isDismissed && autoPromptDelayMs > 0) {
      timer = setTimeout(() => {
        setIsOpen(true);
      }, autoPromptDelayMs);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener(PWA_OPEN_PROMPT_EVENT, handleManualOpen);
      if (timer) clearTimeout(timer);
    };
  }, [autoPromptDelayMs]);

  const closeModal = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
      } catch (err) {
        console.error("[PWA] Error persisting dismissal:", err);
      }
    }
    setIsOpen(false);
  }, []);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const dismissPermanently = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
      } catch (err) {
        console.error("[PWA] Error persisting dismissal:", err);
      }
    }
    setIsOpen(false);
  }, []);

  const triggerNativeInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === "accepted") {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
          } catch {
            // ignore
          }
        }
        setIsOpen(false);
      }
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Installation prompt error:", err);
    }
  }, [deferredPrompt]);

  return {
    isOpen,
    isStandalone,
    isMobile,
    platform,
    canInstallNative: Boolean(deferredPrompt || globalDeferredPrompt),
    openModal,
    closeModal,
    dismissPermanently,
    triggerNativeInstall,
  };
}
