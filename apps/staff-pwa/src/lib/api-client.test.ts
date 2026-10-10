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

  it("should return empty array when fetching shift duties fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const dutiesRes = await getTodayUserShiftDuties("user_1");
    expect(dutiesRes.success).toBe(true);
    expect(dutiesRes.data).toEqual([]);
  });

  it("should retry check-in with cookie credentials and clear stale token on 401", async () => {
    storageMock.setItem("limart_staff_jwt_token", "stale_expired_token");

    const mockFetch = vi
      .fn()
      // First attempt with Authorization header returns 401
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized: Invalid or expired token" }),
      })
      // Second attempt (retry without Authorization header, using cookie credentials) returns 200
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: "Chấm công thành công qua cookie!",
          data: { id: "chk_cookie_123" },
        }),
      });
    global.fetch = mockFetch;

    const res = await performCheckIn("user_1", "checkout");

    // Stale token in localStorage must be cleared
    expect(storageMock.getItem("limart_staff_jwt_token")).toBeNull();
    expect(res.success).toBe(true);
    expect(res.message).toBe("Chấm công thành công qua cookie!");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify first call had Authorization header
    const firstCallHeaders = mockFetch.mock.calls[0][1].headers;
    expect(firstCallHeaders.Authorization).toBe("Bearer stale_expired_token");

    // Verify retry call had no Authorization header
    const secondCallHeaders = mockFetch.mock.calls[1][1].headers;
    expect(secondCallHeaders.Authorization).toBeUndefined();
  });

  it("should return friendly expired message when check-in fails with 401 on both attempts", async () => {
    storageMock.setItem("limart_staff_jwt_token", "stale_token");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized: Invalid or expired token" }),
    });
    global.fetch = mockFetch;

    const res = await performCheckIn("user_1", "checkout");

    expect(storageMock.getItem("limart_staff_jwt_token")).toBeNull();
    expect(res.success).toBe(false);
    expect(res.message).toBe("Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

