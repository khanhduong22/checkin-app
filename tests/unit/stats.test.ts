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

  it("caps check-in to shift start if early arrival is <= 30 minutes (e.g. 15 minutes early)", async () => {
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

    // Capped: start is adjusted to 12:00 Local. Duration: 12:00 to 17:00 = 5.0 hours.
    expect(stats.totalHours).toBeCloseTo(5.0, 1);
  });

  it("does not cap check-in to shift start if early arrival is > 30 minutes (e.g. 2 hours early)", async () => {
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

    // Uncapped: starts at 09:59 Local. Duration: 09:59 to 17:48 = 7 hours 49 minutes = 7.82 hours.
    expect(stats.totalHours).toBeCloseTo(7.82, 1);
  });
});
