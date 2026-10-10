import { useState, useEffect } from "react";
import {
  subscribeToQueue,
  isNetworkOnline,
  getStoredQueue,
  flushQueue,
  enqueueCheckin,
  OfflineCheckinItem,
} from "./offline-queue";

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(isNetworkOnline());
  const [queue, setQueue] = useState<OfflineCheckinItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch
    getStoredQueue().then(setQueue);
    setIsOnline(isNetworkOnline());

    // Subscribe to offline-queue changes
    const unsubscribe = subscribeToQueue((items, online) => {
      setQueue(items);
      setIsOnline(online);
      const syncing = items.some((i) => i.status === "syncing");
      setIsSyncing(syncing);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const pendingCount = queue.filter(
    (item) => item.status === "pending" || item.status === "failed" || item.status === "syncing"
  ).length;

  return {
    isOnline,
    queue,
    pendingCount,
    isSyncing,
    enqueue: enqueueCheckin,
    syncNow: flushQueue,
  };
}
