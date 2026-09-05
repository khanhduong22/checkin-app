import { describe, it, expect } from "vitest";
import {
  cn,
  isLate,
  isEarlyLeave,
  checkTimeStatus,
  GRACE_PERIOD_MINUTES,
  normalizeVietnamese,
} from "@/lib/utils";

// Helper: build a Date with specific hour/minute
function makeTime(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("cn()", () => {
  it("merges class names correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
    expect(cn("p-4", false && "hidden", "text-sm")).toBe("p-4 text-sm");
  });
});

describe("GRACE_PERIOD_MINUTES", () => {
  it("should be 1 minute", () => {
    expect(GRACE_PERIOD_MINUTES).toBe(1);
  });
});

describe("isLate()", () => {
  // Schedule: 8.5 = 8:30
  const scheduled = 8.5;

  it("returns false when arriving exactly on time (8:30)", () => {
    expect(isLate(8.5, scheduled)).toBe(false);
  });

  it("returns false when arriving 1 minute before scheduled (8:29)", () => {
    expect(isLate(8 + 29 / 60, scheduled)).toBe(false);
  });

  it("returns false when arriving within grace period (8:30:59)", () => {
    // 8:30 + 0.99 min = 8.5 + (0.99/60) — still within 1 min grace
    expect(isLate(8.5 + 0.99 / 60, scheduled)).toBe(false);
  });

  it("returns true when arriving exactly 1 minute late (8:31)", () => {
    // 8:31 = 8 + 31/60 = 8.5167; scheduled + grace = 8.5 + 1/60 = 8.5167
    // strictly greater than threshold
    const justAfterGrace = 8.5 + 1 / 60 + 0.0001;
    expect(isLate(justAfterGrace, scheduled)).toBe(true);
  });

  it("returns true when arriving noticeably late (9:00)", () => {
    expect(isLate(9, scheduled)).toBe(true);
  });

  it("accepts Date objects correctly — on time", () => {
    const onTime = makeTime(8, 30);
    expect(isLate(onTime, makeTime(8, 30))).toBe(false);
  });

  it("accepts Date objects correctly — late", () => {
    const lateDate = makeTime(9, 0);
    expect(isLate(lateDate, makeTime(8, 30))).toBe(true);
  });
});

describe("isEarlyLeave()", () => {
  // Schedule: 17.5 = 17:30
  const scheduled = 17.5;

  it("returns false when leaving exactly on time (17:30)", () => {
    expect(isEarlyLeave(17.5, scheduled)).toBe(false);
  });

  it("returns false when leaving after scheduled time (18:00)", () => {
    expect(isEarlyLeave(18, scheduled)).toBe(false);
  });

  it("returns false when leaving within grace period (17:29:01)", () => {
    // scheduled - grace = 17.5 - 1/60 = 17.4833; leaving at 17.4834 is NOT early
    const justAboveThreshold = 17.5 - 1 / 60 + 0.0001;
    expect(isEarlyLeave(justAboveThreshold, scheduled)).toBe(false);
  });

  it("returns true when leaving noticeably early (17:00)", () => {
    expect(isEarlyLeave(17, scheduled)).toBe(true);
  });

  it("returns true when leaving just below grace threshold", () => {
    const justBelowGrace = 17.5 - 1 / 60 - 0.0001;
    expect(isEarlyLeave(justBelowGrace, scheduled)).toBe(true);
  });

  it("accepts Date objects correctly — on time", () => {
    expect(isEarlyLeave(makeTime(17, 30), makeTime(17, 30))).toBe(false);
  });

  it("accepts Date objects correctly — early leave", () => {
    expect(isEarlyLeave(makeTime(16, 0), makeTime(17, 30))).toBe(true);
  });
});

describe("checkTimeStatus()", () => {
  it("returns null for on-time check-in (8:30)", () => {
    const result = checkTimeStatus(makeTime(8, 30), "checkin");
    expect(result).toBeNull();
  });

  it("returns 'Đi muộn' label for late check-in (9:00)", () => {
    const result = checkTimeStatus(makeTime(9, 0), "checkin");
    expect(result).not.toBeNull();
    expect(result?.label).toBe("Đi muộn");
    expect(result?.color).toContain("red");
  });

  it("returns null for on-time check-out (17:30)", () => {
    const result = checkTimeStatus(makeTime(17, 30), "checkout");
    expect(result).toBeNull();
  });

  it("returns 'Về sớm' label for early check-out (16:00)", () => {
    const result = checkTimeStatus(makeTime(16, 0), "checkout");
    expect(result).not.toBeNull();
    expect(result?.label).toBe("Về sớm");
    expect(result?.color).toContain("yellow");
  });

  it("returns null for late check-out (18:00) — no penalty for staying late", () => {
    const result = checkTimeStatus(makeTime(18, 0), "checkout");
    expect(result).toBeNull();
  });
});

describe("normalizeVietnamese()", () => {
  it("returns empty string for null, undefined, or empty string", () => {
    expect(normalizeVietnamese(null)).toBe("");
    expect(normalizeVietnamese(undefined)).toBe("");
    expect(normalizeVietnamese("")).toBe("");
  });

  it("removes accents and converts to lowercase", () => {
    expect(normalizeVietnamese("Đăng bài fb, ins, thread")).toBe("dang bai fb, ins, thread");
    expect(normalizeVietnamese("Làm video TikTok")).toBe("lam video tiktok");
    expect(normalizeVietnamese("Live stream 2 buổi")).toBe("live stream 2 buoi");
    expect(normalizeVietnamese("Đăng kí chương trình khuyến mãi")).toBe("dang ki chuong trinh khuyen mai");
    expect(normalizeVietnamese("ĐÀ NẴNG")).toBe("da nang");
  });

  it("correctly normalizes special 'đ' and 'Đ' characters", () => {
    expect(normalizeVietnamese("đường")).toBe("duong");
    expect(normalizeVietnamese("ĐƯỜNG")).toBe("duong");
    expect(normalizeVietnamese("đóng hàng")).toBe("dong hang");
  });

  it("handles strings with whitespace and trims properly", () => {
    expect(normalizeVietnamese("   Tạo bài viết   ")).toBe("tao bai viet");
  });
});
