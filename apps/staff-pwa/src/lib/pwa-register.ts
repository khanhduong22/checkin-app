import { registerSW } from "virtual:pwa-register";

export function initPWARegistration(onNeedRefresh?: () => void, onOfflineReady?: () => void) {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log("[PWA] New version detected, updating service worker...");
        updateSW(true);
        onNeedRefresh?.();
      },
      onOfflineReady() {
        console.log("[PWA] App is ready to work offline.");
        onOfflineReady?.();
      },
      onRegisterError(error) {
        console.error("[PWA] Service worker registration error:", error);
      },
    });

    return updateSW;
  }
  return () => {};
}

export async function clearPwaCacheAndReload() {
  if (typeof window !== "undefined") {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.error("[PWA] Error purging cache:", e);
    }
    window.location.href = window.location.pathname + "?refresh=" + Date.now();
  }
}
