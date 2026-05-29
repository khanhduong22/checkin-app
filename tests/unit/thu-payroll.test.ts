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
  },
}));

import { getUserMonthlyStats } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCheckInFindMany = prisma.checkIn.findMany as ReturnType<typeof vi.fn>;
const mockShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockRequestFindMany = prisma.request.findMany as ReturnType<typeof vi.fn>;
const mockHolidayFindMany = prisma.holiday.findMany as ReturnType<typeof vi.fn>;
const mockStaffTaskFindMany = prisma.staffTask.findMany as ReturnType<typeof vi.fn>;

describe("Thư Special KPI Payroll Logic (June 2026+)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const targetDateJune = new Date("2026-06-15T12:00:00+07:00");
  const targetDateMay = new Date("2026-05-15T12:00:00+07:00");

  const mockUserRecord = {
    id: "thu-userId-123",
    name: "Thư",
    email: "cuccung123456789@gmail.com",
    role: "USER",
    employmentType: "PART_TIME",
    hourlyRate: 19000,
    monthlySalary: 6000000,
    adjustments: [],
  };

  it("calculates normal part-time hours-based salary in May 2026", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockCheckInFindMany.mockResolvedValue([
      { type: "checkin", timestamp: new Date("2026-05-01T08:00:00+07:00") },
      { type: "checkout", timestamp: new Date("2026-05-01T17:00:00+07:00") } // 9 hours (8 hours effective)
    ]);
    mockShiftFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockHolidayFindMany.mockResolvedValue([]);

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDateMay);

    expect(stats.isThuKpiSalary).toBeUndefined();
    // Hourly calculation: 9 hours total, hourly rate 19000
    // May has no override, so baseSalary is computed from hours * rate
    expect(stats.baseSalary).toBeGreaterThan(0);
    expect(stats.employmentType).toBe("PART_TIME");
  });

  it("calculates special KPI-based salary in June 2026 with 0 tasks (defaults to 100% completion)", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockCheckInFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockHolidayFindMany.mockResolvedValue([]);
    mockStaffTaskFindMany.mockResolvedValue([]); // 0 tasks

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDateJune);

    // Should detect special structure
    expect(stats.isThuKpiSalary).toBe(true);
    expect(stats.kpiCompletionRate).toBe(1.0);
    expect(stats.fixedBaseSalary).toBe(3000000);
    expect(stats.kpiSalary).toBe(3000000);
    expect(stats.baseSalary).toBe(6000000); // 3M + 3M
    expect(stats.deduction).toBe(0); // 100% complete -> no deduction
    expect(stats.employmentType).toBe("FULL_TIME");
  });

  it("calculates special KPI-based salary in June 2026 with 50% task completion", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockCheckInFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockHolidayFindMany.mockResolvedValue([]);
    
    // 2 tasks: 1 APPROVED, 1 DOING (so 50% completion)
    mockStaffTaskFindMany.mockResolvedValue([
      { id: "task-1", status: "APPROVED", updatedAt: new Date() },
      { id: "task-2", status: "DOING", updatedAt: new Date() }
    ]);

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDateJune);

    expect(stats.isThuKpiSalary).toBe(true);
    expect(stats.kpiCompletionRate).toBe(0.5);
    expect(stats.fixedBaseSalary).toBe(3000000);
    expect(stats.kpiSalary).toBe(1500000); // 50% of 3M
    expect(stats.baseSalary).toBe(4500000); // 3M base + 1.5M KPI
    expect(stats.deduction).toBe(1500000); // 3M - 1.5M missing KPI
    expect(stats.employmentType).toBe("FULL_TIME");
  });

  it("calculates special KPI-based salary in June 2026 counting DONE and grace-period REJECTED as completed", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockCheckInFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockHolidayFindMany.mockResolvedValue([]);

    const now = new Date();
    const recentRejectedDate = new Date(now.getTime() - 10 * 60 * 1000); // 10 mins ago
    const oldRejectedDate = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

    // 4 tasks:
    // 1. APPROVED
    // 2. DONE (counts as completed)
    // 3. REJECTED (within 24h, counts as completed)
    // 4. REJECTED (over 24h, counts as not completed)
    // Total completed = 3/4 = 75%
    mockStaffTaskFindMany.mockResolvedValue([
      { id: "t1", status: "APPROVED", updatedAt: now },
      { id: "t2", status: "DONE", updatedAt: now },
      { id: "t3", status: "REJECTED", updatedAt: recentRejectedDate },
      { id: "t4", status: "REJECTED", updatedAt: oldRejectedDate }
    ]);

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDateJune);

    expect(stats.isThuKpiSalary).toBe(true);
    expect(stats.kpiCompletionRate).toBe(0.75);
    expect(stats.fixedBaseSalary).toBe(3000000);
    expect(stats.kpiSalary).toBe(2250000); // 75% of 3M
    expect(stats.baseSalary).toBe(5250000); // 3M base + 2.25M KPI
    expect(stats.deduction).toBe(750000); // 3M - 2.25M missing KPI
  });

  it("includes adjustments correctly in Thư's totalSalary", async () => {
    const userWithAdjustments = {
      ...mockUserRecord,
      adjustments: [
        { id: "adj-1", amount: 500000, reason: "Thưởng doanh số" }
      ]
    };
    mockUserFindUnique.mockResolvedValue(userWithAdjustments);
    mockCheckInFindMany.mockResolvedValue([]);
    mockShiftFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    mockHolidayFindMany.mockResolvedValue([]);
    mockStaffTaskFindMany.mockResolvedValue([]); // 0 tasks -> 100%

    const stats = await getUserMonthlyStats(mockUserRecord.id, targetDateJune);

    expect(stats.baseSalary).toBe(6000000);
    expect(stats.totalAdjustments).toBe(500000);
    expect(stats.totalSalary).toBe(6500000); // 6M base + 500k adjustments
  });
});
