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
});
