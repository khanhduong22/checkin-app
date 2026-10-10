import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockCheckInFindMany,
  mockWorkShiftFindMany,
  mockRequestFindMany,
  mockHolidayFindMany,
  mockStaffTaskFindMany,
  mockPayrollPeriodFindUnique,
  mockPayslipFindMany,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockCheckInFindMany: vi.fn(),
  mockWorkShiftFindMany: vi.fn(),
  mockRequestFindMany: vi.fn(),
  mockHolidayFindMany: vi.fn(),
  mockStaffTaskFindMany: vi.fn(),
  mockPayrollPeriodFindUnique: vi.fn(),
  mockPayslipFindMany: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    checkIn: {
      findMany: mockCheckInFindMany,
    },
    workShift: {
      findMany: mockWorkShiftFindMany,
    },
    request: {
      findMany: mockRequestFindMany,
    },
    holiday: {
      findMany: mockHolidayFindMany,
    },
    staffTask: {
      findMany: mockStaffTaskFindMany,
    },
    payrollPeriod: {
      findUnique: mockPayrollPeriodFindUnique,
    },
    payslip: {
      findMany: mockPayslipFindMany,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn().mockImplementation(async (cb) => cb({
      payrollPeriod: { upsert: vi.fn() },
      payslip: { upsert: vi.fn() },
    })),
  },
}));

import {
  calculateFullTimeMetrics,
  calculateUserMonthlyStats,
  findBestMatchingShift,
} from "../src/lib/payroll-calculator";
import { applyHardworkingBonus } from "@checkin/shared";
import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Payroll Engine & Business Rules Parity", () => {
  let adminToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signAccessToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });
  });

  describe("1. Full-time Metrics & Na 1.5 Days Off Rule (isNa15DaysOff)", () => {
    it("standard Full-Time employee in August 2026 has 26 standard days (31 days - 5 Sundays)", () => {
      const user = {
        employmentType: "FULL_TIME",
        hourlyRate: 0,
        monthlySalary: 10400000,
        email: "staff@example.com",
        name: "Standard Staff",
      };

      // August 2026 (month 8): 31 days, 5 Sundays (2, 9, 16, 23, 30), 5 Saturdays (1, 8, 15, 22, 29)
      const metrics = calculateFullTimeMetrics(user, 2026, 8, 0);

      expect(metrics.standardDays).toBe(26);
      expect(metrics.dailySalary).toBe(10400000 / 26); // 400,000 VND/day
      expect(metrics.dynamicHourlyRate).toBe(400000 / 8); // 50,000 VND/hour
      expect(metrics.deduction).toBe(0);
    });

    it("Quản lý Na starting August 2026 has 1.5 days off per week (Saturdays are half-day off)", () => {
      const userNa = {
        employmentType: "FULL_TIME",
        hourlyRate: 0,
        monthlySalary: 11750000,
        email: "maithina4040@gmail.com",
        name: "Na",
      };

      // August 2026: 31 days - 5 Sundays - (5 Saturdays * 0.5) = 23.5 days!
      const metrics = calculateFullTimeMetrics(userNa, 2026, 8, 0);

      expect(metrics.standardDays).toBe(23.5);
      const expectedDailySalary = 11750000 / 23.5; // 500,000 VND/day
      expect(metrics.dailySalary).toBe(expectedDailySalary);
      expect(metrics.dynamicHourlyRate).toBe(expectedDailySalary / 8); // 62,500 VND/hour
    });

    it("Quản lý Na identified by name 'Na' also gets 1.5 days off rule", () => {
      const userNaByName = {
        employmentType: "FULL_TIME",
        hourlyRate: 0,
        monthlySalary: 9400000,
        email: "other-na@example.com",
        name: "Na",
      };

      const metrics = calculateFullTimeMetrics(userNaByName, 2026, 9, 1);
      // Sept 2026: 30 days, 4 Sundays, 4 Saturdays -> standardDays = 30 - 4 - 2 = 24 days
      expect(metrics.standardDays).toBe(24);
      expect(metrics.deduction).toBe(1 * (9400000 / 24));
    });

    it("Part-Time employees return 0 standardDays and their static hourlyRate", () => {
      const ptUser = {
        employmentType: "PART_TIME",
        hourlyRate: 35000,
        monthlySalary: null,
      };

      const metrics = calculateFullTimeMetrics(ptUser, 2026, 8, 0);
      expect(metrics.standardDays).toBe(0);
      expect(metrics.dailySalary).toBe(0);
      expect(metrics.dynamicHourlyRate).toBe(35000);
      expect(metrics.deduction).toBe(0);
    });
  });

  describe("2. Thư KPI Salary Model (isThuKpiSalary)", () => {
    it("calculates Thư salary based on 3,000,000 fixed + (completionRate * 3,000,000) and waives late penalty", async () => {
      const thuUser = {
        id: "thu-1",
        email: "cuccung123456789@gmail.com",
        name: "Thư",
        employmentType: "FULL_TIME",
        hourlyRate: 30000,
        monthlySalary: 6000000,
        adjustments: [{ id: "adj-1", amount: 150000, reason: "Thưởng", date: new Date("2026-10-15") }],
        payslips: [],
      };

      mockUserFindUnique.mockResolvedValue(thuUser);
      mockCheckInFindMany.mockResolvedValue([]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      // 10 tasks in October 2026: 8 APPROVED, 2 REJECTED (older than 24h) -> completionRate = 0.8
      const tasks = [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `task-${i}`,
          assigneeId: "thu-1",
          startDate: new Date("2026-10-10T09:00:00Z"),
          status: "APPROVED",
          updatedAt: new Date("2026-10-10T10:00:00Z"),
        })),
        {
          id: "task-8",
          assigneeId: "thu-1",
          startDate: new Date("2026-10-15T09:00:00Z"),
          status: "REJECTED",
          updatedAt: new Date("2026-10-01T10:00:00Z"), // older than 24h
        },
        {
          id: "task-9",
          assigneeId: "thu-1",
          startDate: new Date("2026-10-20T09:00:00Z"),
          status: "REJECTED",
          updatedAt: new Date("2026-10-01T10:00:00Z"), // older than 24h
        },
      ];
      mockStaffTaskFindMany.mockResolvedValue(tasks);

      const targetDate = new Date("2026-10-15T00:00:00Z");
      const stats = await calculateUserMonthlyStats("thu-1", targetDate);

      expect(stats).not.toBeNull();
      expect(stats?.isThuKpiSalary).toBe(true);
      expect(stats?.kpiCompletionRate).toBe(0.8);
      expect(stats?.kpiTasksTotal).toBe(10);
      expect(stats?.kpiTasksApproved).toBe(8);

      // Fixed base: 3,000,000, KPI salary: 3,000,000 * 0.8 = 2,400,000
      expect(stats?.fixedBaseSalary).toBe(3000000);
      expect(stats?.kpiSalary).toBe(2400000);
      expect(stats?.baseSalary).toBe(5400000); // 3m + 2.4m
      expect(stats?.deduction).toBe(600000); // 3m - 2.4m
      // Total salary = Base salary + adjustments = 5,400,000 + 150,000 = 5,550,000
      expect(stats?.totalSalary).toBe(5550000);
      expect(stats?.projectedSalary).toBe(5550000);

      // Late penalties must be completely waived for Thư
      expect(stats?.latePenaltyHours).toBe(0);
      expect(stats?.latePenaltyAmount).toBe(0);
      expect(stats?.employmentType).toBe("FULL_TIME");
    });
  });

  describe("3. Senior Supervisor Bonus & Overtime Rules", () => {
    it("adds +3,000 VND/hour on Senior supervisor shifts", async () => {
      const staffUser = {
        id: "senior-1",
        email: "supervisor@example.com",
        name: "Senior Staff",
        employmentType: "PART_TIME",
        hourlyRate: 30000,
        monthlySalary: null,
        adjustments: [],
        payslips: [],
      };

      mockUserFindUnique.mockResolvedValue(staffUser);
      // 1 day worked: 5 hours with isSenior: true
      mockCheckInFindMany.mockResolvedValue([
        {
          id: 1,
          userId: "senior-1",
          type: "checkin",
          timestamp: new Date("2026-10-05T01:00:00Z"), // 08:00 VN
        },
        {
          id: 2,
          userId: "senior-1",
          type: "checkout",
          timestamp: new Date("2026-10-05T06:00:00Z"), // 13:00 VN (5h)
        },
      ]);

      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 101,
          userId: "senior-1",
          start: new Date("2026-10-05T01:00:00Z"),
          end: new Date("2026-10-05T06:00:00Z"),
          isSenior: true, // Senior shift!
        },
      ]);
      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      const stats = await calculateUserMonthlyStats("senior-1", new Date("2026-10-15"));

      expect(stats?.totalHours).toBe(5);
      // Effective rate = 30,000 + 3,000 = 33,000 VND/h -> 5h * 33,000 = 165,000 VND
      expect(stats?.totalSeniorBonus).toBe(15000); // 5h * 3,000
      expect(stats?.baseSalary).toBe(165000);
      expect(stats?.totalSalary).toBe(165000);
    });
  });

  describe("4. Double Bonus Bug Prevention & Hardworking Bonus Parity", () => {
    it("GET /api/admin/payroll returns pre-bonus totalSalary and single bonusAmount without double counting", async () => {
      mockPayrollPeriodFindUnique.mockResolvedValue({
        id: "p-1",
        month: 10,
        year: 2026,
        status: "OPEN",
        bonusPercent: 10, // 10% bonus
        bonusTargets: ["PART_TIME"],
        excludedBonusUsers: [],
      });

      mockUserFindMany.mockResolvedValue([
        {
          id: "pt-worker-1",
          name: "Part Time Worker",
          email: "pt@example.com",
          role: "USER",
          hourlyRate: 30000,
          monthlySalary: null,
          employmentType: "PART_TIME",
          isActive: true,
          adjustments: [],
        },
      ]);

      // User worked 10 hours -> baseSalary = 300,000 VND
      mockUserFindUnique.mockResolvedValue({
        id: "pt-worker-1",
        name: "Part Time Worker",
        email: "pt@example.com",
        role: "USER",
        hourlyRate: 30000,
        monthlySalary: null,
        employmentType: "PART_TIME",
        adjustments: [],
        payslips: [],
      });
      mockCheckInFindMany.mockResolvedValue([
        { id: 1, userId: "pt-worker-1", type: "checkin", timestamp: new Date("2026-10-02T01:00:00Z") },
        { id: 2, userId: "pt-worker-1", type: "checkout", timestamp: new Date("2026-10-02T11:00:00Z") }, // 10h
      ]);
      mockWorkShiftFindMany.mockResolvedValue([
        { id: 10, userId: "pt-worker-1", start: new Date("2026-10-02T01:00:00Z"), end: new Date("2026-10-02T11:00:00Z"), isSenior: false },
      ]);
      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/payroll?month=10&year=2026", {
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);

      const item = json.data[0];
      const baseSalary = 300000;
      const expectedBonus = 30000; // 10% of 300,000

      // Pre-bonus salary must be 300,000 (NOT 330,000!)
      expect(item.stats.baseSalary).toBe(baseSalary);
      expect(item.stats.totalSalary).toBe(baseSalary); // Crucial: must NOT include bonus yet
      expect(item.stats.bonusAmount).toBe(expectedBonus);
      expect(item.stats.finalNet).toBe(baseSalary + expectedBonus); // 330,000
      expect(item.bonus).toBe(expectedBonus);

      // Verify that frontend computing (stats.totalSalary + bonusAmount) yields exactly 330,000, NOT 360,000!
      const frontendCalculatedFinal = item.stats.totalSalary + item.stats.bonusAmount;
      expect(frontendCalculatedFinal).toBe(330000);
    });

    it("applies Top 1 Hardworking Bonus (+200k) for eligible user with >= 130 hours idempotently", () => {
      const payrollList = [
        {
          id: "u-hardworking",
          name: "Hardworking Worker",
          role: "USER",
          stats: {
            employmentType: "PART_TIME",
            totalHours: 135,
            totalSalary: 4050000,
            projectedSalary: 4050000,
            finalNet: 4050000,
            adjustments: [],
          },
        },
        {
          id: "u-regular",
          name: "Regular Worker",
          role: "USER",
          stats: {
            employmentType: "PART_TIME",
            totalHours: 80,
            totalSalary: 2400000,
            projectedSalary: 2400000,
            finalNet: 2400000,
            adjustments: [],
          },
        },
      ];

      // Run bonus application once
      const result1 = applyHardworkingBonus(payrollList, 10, 2026, true);
      expect(result1[0].stats.totalSalary).toBe(4250000); // 4,050,000 + 200,000
      expect(result1[0].stats.adjustments.length).toBe(1);
      expect(result1[0].stats.adjustments[0].amount).toBe(200000);
      expect(result1[1].stats.totalSalary).toBe(2400000); // unaffected

      // Run bonus application twice (idempotency check)
      const result2 = applyHardworkingBonus(result1, 10, 2026, true);
      expect(result2[0].stats.totalSalary).toBe(4250000); // Still 4,250,000, not 4,450,000!
      expect(result2[0].stats.adjustments.length).toBe(1);
    });

    it("includes deactivated users who worked during the month in GET /api/admin/payroll", async () => {
      mockPayrollPeriodFindUnique.mockResolvedValue(null);

      // Verify that prisma.user.findMany query includes OR condition for shifts, checkins, adjustments
      mockUserFindMany.mockImplementation(async (query) => {
        expect(query.where).toHaveProperty("OR");
        expect(query.where.OR).toEqual(
          expect.arrayContaining([
            { isActive: true },
            expect.objectContaining({ shifts: expect.any(Object) }),
            expect.objectContaining({ checkins: expect.any(Object) }),
            expect.objectContaining({ adjustments: expect.any(Object) }),
          ])
        );
        return [
          {
            id: "deactivated-worker",
            name: "Deactivated Worker",
            email: "resigned@example.com",
            role: "USER",
            hourlyRate: 28000,
            monthlySalary: null,
            employmentType: "PART_TIME",
            isActive: false, // Inactive employee!
            adjustments: [],
          },
        ];
      });

      mockUserFindUnique.mockResolvedValue({
        id: "deactivated-worker",
        name: "Deactivated Worker",
        email: "resigned@example.com",
        role: "USER",
        hourlyRate: 28000,
        monthlySalary: null,
        employmentType: "PART_TIME",
        adjustments: [],
        payslips: [],
      });
      mockCheckInFindMany.mockResolvedValue([
        { id: 1, userId: "deactivated-worker", type: "checkin", timestamp: new Date("2026-10-01T01:00:00Z") },
        { id: 2, userId: "deactivated-worker", type: "checkout", timestamp: new Date("2026-10-01T05:00:00Z") }, // 4h
      ]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/payroll?month=10&year=2026", {
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.some((u: any) => u.id === "deactivated-worker")).toBe(true);
    });
  });
});
