import { useState, useEffect, useRef, useCallback } from 'react';
import { VersionGuardConfig, VersionRelease, VersionCheckResult } from '../types';
import {
  checkAppVersion,
  applyAppUpdate,
  getClientAppVersion,
} from '../checker';

export interface UseAppVersionGuardReturn {
  isUpdating: boolean;
  hasUpdate: boolean;
  serverVersion: string | null;
  clientVersion: string;
  release: VersionRelease | null;
  checkNow: () => Promise<VersionCheckResult>;
  triggerUpdate: () => Promise<void>;
}

export function useAppVersionGuard(config: VersionGuardConfig = {}): UseAppVersionGuardReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [release, setRelease] = useState<VersionRelease | null>(config.currentRelease || null);

  const isReloadingRef = useRef(false);
  const clientVersion = config.currentVersion || getClientAppVersion();

  const handleUpdateDetected = useCallback(
    async (result: VersionCheckResult) => {
      if (isReloadingRef.current) return;
      isReloadingRef.current = true;

      setHasUpdate(true);
      if (result.serverVersion) setServerVersion(result.serverVersion);
      if (result.release) setRelease(result.release);

      config.onUpdateDetected?.(result);

      if (config.autoReload !== false) {
        setIsUpdating(true);
        await applyAppUpdate({
          reloadDelayMs: config.reloadDelayMs,
          prefix: config.storagePrefix,
          customCleanup: config.customCleanup,
        });
      }
    },
    [config]
  );

  const checkNow = useCallback(async (): Promise<VersionCheckResult> => {
    if (isReloadingRef.current) {
      return {
        hasUpdate: false,
        clientVersion,
        skippedReason: 'cooldown',
      };
    }

    const result = await checkAppVersion(config);
    if (result.hasUpdate) {
      await handleUpdateDetected(result);
    }
    return result;
  }, [config, clientVersion, handleUpdateDetected]);

  const triggerUpdate = useCallback(async (): Promise<void> => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;
    setIsUpdating(true);
    await applyAppUpdate({
      reloadDelayMs: config.reloadDelayMs,
      prefix: config.storagePrefix,
      customCleanup: config.customCleanup,
    });
  }, [config]);

  useEffect(() => {
    // Initial check delayed by initialDelayMs (default 3,000ms) to yield frame 1 bandwidth
    const initialDelay = config.initialDelayMs ?? 3000;
    const initialTimer = setTimeout(() => {
      checkNow();
    }, initialDelay);

    // Visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkNow();
      }
    };

    // Window focus handler
    const handleFocus = () => {
      checkNow();
    };

    if (config.checkOnVisibility !== false && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    if (config.checkOnFocus !== false && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    // Periodic check interval (default 180,000ms = 3 minutes)
    const pollInterval = config.pollIntervalMs ?? 180000;
    let intervalTimer: ReturnType<typeof setInterval> | undefined;
    if (pollInterval > 0) {
      intervalTimer = setInterval(() => {
        checkNow();
      }, pollInterval);
    }

    return () => {
      clearTimeout(initialTimer);
      if (intervalTimer) clearInterval(intervalTimer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [checkNow, config.initialDelayMs, config.pollIntervalMs, config.checkOnVisibility, config.checkOnFocus]);

  return {
    isUpdating,
    hasUpdate,
    serverVersion,
    clientVersion,
    release,
    checkNow,
    triggerUpdate,
  };
}

export default useAppVersionGuard;
