import { describe, it, expect } from "vitest";
import { calculateStreak } from "../src/rules/streak";

describe("calculateStreak()", () => {
  // Use a fixed Wednesday as today: 2026-05-13
  const wednesday = new Date("2026-05-13T10:00:00Z");

  it("returns 0 when user has no checkins", () => {
    expect(calculateStreak([], [], wednesday)).toBe(0);
  });

  it("returns 0 when today's only checkin was late (after 8:31)", () => {
    const lateCheckin = new Date("2026-05-13T09:00:00");
    const streak = calculateStreak([{ timestamp: lateCheckin }], [], wednesday);
    expect(streak).toBe(0);
  });

  it("counts today if checked in on time (8:00)", () => {
    const onTimeCheckin = new Date("2026-05-13T08:00:00");
    const streak = calculateStreak([{ timestamp: onTimeCheckin }], [], wednesday);
    expect(streak).toBe(1);
  });

  it("increments streak for approved LEAVE days without checkin", () => {
    const streak = calculateStreak(
      [],
      [{ date: new Date("2026-05-13T08:00:00"), status: "APPROVED", type: "LEAVE" }],
      wednesday
    );
    expect(streak).toBe(1);
  });

  it("counts consecutive weekdays (Mon, Tue, Wed)", () => {
    const mon = new Date("2026-05-11T08:00:00");
    const tue = new Date("2026-05-12T08:00:00");
    const wed = new Date("2026-05-13T08:00:00");

    const streak = calculateStreak(
      [{ timestamp: mon }, { timestamp: tue }, { timestamp: wed }],
      [],
      wednesday
    );
    expect(streak).toBe(3);
  });

  it("skips weekends (Fri to Mon) without breaking streak", () => {
    // Friday: 2026-05-08, Mon: 2026-05-11
    // Reference Monday: 2026-05-11
    const mondayRef = new Date("2026-05-11T10:00:00Z");
    const fri = new Date("2026-05-08T08:00:00");
    const mon = new Date("2026-05-11T08:00:00");

    const streak = calculateStreak(
      [{ timestamp: fri }, { timestamp: mon }],
      [],
      mondayRef
    );
    expect(streak).toBe(2);
  });

  it("breaks streak when a workday in between was missed", () => {
    const mon = new Date("2026-05-11T08:00:00");
    // Missed Tuesday 2026-05-12
    const wed = new Date("2026-05-13T08:00:00");

    const streak = calculateStreak(
      [{ timestamp: mon }, { timestamp: wed }],
      [],
      wednesday
    );
    // Only today (Wed) counts because Tue broke the chain
    expect(streak).toBe(1);
  });
});
