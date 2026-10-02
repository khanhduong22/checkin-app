import { describe, it, expect } from "vitest";
import {
  calculateLatePenalty,
  isLate,
  isEarlyLeave,
  checkTimeStatus,
  GRACE_PERIOD_MINUTES,
} from "../src/rules/late-penalty";

describe("late-penalty rules", () => {
  it("enforces 1 minute grace period constant", () => {
    expect(GRACE_PERIOD_MINUTES).toBe(1);
  });

  describe("calculateLatePenalty()", () => {
    it("returns 0 penalty hours for 0, 1, 2, or 3 late arrivals", () => {
      expect(calculateLatePenalty(0)).toBe(0);
      expect(calculateLatePenalty(1)).toBe(0);
      expect(calculateLatePenalty(2)).toBe(0);
      expect(calculateLatePenalty(3)).toBe(0);
    });

    it("returns (lateCount - 3) hours starting from the 4th late arrival", () => {
      expect(calculateLatePenalty(4)).toBe(1);
      expect(calculateLatePenalty(5)).toBe(2);
      expect(calculateLatePenalty(6)).toBe(3);
      expect(calculateLatePenalty(10)).toBe(7);
      expect(calculateLatePenalty(20)).toBe(17);
    });
  });

  describe("isLate()", () => {
    it("considers 8:30:00 on time for 8:30 shift", () => {
      const d = new Date("2026-05-15T08:30:00");
      expect(isLate(d, 8.5)).toBe(false);
    });

    it("considers 8:31:00 on time within 1 minute grace period", () => {
      const d = new Date("2026-05-15T08:31:00");
      expect(isLate(d, 8.5)).toBe(false);
    });

    it("considers 8:32:00 late (exceeds 1 minute grace period)", () => {
      const d = new Date("2026-05-15T08:32:00");
      expect(isLate(d, 8.5)).toBe(true);
    });

    it("handles decimal hours directly", () => {
      expect(isLate(8.51, 8.5)).toBe(false);
      expect(isLate(8.53, 8.5)).toBe(true);
    });
  });

  describe("isEarlyLeave()", () => {
    it("considers 17:30:00 on time for 17:30 shift end", () => {
      const d = new Date("2026-05-15T17:30:00");
      expect(isEarlyLeave(d, 17.5)).toBe(false);
    });

    it("considers 17:29:30 on time within 1 minute grace period", () => {
      const d = new Date("2026-05-15T17:29:30");
      expect(isEarlyLeave(d, 17.5)).toBe(false);
    });

    it("considers 17:28:00 early leave", () => {
      const d = new Date("2026-05-15T17:28:00");
      expect(isEarlyLeave(d, 17.5)).toBe(true);
    });
  });

  describe("checkTimeStatus()", () => {
    it("returns null when on time", () => {
      const checkinTime = new Date("2026-05-15T08:25:00");
      expect(checkTimeStatus(checkinTime, "checkin")).toBeNull();
    });

    it("returns Đi muộn badge when checkin is late", () => {
      const lateTime = new Date("2026-05-15T08:45:00");
      const res = checkTimeStatus(lateTime, "checkin");
      expect(res).not.toBeNull();
      expect(res?.label).toBe("Đi muộn");
    });

    it("returns Về sớm badge when checkout is early", () => {
      const earlyTime = new Date("2026-05-15T16:00:00");
      const res = checkTimeStatus(earlyTime, "checkout");
      expect(res).not.toBeNull();
      expect(res?.label).toBe("Về sớm");
    });
  });
});
