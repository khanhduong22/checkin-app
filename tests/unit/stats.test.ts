import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    checkIn: {
      findMany: vi.fn(),
    },
    workShift: {
      findMany: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    staffTask: {
      findMany: vi.fn(),
    },
    managerChecklistTask: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    managerChecklistCompletion: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
  },
}));

import { calculateLatePenalty, getUserMonthlyStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCheckInFindMany = prisma.checkIn.findMany as ReturnType<typeof vi.fn>;
const mockShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockRequestFindMany = prisma.request.findMany as ReturnType<typeof vi.fn>;
const mockHolidayFindMany = prisma.holiday.findMany as ReturnType<typeof vi.fn>;

describe("calculateLatePenalty()", () => {
  it("returns 0 when lateCount is 0", () => {
    expect(calculateLatePenalty(0)).toBe(0);
  });

  it("returns 0 when lateCount is 1", () => {
    expect(calculateLatePenalty(1)).toBe(0);
  });

  it("returns 0 when lateCount is 2", () => {
    expect(calculateLatePenalty(2)).toBe(0);
  });

  it("returns 0 when lateCount is 3 (last free)", () => {
    expect(calculateLatePenalty(3)).toBe(0);
  });

  it("returns 1 hour penalty when lateCount is 4 (first penalty)", () => {
    expect(calculateLatePenalty(4)).toBe(1);
  });

  it("returns 2 hours penalty when lateCount is 5", () => {
    expect(calculateLatePenalty(5)).toBe(2);
  });

  it("returns 3 hours penalty when lateCount is 6", () => {
    expect(calculateLatePenalty(6)).toBe(3);
  });

  it("returns 7 hours penalty when lateCount is 10", () => {
    expect(calculateLatePenalty(10)).toBe(7);
  });

  it("returns n-3 hours for any n >= 4", () => {
    for (let n = 4; n <= 15; n++) {
      expect(calculateLatePenalty(n)).toBe(n - 3);
    }
  });
});

describe("getUserMonthlyStats() - Early Check-in Capping Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserRecord = {
    id: "user-1",
    name: "Ngân",
    email: "ngan@example.com",
    role: "USER",
    employmentType: "PART_TIME",
    hourlyRate: 20000,
    monthlySalary: 0,
    adjustments: [],
  };

  const targetDate = new Date("2026-06-15T12:00:00+07:00");

  it("caps check-in to shift start in audited hours if early arrival is registered (e.g. 15 minutes early)", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift: 12:00 to 17:00 (UTC 05:00 to 10:00)
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-1",
        start: new Date("2026-06-13T05:00:00.000Z"), // 12:00 Local
        end: new Date("2026-06-13T10:00:00.000Z"),   // 17:00 Local
        status: "APPROVED"
      }
    ]);

    // Checkin: 11:45 Local (UTC 04:45) - 15 mins early
    // Checkout: 17:00 Local (UTC 10:00)
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-06-13T04:45:00.000Z") },
      { type: "checkout", timestamp: new Date("2026-06-13T10:00:00.000Z") }
    ]);

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDate);

    // Capped in audited hours: 12:00 to 17:00 = 5.0 hours.
    expect(stats.totalHours).toBeCloseTo(5.0, 1);
    
    // Raw hours should show uncapped: 5.25 hours
    expect(stats.dailyDetails[0].rawHours).toBeCloseTo(5.25, 2);
  });

  it("caps check-in to shift start in audited hours even if early arrival is > 30 minutes (e.g. 2 hours early)", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift: 12:00 to 17:00 (UTC 05:00 to 10:00)
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-1",
        start: new Date("2026-06-13T05:00:00.000Z"), // 12:00 Local
        end: new Date("2026-06-13T10:00:00.000Z"),   // 17:00 Local
        status: "APPROVED"
      }
    ]);

    // Checkin: 09:59 Local (UTC 02:59) - 2 hours 1 min early
    // Checkout: 17:48 Local (UTC 10:48)
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-06-13T02:59:00.000Z") },
      { type: "checkout", timestamp: new Date("2026-06-13T10:48:00.000Z") }
    ]);

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDate);

    // Audited hours are capped: shift end check out is 17:48 (uncapped) but check-in is capped to 12:00.
    // So audited is 12:00 to 17:48 = 5.8 hours.
    expect(stats.totalHours).toBeCloseTo(5.8, 1);
    
    // Raw hours should show the actual time: 09:59 to 17:48 = 7 hours 49 minutes = 7.82 hours.
    expect(stats.dailyDetails[0].rawHours).toBeCloseTo(7.82, 1);
  });
});

describe("getUserMonthlyStats() - Leaderboard Overtime Calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ptUser = {
    id: "user-pt",
    name: "Part-time Employee",
    email: "pt@example.com",
    role: "USER",
    employmentType: "PART_TIME",
    hourlyRate: 20000,
    monthlySalary: 0,
    adjustments: [],
  };

  const ftUser = {
    id: "user-ft",
    name: "Full-time Employee",
    email: "ft@example.com",
    role: "USER",
    employmentType: "FULL_TIME",
    hourlyRate: 30000,
    monthlySalary: 6000000,
    adjustments: [],
  };

  it("calculates leaderboardOvertimeHours matching standard OT before August 2026", async () => {
    mockUserFindUnique.mockResolvedValue(ptUser);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift duration: 4 hours (12:00 to 16:00 Local)
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-pt",
        start: new Date("2026-06-13T05:00:00.000Z"), // 12:00 Local
        end: new Date("2026-06-13T09:00:00.000Z"),   // 16:00 Local
        status: "APPROVED"
      }
    ]);

    // Checkin: 12:00 Local (UTC 05:00)
    // Checkout: 17:00 Local (UTC 10:00) -> 5 hours worked (1 hour OT above shift)
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-06-13T05:00:00.000Z") },
      { type: "checkout", timestamp: new Date("2026-06-13T10:00:00.000Z") }
    ]);

    // June 2026 (before August 2026)
    const targetDateBefore = new Date("2026-06-15T12:00:00+07:00");
    const stats = await getUserMonthlyStats(ptUser.id, targetDateBefore);

    expect(stats.totalOvertimeHours).toBeCloseTo(1.0, 1);
    expect(stats.leaderboardOvertimeHours).toBeCloseTo(1.0, 1);
  });

  it("calculates leaderboardOvertimeHours with new rule (>5h for PT) from August 2026 onwards", async () => {
    mockUserFindUnique.mockResolvedValue(ptUser);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift duration: 4 hours (12:00 to 16:00 Local)
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "user-pt",
        start: new Date("2026-08-13T05:00:00.000Z"), // 12:00 Local
        end: new Date("2026-08-13T09:00:00.000Z"),   // 16:00 Local
        status: "APPROVED"
      }
    ]);

    // Checkin: 12:00 Local
    // Checkout: 18:30 Local -> 6.5 hours worked.
    // Standard OT: 6.5 - 4 (shift duration) = 2.5 hours.
    // Leaderboard OT: 6.5 - 5 = 1.5 hours.
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-08-13T05:00:00.000Z") },
      { type: "checkout", timestamp: new Date("2026-08-13T11:30:00.000Z") }
    ]);

    // August 2026 (starts new rule)
    const targetDateAfter = new Date("2026-08-15T12:00:00+07:00");
    const stats = await getUserMonthlyStats(ptUser.id, targetDateAfter);

    expect(stats.totalOvertimeHours).toBeCloseTo(2.5, 1);
    expect(stats.leaderboardOvertimeHours).toBeCloseTo(1.5, 1);
  });

  it("calculates leaderboardOvertimeHours with new rule (>8h for FT) from August 2026 onwards", async () => {
    mockUserFindUnique.mockResolvedValue(ftUser);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]); // No shift

    // Checkin: 08:30 Local (01:30 UTC)
    // Checkout: 18:30 Local (11:30 UTC) -> 10 hours worked.
    // Standard OT: 10 - 8 = 2 hours.
    // Leaderboard OT: 10 - 8 = 2 hours.
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-08-13T01:30:00.000Z") },
      { type: "checkout", timestamp: new Date("2026-08-13T11:30:00.000Z") }
    ]);

    // August 2026 (starts new rule)
    const targetDateAfter = new Date("2026-08-15T12:00:00+07:00");
    const stats = await getUserMonthlyStats(ftUser.id, targetDateAfter);

    expect(stats.totalOvertimeHours).toBeCloseTo(2.0, 1);
    expect(stats.leaderboardOvertimeHours).toBeCloseTo(2.0, 1);
  });

  it("calculates standardDays and dailySalary for Na with 1.5 days off per week from August 2026 onwards", async () => {
    const naUser = {
      id: "user-na",
      name: "Na",
      email: "maithina4040@gmail.com",
      role: "ADMIN",
      employmentType: "FULL_TIME",
      hourlyRate: 30000,
      monthlySalary: 6000000,
      adjustments: [],
    };

    mockUserFindUnique.mockResolvedValue(naUser);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockCheckInFindMany.mockResolvedValue([]);

    // Target date: August 15, 2026 (month index 7)
    // August 2026 has 31 days, 5 Sundays, 5 Saturdays.
    // Na gets 1.5 days off per week.
    // standardDays: 31 - 5 (Sundays) - 5 * 0.5 (Saturdays) = 23.5 days.
    const targetDate = new Date("2026-08-15T12:00:00+07:00");
    const stats = await getUserMonthlyStats(naUser.id, targetDate);

    expect(stats.standardDays).toBe(23.5);
    expect(stats.dailySalary).toBeCloseTo(6000000 / 23.5, 2);
    expect(stats.dynamicHourlyRate).toBeCloseTo((6000000 / 23.5) / 8, 2);
  });

  it("calculates normal standardDays for Na before August 2026 (e.g. July 2026)", async () => {
    const naUser = {
      id: "user-na",
      name: "Na",
      email: "maithina4040@gmail.com",
      role: "ADMIN",
      employmentType: "FULL_TIME",
      hourlyRate: 30000,
      monthlySalary: 6000000,
      adjustments: [],
    };

    mockUserFindUnique.mockResolvedValue(naUser);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockCheckInFindMany.mockResolvedValue([]);

    // July 2026 (month index 6)
    // July 2026 has 31 days, 4 Sundays.
    // Na gets 1 day off per week (Sunday).
    // standardDays: 31 - 4 = 27 days.
    const targetDate = new Date("2026-07-15T12:00:00+07:00");
    const stats = await getUserMonthlyStats(naUser.id, targetDate);

    expect(stats.standardDays).toBe(27);
    expect(stats.dailySalary).toBeCloseTo(6000000 / 27, 2);
  });
});
