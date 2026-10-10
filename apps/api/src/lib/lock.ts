import { getRedisClient } from "./cache";

export interface LockResult {
  acquired: boolean;
  release: () => Promise<void>;
}

const memoryLocks = new Map<string, NodeJS.Timeout>();

/**
 * Acquire a distributed atomic lock using Valkey / Redis with in-memory fallback.
 * @param resourceKey Unique lock key identifier
 * @param ttlMs Time-to-live in milliseconds (default: 5000ms)
 */
export async function acquireLock(
  resourceKey: string,
  ttlMs: number = 5000
): Promise<LockResult> {
  const client = getRedisClient();

  if (client) {
    try {
      const res = await client.set(resourceKey, "1", "PX", ttlMs, "NX");
      if (res === "OK") {
        let released = false;
        return {
          acquired: true,
          release: async () => {
            if (released) return;
            released = true;
            try {
              await client.del(resourceKey);
            } catch (err) {
              console.warn(`[Lock Release Warning] Key ${resourceKey}:`, err);
            }
          },
        };
      }
      return { acquired: false, release: async () => {} };
    } catch (err) {
      console.warn(`[Valkey Lock Error, using memory fallback] Key ${resourceKey}:`, err);
    }
  }

  // In-memory fallback lock
  if (memoryLocks.has(resourceKey)) {
    return { acquired: false, release: async () => {} };
  }

  const timeoutId = setTimeout(() => {
    memoryLocks.delete(resourceKey);
  }, ttlMs);

  memoryLocks.set(resourceKey, timeoutId);
  let released = false;

  return {
    acquired: true,
    release: async () => {
      if (released) return;
      released = true;
      clearTimeout(timeoutId);
      memoryLocks.delete(resourceKey);
    },
  };
}

/**
 * Reset all active memory locks (useful for test isolation)
 */
export function _resetLocks(): void {
  for (const timeoutId of memoryLocks.values()) {
    clearTimeout(timeoutId);
  }
  memoryLocks.clear();
}
