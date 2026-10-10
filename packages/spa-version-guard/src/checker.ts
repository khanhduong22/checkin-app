import { VersionCheckResult, VersionGuardConfig } from './types';

const DEFAULT_PREFIX = 'checkin_spa_version_';
const DEFAULT_COOLDOWN_MS = 300000; // 5 minutes
const DEFAULT_RELOAD_DELAY_MS = 1500;
const FETCH_TIMEOUT_MS = 5000;

export function getClientAppVersion(fallback = 'development'): string {
  if (typeof __APP_BUILD_ID__ !== 'undefined' && __APP_BUILD_ID__) {
    return __APP_BUILD_ID__;
  }
  if (typeof window !== 'undefined' && (window as unknown as Record<string, string>).__APP_BUILD_ID__) {
    return (window as unknown as Record<string, string>).__APP_BUILD_ID__;
  }
  return fallback;
}

export function getStorageKey(prefix: string, key: string): string {
  return `${prefix}${key}`;
}

function getSessionStorage(): Storage | undefined {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage;
    }
  } catch {}
  return undefined;
}

function getLocalStorage(): Storage | undefined {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {}
  return undefined;
}

export function isCooldownActive(prefix = DEFAULT_PREFIX, cooldownMs = DEFAULT_COOLDOWN_MS): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    const lastReload = storage.getItem(getStorageKey(prefix, 'last_reload_ts'));
    if (!lastReload) return false;
    const elapsed = Date.now() - Number(lastReload);
    return elapsed >= 0 && elapsed < cooldownMs;
  } catch {
    return false;
  }
}

export function setReloadTimestamp(prefix = DEFAULT_PREFIX): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(getStorageKey(prefix, 'last_reload_ts'), String(Date.now()));
  } catch {}
}

export function clearReloadTimestamp(prefix = DEFAULT_PREFIX): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(getStorageKey(prefix, 'last_reload_ts'));
  } catch {}
}

export async function clearAppCachesAndServiceWorkers(): Promise<void> {
  // 1. Delete all CacheStorage entries
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) {
      console.warn('[VersionGuard] Cache cleanup warning:', err);
    }
  }

  // 2. Force service worker registrations to update immediately
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.update()));
    } catch (err) {
      console.warn('[VersionGuard] Service worker update warning:', err);
    }
  }
}

export function resolveDefaultEndpoint(): string {
  let base = '/';
  try {
    // Check Vite's import.meta.env.BASE_URL if available
    const envBase = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
    if (envBase) {
      base = envBase;
    }
  } catch {}

  if (!base.endsWith('/')) {
    base += '/';
  }
  return `${base}version.json`;
}

export async function checkAppVersion(config: VersionGuardConfig = {}): Promise<VersionCheckResult> {
  const prefix = config.storagePrefix ?? DEFAULT_PREFIX;
  const cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const clientVersion = config.currentVersion || getClientAppVersion();

  // 1. Strict Anti-Infinite-Loop Cooldown Guard
  if (isCooldownActive(prefix, cooldownMs)) {
    return {
      hasUpdate: false,
      clientVersion,
      skippedReason: 'cooldown',
    };
  }

  // 2. Skip while actively authenticating or in mock user test session
  const sessStorage = getSessionStorage();
  const locStorage = getLocalStorage();
  try {
    if (sessStorage?.getItem('is_logging_in') === 'true') {
      return {
        hasUpdate: false,
        clientVersion,
        skippedReason: 'logging_in',
      };
    }
    if (
      locStorage?.getItem('winter_arc_mock_user') ||
      locStorage?.getItem('mock_user') ||
      locStorage?.getItem('e2e_mock_mode') === 'true'
    ) {
      return {
        hasUpdate: false,
        clientVersion,
        skippedReason: 'mock_user',
      };
    }
  } catch {}

  // 3. Tab Visibility Guard: yield resources when document is hidden
  if (
    config.checkOnVisibility !== false &&
    typeof document !== 'undefined' &&
    document.visibilityState !== 'visible'
  ) {
    return {
      hasUpdate: false,
      clientVersion,
      skippedReason: 'not_visible',
    };
  }

  // 4. Resolve endpoint and prepare request
  const endpoint = config.endpoint || resolveDefaultEndpoint();
  const sep = endpoint.includes('?') ? '&' : '?';
  const fetchUrl = `${endpoint}${sep}t=${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        hasUpdate: false,
        clientVersion,
        skippedReason: 'fetch_error',
      };
    }

    const data = await res.json();
    const serverVersion = (data?.version || data?.buildId || data?.appVersion)?.toString();

    if (serverVersion && serverVersion !== clientVersion) {
      return {
        hasUpdate: true,
        clientVersion,
        serverVersion,
        release: data?.release,
        rawResponse: data,
      };
    }

    return {
      hasUpdate: false,
      clientVersion,
      serverVersion: serverVersion || clientVersion,
      release: data?.release,
      skippedReason: 'same_version',
      rawResponse: data,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      hasUpdate: false,
      clientVersion,
      skippedReason: 'fetch_error',
    };
  }
}

export async function applyAppUpdate(options?: {
  reloadDelayMs?: number;
  prefix?: string;
  customCleanup?: () => Promise<void>;
}): Promise<void> {
  const prefix = options?.prefix ?? DEFAULT_PREFIX;
  const reloadDelayMs = options?.reloadDelayMs ?? DEFAULT_RELOAD_DELAY_MS;

  // Activate cooldown immediately so subsequent reloads don't loop
  setReloadTimestamp(prefix);

  // Perform cache & SW cleanup
  if (options?.customCleanup) {
    try {
      await options.customCleanup();
    } catch (err) {
      console.warn('[VersionGuard] Custom cleanup error:', err);
    }
  } else {
    await clearAppCachesAndServiceWorkers();
  }

  // Gracefully reload window
  if (typeof window !== 'undefined' && window.location) {
    setTimeout(() => {
      window.location.reload();
    }, reloadDelayMs);
  }
}
