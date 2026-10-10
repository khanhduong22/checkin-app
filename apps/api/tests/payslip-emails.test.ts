import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPayslipFindUnique,
  mockPayslipFindMany,
  mockPayslipUpdate,
} = vi.hoisted(() => ({
  mockPayslipFindUnique: vi.fn(),
  mockPayslipFindMany: vi.fn(),
  mockPayslipUpdate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    payslip: {
      findUnique: mockPayslipFindUnique,
      findMany: mockPayslipFindMany,
      update: mockPayslipUpdate,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../src/lib/cache", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue(undefined),
  invalidatePayrollCache: vi.fn().mockResolvedValue(undefined),
  getOrSetCache: vi.fn().mockImplementation((_k, _t, fn) => fn()),
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Payslip Email Notification Endpoints", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    adminToken = await signAccessToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });

    userToken = await signAccessToken({
      sub: "user-1",
      email: "user@example.com",
      role: "USER",
    });
  });

  describe("Security & Permission Guards", () => {
    it("returns 401 Unauthorized without auth token for single email endpoint", async () => {
      const res = await app.request("/api/admin/payroll/email/user-1?month=10&year=2026", {
        method: "POST",
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("returns 403 Forbidden for non-admin user on single email endpoint", async () => {
      const res = await app.request("/api/admin/payroll/email/user-1?month=10&year=2026", {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("returns 401 Unauthorized without auth token for bulk email endpoint", async () => {
      const res = await app.request("/api/admin/payroll/email-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden for non-admin user on bulk email endpoint", async () => {
      const res = await app.request("/api/admin/payroll/email-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/admin/payroll/email/:userId", () => {
    it("fails with 400 if payslip is not closed (not found)", async () => {
      mockPayslipFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/admin/payroll/email/user-1?month=10&year=2026", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Payslip chưa được chốt. Cần chốt bảng lương trước.");
    });

    it("fails with 400 if user has no email", async () => {
      mockPayslipFindUnique.mockResolvedValue({
        id: "payslip-1",
        userId: "user-1",
        month: 10,
        year: 2026,
        netSalary: 5000000,
        content: { totalHours: 100 },
        user: { id: "user-1", name: "Nguyễn Văn A", email: null },
      });

      const res = await app.request("/api/admin/payroll/email/user-1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Nhân viên chưa có email.");
    });

    it("succeeds and updates emailSentAt on single send", async () => {
      mockPayslipFindUnique.mockResolvedValue({
        id: "payslip-1",
        userId: "user-1",
        month: 10,
        year: 2026,
        netSalary: 7500000,
        content: {
          totalHours: 120,
          hourlyRate: 50000,
          baseSalary: 6000000,
          monthlySalary: 0,
          employmentType: "PART_TIME",
          totalTaskIncome: 1000000,
          totalAdjustments: 500000,
          bonusAmount: 0,
          lateCount: 0,
          adjustments: [{ amount: 500000, reason: "Thưởng dự án" }],
        },
        user: { id: "user-1", name: "Nguyễn Văn A", email: "vana@example.com" },
      });
      mockPayslipUpdate.mockResolvedValue({
        id: "payslip-1",
        emailSentAt: new Date(),
      });

      const res = await app.request("/api/admin/payroll/email/user-1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("Đã gửi phiếu lương thành công");

      expect(mockPayslipUpdate).toHaveBeenCalledWith({
        where: { userId_month_year: { userId: "user-1", month: 10, year: 2026 } },
        data: { emailSentAt: expect.any(Date) },
      });
    });
  });

  describe("POST /api/admin/payroll/email-all", () => {
    it("fails with 400 if no closed payslips exist for the month", async () => {
      mockPayslipFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/payroll/email-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Chưa có bảng lương chốt cho tháng này");
    });

    it("succeeds and returns sent/failed summary for bulk send", async () => {
      mockPayslipFindMany.mockResolvedValue([
        {
          id: "payslip-1",
          userId: "user-1",
          month: 10,
          year: 2026,
          netSalary: 6000000,
          content: { totalHours: 100, hourlyRate: 60000 },
          user: { id: "user-1", name: "User 1", email: "user1@example.com" },
        },
        {
          id: "payslip-2",
          userId: "user-2",
          month: 10,
          year: 2026,
          netSalary: 4000000,
          content: { totalHours: 80, hourlyRate: 50000 },
          user: { id: "user-2", name: "User 2", email: null },
        },
      ]);
      mockPayslipUpdate.mockResolvedValue({ id: "payslip-1", emailSentAt: new Date() });

      const res = await app.request("/api/admin/payroll/email-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: 10, year: 2026 }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.sent).toBe(1);
      expect(json.data.failed).toBe(1);
      expect(json.data.errors).toEqual(["User 2: không có email"]);

      expect(mockPayslipUpdate).toHaveBeenCalledTimes(1);
      expect(mockPayslipUpdate).toHaveBeenCalledWith({
        where: { id: "payslip-1" },
        data: { emailSentAt: expect.any(Date) },
      });
    });
  });
});
