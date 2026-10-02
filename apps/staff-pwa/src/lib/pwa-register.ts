import { registerSW } from "virtual:pwa-register";

export function initPWARegistration(onNeedRefresh?: () => void, onOfflineReady?: () => void) {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log("[PWA] New content available, reload required.");
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
