import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isShiftLocked } from "../../src/lib/schedule-lock";

describe("schedule-lock.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates lock correctly for next week shifts before Saturday 00:00", () => {
    // Mock "now" as Tuesday, June 23, 2026 14:00:00 VN (07:00 UTC)
    const mockNow = new Date("2026-06-23T07:00:00Z");
    vi.setSystemTime(mockNow);

    // Shift starts on Wednesday, July 1, 2026 09:00 VN
    // Monday of that week is June 29.
    // Lock deadline is Saturday, June 27 at 00:00 VN.
    // Tuesday is before Saturday, so it should NOT be locked.
    const shiftDate = new Date("2026-07-01T02:00:00Z");
    expect(isShiftLocked(shiftDate)).toBe(false);
  });

  it("locks next week shifts after Saturday 00:00 VN", () => {
    // Mock "now" as Saturday, June 27, 2026 00:01:00 VN (June 26 17:01 UTC)
    const mockNow = new Date("2026-06-26T17:01:00Z");
    vi.setSystemTime(mockNow);

    // Shift is Wednesday, July 1, 2026.
    // Saturday morning is after the Saturday 00:00 deadline, so it should be locked.
    const shiftDate = new Date("2026-07-01T02:00:00Z");
    expect(isShiftLocked(shiftDate)).toBe(true);
  });

  it("locks current week shifts", () => {
    // Mock "now" as Tuesday, June 23, 2026 14:00:00 VN
    const mockNow = new Date("2026-06-23T07:00:00Z");
    vi.setSystemTime(mockNow);

    // Shift is Thursday, June 25, 2026 (current week).
    // Monday is June 22, deadline was June 20. It should be locked.
    const shiftDate = new Date("2026-06-25T02:00:00Z");
    expect(isShiftLocked(shiftDate)).toBe(true);
  });
});
