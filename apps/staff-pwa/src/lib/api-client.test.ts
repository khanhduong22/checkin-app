import { describe, it, expect, vi, beforeEach } from "vitest";

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
  fetcher,
  performCheckIn,
  getIPStatus,
  getTodayUserShiftDuties,
  DEFAULT_HOME_DATA,
} from "./api-client";

describe("Staff PWA API Client", () => {
  beforeEach(() => {
    storageMock.clear();
    vi.restoreAllMocks();
  });

  it("should return cached or fallback home data if network fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const result = await fetcher("/api/staff/home-data");
    expect(result.success).toBe(true);
    expect(result.data.user.name).toBe(DEFAULT_HOME_DATA.user.name);
    expect(result.data.stats.totalHours).toBe(DEFAULT_HOME_DATA.stats.totalHours);
  });

  it("should return empty array fallback for non-home-data endpoints on error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("404 Not Found"));

    const result = await fetcher("/api/staff/schedule");
    expect(result.success).toBe(false);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it("should perform check-in online when network is available", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Chấm công vào ca thành công!",
        data: { id: "chk_123", type: "checkin" },
      }),
    } as any);

    const res = await performCheckIn("user_1", "checkin", "Đúng giờ");
    expect(res.success).toBe(true);
    expect(res.message).toContain("thành công");
  });

  it("should get IP status from backend or fallback", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          ipStatus: {
            isAllowed: true,
            locationName: "LimArt Store (Văn phòng chính)",
            ip: "192.168.1.100",
          },
        },
      }),
    } as any);

    const ip = await getIPStatus();
    expect(ip.isAllowed).toBe(true);
    expect(ip.locationName).toContain("LimArt");
  });

  it("should get today shift duties", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          todayDuties: [
            { id: "d1", title: "Nhiệm vụ kiểm kho", isCompleted: true },
          ],
        },
      }),
    } as any);

    const dutiesRes = await getTodayUserShiftDuties("user_1");
    expect(dutiesRes.success).toBe(true);
    expect(dutiesRes.data.length).toBe(1);
    expect(dutiesRes.data[0].title).toBe("Nhiệm vụ kiểm kho");
  });
});
