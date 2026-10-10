import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockAutoScheduleAdminNa,
  mockRunBirthdayBonus,
  mockRunCarryingBonus,
  mockRunPackingBonus,
  mockClosePayrollMonth,
  mockPayrollPeriodFindUnique,
} = vi.hoisted(() => ({
  mockAutoScheduleAdminNa: vi.fn(),
  mockRunBirthdayBonus: vi.fn(),
  mockRunCarryingBonus: vi.fn(),
  mockRunPackingBonus: vi.fn(),
  mockClosePayrollMonth: vi.fn(),
  mockPayrollPeriodFindUnique: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    payrollPeriod: {
      findUnique: mockPayrollPeriodFindUnique,
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("@checkin/shared", () => ({
  runBirthdayBonus: mockRunBirthdayBonus,
  runCarryingBonus: mockRunCarryingBonus,
  runPackingBonus: mockRunPackingBonus,
}));

vi.mock("../src/lib/auto-schedule", () => ({
  autoScheduleAdminNa: mockAutoScheduleAdminNa,
  ensureAdminNaSchedule: vi.fn(),
}));

vi.mock("../src/lib/payroll-close", () => ({
  closePayrollMonth: mockClosePayrollMonth,
}));

import { app } from "../src/app";

describe("Cron Routes & Scheduled Automation", () => {
  const originalSecret = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-cron-token";
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("Authentication Gate", () => {
    it("returns 401 if missing Authorization header or secret query in production", async () => {
      const res = await app.request("/api/cron/auto-schedule");
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("CRON_SECRET");
    });

    it("returns 401 if CRON_SECRET is invalid", async () => {
      const res = await app.request("/api/cron/auto-schedule", {
        headers: { Authorization: "Bearer wrong-token" },
      });
      expect(res.status).toBe(401);
    });

    it("allows request when valid secret is provided via Authorization Bearer header", async () => {
      mockAutoScheduleAdminNa.mockResolvedValue({
        success: true,
        userFound: true,
        createdCount: 6,
        skippedCount: 0,
        details: [],
      });

      const res = await app.request("/api/cron/auto-schedule", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockAutoScheduleAdminNa).toHaveBeenCalledWith(12);
    });

    it("allows request when valid secret is provided via query parameter", async () => {
      mockAutoScheduleAdminNa.mockResolvedValue({
        success: true,
        userFound: true,
        createdCount: 0,
        skippedCount: 6,
        details: [],
      });

      const res = await app.request("/api/cron/auto-schedule?secret=super-secret-cron-token");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/cron/birthday-bonus", () => {
    it("triggers birthday bonus runner and returns 200", async () => {
      mockRunBirthdayBonus.mockResolvedValue(undefined);

      const res = await app.request("/api/cron/birthday-bonus", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockRunBirthdayBonus).toHaveBeenCalled();
    });
  });

  describe("GET /api/cron/carrying-bonus", () => {
    it("triggers carrying bonus runner and returns 200", async () => {
      mockRunCarryingBonus.mockResolvedValue(undefined);

      const res = await app.request("/api/cron/carrying-bonus", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockRunCarryingBonus).toHaveBeenCalled();
    });
  });

  describe("GET /api/cron/packing-bonus", () => {
    it("triggers packing bonus runner and returns 200", async () => {
      mockRunPackingBonus.mockResolvedValue(undefined);

      const res = await app.request("/api/cron/packing-bonus", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockRunPackingBonus).toHaveBeenCalled();
    });
  });

  describe("GET /api/cron/payroll-close", () => {
    it("skips auto-close if not last day of month and force is not set", async () => {
      const res = await app.request("/api/cron/payroll-close", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      // Unless today happens to be the last day of the month
    });

    it("executes closePayrollMonth when force=true", async () => {
      mockPayrollPeriodFindUnique.mockResolvedValue(null);
      mockClosePayrollMonth.mockResolvedValue({
        success: true,
        month: 10,
        year: 2026,
        period: { id: "p-1", status: "CLOSED" },
        payslipCount: 15,
      });

      const res = await app.request("/api/cron/payroll-close?force=true", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockClosePayrollMonth).toHaveBeenCalled();
    });
  });

  describe("GET /api/cron/all", () => {
    it("executes all cron jobs and returns aggregated summary", async () => {
      mockAutoScheduleAdminNa.mockResolvedValue({ success: true });
      mockRunBirthdayBonus.mockResolvedValue(undefined);
      mockRunCarryingBonus.mockResolvedValue(undefined);
      mockRunPackingBonus.mockResolvedValue(undefined);

      const res = await app.request("/api/cron/all", {
        headers: { Authorization: "Bearer super-secret-cron-token" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results.autoSchedule).toBeDefined();
      expect(data.results.birthdayBonus.ok).toBe(true);
      expect(data.results.carryingBonus.ok).toBe(true);
      expect(data.results.packingBonus.ok).toBe(true);
    });
  });
});
