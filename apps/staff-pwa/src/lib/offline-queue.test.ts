import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory mock for localStorage in Node 22 / JSDOM
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
  configurable: true,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });
}

import {
  enqueueCheckin,
  flushQueue,
  getStoredQueue,
  isNetworkOnline,
  subscribeToQueue,
} from "./offline-queue";

describe("Offline Outbox Queue", () => {
  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
  });

  it("should detect network online state correctly", () => {
    expect(typeof isNetworkOnline()).toBe("boolean");
  });

  it("should enqueue a checkin record into the storage queue", async () => {
    const item = await enqueueCheckin({
      type: "checkin",
      latitude: 10.7769,
      longitude: 106.7009,
      note: "Test checkin offline",
    });

    expect(item).toBeDefined();
    expect(item.id).toMatch(/^offline_/);
    expect(item.type).toBe("checkin");
    expect(item.status).toBe("pending");
    expect(item.latitude).toBe(10.7769);

    const queue = await getStoredQueue();
    expect(queue.length).toBeGreaterThanOrEqual(1);
    const found = queue.find((q) => q.id === item.id);
    expect(found).toBeDefined();
  });

  it("should notify subscribers when new items are enqueued", async () => {
    let notified = false;
    let subscriberItems: any[] = [];

    const unsubscribe = subscribeToQueue((items) => {
      notified = true;
      subscriberItems = items;
    });

    await enqueueCheckin({
      type: "checkout",
      note: "Test checkout notify",
    });

    expect(notified).toBe(true);
    expect(subscriberItems.some((i) => i.type === "checkout")).toBe(true);

    unsubscribe();
  });

  it("should attach Authorization header and remove items on successful batch sync", async () => {
    storageMock.setItem("limart_staff_jwt_token", "test-mock-token");
    storageMock.setItem("limart_staff_profile_cache", JSON.stringify({ id: "user-123" }));

    const item = await enqueueCheckin({
      type: "checkin",
      userId: "user-123",
      note: "Sync test",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        synced: 1,
        results: [{ id: item.id, success: true }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await flushQueue();
    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(1);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/checkins/sync-offline",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-mock-token",
        }),
      })
    );

    const remainingQueue = await getStoredQueue();
    expect(remainingQueue.find((q) => q.id === item.id)).toBeUndefined();
  });

  it("should mark item as isTerminalError when server returns 400 business error and exclude from retry", async () => {
    storageMock.setItem("limart_staff_jwt_token", "test-mock-token");
    storageMock.setItem("limart_staff_profile_cache", JSON.stringify({ id: "user-123" }));

    const item = await enqueueCheckin({
      type: "checkin",
      userId: "user-123",
      note: "Will fail with 400",
    });

    // Mock batch endpoint failing, fallback POST /api/checkins returning 400
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Bạn chưa Check-out lượt trước đó!" }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const result = await flushQueue();
    expect(result.syncedCount).toBe(0);

    const queueAfter = await getStoredQueue();
    const failedItem = queueAfter.find((q) => q.id === item.id);
    expect(failedItem).toBeDefined();
    expect(failedItem?.status).toBe("failed");
    expect(failedItem?.isTerminalError).toBe(true);

    // Calling flushQueue again should not try to sync this terminal item
    mockFetch.mockClear();
    const result2 = await flushQueue();
    expect(result2.syncedCount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should not sync items belonging to another user on shared device", async () => {
    storageMock.setItem("limart_staff_jwt_token", "token-user-B");
    storageMock.setItem("limart_staff_profile_cache", JSON.stringify({ id: "user-B" }));

    // Item queued by user-A
    await enqueueCheckin({
      type: "checkin",
      userId: "user-A",
      note: "From user A",
    });

    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await flushQueue();
    expect(result.syncedCount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
