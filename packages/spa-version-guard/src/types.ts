declare global {
  var __APP_BUILD_ID__: string | undefined;
}

export interface VersionChangeItem {
  icon: string;
  badge: string;
  badgeColor?: string;
  title: string;
  description: string;
}

export interface VersionRelease {
  version: string;
  releaseDate: string;
  title: string;
  subtitle?: string;
  changes: VersionChangeItem[];
}

export type VersionSkipReason =
  | 'cooldown'
  | 'logging_in'
  | 'mock_user'
  | 'not_visible'
  | 'fetch_error'
  | 'same_version';

export interface VersionCheckResult {
  hasUpdate: boolean;
  clientVersion: string;
  serverVersion?: string;
  release?: VersionRelease;
  skippedReason?: VersionSkipReason;
  rawResponse?: unknown;
}

export interface VersionGuardConfig {
  /**
   * API endpoint or static JSON URL to check for new version.
   * Defaults to '/version.json' (or `${base}version.json`).
   */
  endpoint?: string;

  /**
   * The client application version compiled into the build.
   * Defaults to `__APP_BUILD_ID__` or 'development'.
   */
  currentVersion?: string;

  /**
   * Current release details for What's New modal.
   */
  currentRelease?: VersionRelease;

  /**
   * Polling interval in milliseconds.
   * Default: 180000 (3 minutes).
   */
  pollIntervalMs?: number;

  /**
   * Delay before initial check on mount to yield frame 1 bandwidth.
   * Default: 3000 ms.
   */
  initialDelayMs?: number;

  /**
   * Strict anti-infinite-loop cooldown window in milliseconds.
   * Once updated/reloaded, won't trigger another reload within this window.
   * Default: 300000 ms (5 minutes).
   */
  cooldownMs?: number;

  /**
   * Prefix for storage keys (sessionStorage / localStorage).
   * Default: 'checkin_spa_version_'
   */
  storagePrefix?: string;

  /**
   * Whether to automatically reload when a new version is detected.
   * Default: true.
   */
  autoReload?: boolean;

  /**
   * Delay before executing window.location.reload() to let user see banner/toast.
   * Default: 1500 ms.
   */
  reloadDelayMs?: number;

  /**
   * Check when tab visibility changes to visible.
   * Default: true.
   */
  checkOnVisibility?: boolean;

  /**
   * Check when window gains focus.
   * Default: true.
   */
  checkOnFocus?: boolean;

  /**
   * Callback fired when an update is detected.
   */
  onUpdateDetected?: (result: VersionCheckResult) => void;

  /**
   * Custom function to clear caches / service workers.
   */
  customCleanup?: () => Promise<void>;
}
