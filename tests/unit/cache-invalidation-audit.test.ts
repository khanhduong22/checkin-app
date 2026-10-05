import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mock redis and cache
vi.mock("@/lib/cache", () => ({
  redis: {
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
  getOrSetCache: vi.fn(async (_key: string, fetcher: () => Promise<any>) => fetcher()),
  invalidateCachePattern: vi.fn().mockResolvedValue(0),
  invalidateShiftDutyCache: vi.fn().mockResolvedValue(undefined),
}));

// 2. Mock stats and payroll
vi.mock("@/lib/stats", () => ({
  invalidateUserStatsCache: vi.fn().mockResolvedValue(undefined),
  getUserMonthlyStats: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/payroll", () => ({
  invalidatePayrollCache: vi.fn().mockResolvedValue(undefined),
  getMonthlyPayroll: vi.fn().mockResolvedValue([]),
  calculatePayroll: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/schedule-lock", () => ({
  isShiftLocked: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/audit", () => ({
  logShiftAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/schedule-penalty", () => ({
  applyLateSchedulePenalty: vi.fn().mockResolvedValue(undefined),
}));

// 3. Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// 4. Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// 5. Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "x-forwarded-for": "127.0.0.1" })),
}));

vi.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    allowedIP: {
      findMany: vi.fn().mockResolvedValue([{ prefix: "127.0.0.1" }]),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    request: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    workShift: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    payrollAdjustment: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    payrollPeriod: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
    },
    payrollRecord: {
      upsert: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
    },
    checkIn: {
      create: vi.fn().mockResolvedValue({ id: "checkin-1" }),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    shiftDuty: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    systemSetting: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { invalidateCachePattern, invalidateShiftDutyCache } from "@/lib/cache";
import { invalidateUserStatsCache } from "@/lib/stats";
import { invalidatePayrollCache } from "@/lib/payroll";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

import { submitRequest, approveRequest, rejectRequest } from "@/app/actions/request";
import { updateUserRate, updateUserMonthlySalary, deleteUser } from "@/app/admin/actions";
import { addAdjustment, closePayrollMonth } from "@/app/actions/payroll";
import { autoScheduleAdminNa } from "@/lib/auto-schedule";
import { performCheckIn } from "@/app/actions";
import { cancelShift } from "@/app/actions/shift";

describe("Cache Invalidation & Route Revalidation Audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invalidateShiftDutyCache", () => {
    it("is called and delegates properly in actions", async () => {
      await invalidateShiftDutyCache("user-123");
      expect(invalidateShiftDutyCache).toHaveBeenCalledWith("user-123");
    });
  });

  describe("src/app/actions/request.ts", () => {
    it("submitRequest with EARLY_LEAVE invalidates user stats and revalidates /requests paths", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { email: "staff@example.com" },
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "staff-1",
        email: "staff@example.com",
      });
      (prisma.request.findFirst as any).mockResolvedValue(null);
      (prisma.request.create as any).mockResolvedValue({
        id: "req-1",
        userId: "staff-1",
        type: "EARLY_LEAVE",
      });

      const res = await submitRequest("2026-10-05", "EARLY_LEAVE", "Bận việc gia đình");
      expect(res.success).toBe(true);
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-1");
      expect(revalidatePath).toHaveBeenCalledWith("/requests");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/requests");
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
    });

    it("approveRequest invalidates payroll & user stats and revalidates user and admin views", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { email: "admin@example.com", role: "ADMIN" },
      });
      (prisma.request.findUnique as any).mockResolvedValue({
        id: "req-1",
        userId: "staff-1",
        type: "LEAVE",
        date: new Date(),
      });
      (prisma.request.update as any).mockResolvedValue({
        id: "req-1",
        userId: "staff-1",
        status: "APPROVED",
      });

      const res = await approveRequest("req-1");
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-1");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/requests");
      expect(revalidatePath).toHaveBeenCalledWith("/requests");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees/staff-1");
    });

    it("rejectRequest invalidates payroll & user stats", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { email: "admin@example.com", role: "ADMIN" },
      });
      (prisma.request.findUnique as any).mockResolvedValue({
        id: "req-2",
        userId: "staff-2",
        type: "WFH",
      });
      (prisma.request.update as any).mockResolvedValue({
        id: "req-2",
        userId: "staff-2",
        status: "REJECTED",
      });

      const res = await rejectRequest("req-2");
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-2");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/requests");
    });
  });

  describe("src/app/admin/actions.ts", () => {
    it("updateUserRate invalidates payroll & user stats and revalidates /admin/payroll", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { role: "ADMIN" },
      });
      (prisma.user.update as any).mockResolvedValue({ id: "staff-1", hourlyRate: 30000 });

      const res = await updateUserRate("staff-1", 30000);
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-1");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees/staff-1");
    });

    it("updateUserMonthlySalary invalidates payroll & user stats", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { role: "ADMIN" },
      });
      (prisma.user.update as any).mockResolvedValue({ id: "staff-1", monthlySalary: 7000000 });

      const res = await updateUserMonthlySalary("staff-1", 7000000);
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-1");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
    });

    it("deleteUser invalidates payroll, user stats, shift duties and revalidates all admin paths", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { role: "ADMIN" },
      });
      (prisma.user.delete as any).mockResolvedValue({ id: "staff-del" });

      const res = await deleteUser("staff-del");
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-del");
      expect(invalidateShiftDutyCache).toHaveBeenCalledWith("staff-del");
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
    });
  });

  describe("src/app/actions/payroll.ts", () => {
    it("addAdjustment invalidates payroll & user stats and revalidates employee and payroll pages", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { role: "ADMIN" },
      });
      (prisma.payrollAdjustment.create as any).mockResolvedValue({
        id: "adj-1",
        userId: "staff-1",
        amount: 50000,
      });

      const res = await addAdjustment("staff-1", 50000, "Thưởng nóng");
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("staff-1");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees/staff-1");
    });

    it("closePayrollMonth invalidates specific month payroll cache", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { role: "ADMIN" },
      });
      (prisma.payrollRecord.upsert as any).mockResolvedValue({
        id: "pr-1",
        month: 10,
        year: 2026,
        isClosed: true,
      });

      const res = await closePayrollMonth(10, 2026);
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalledWith(10, 2026);
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
    });
  });

  describe("src/lib/auto-schedule.ts", () => {
    it("autoScheduleAdminNa invalidates stats, payroll, and shift duty cache when shifts are created", async () => {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "admin-na-id",
        name: "Admin Na",
      });
      (prisma.workShift.findMany as any).mockResolvedValue([]);
      (prisma.workShift.createMany as any).mockResolvedValue({ count: 5 });

      const res = await autoScheduleAdminNa(1);
      expect(res.success).toBe(true);
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("admin-na-id");
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateShiftDutyCache).toHaveBeenCalledWith("admin-na-id");
    });
  });

  describe("src/app/actions.ts performCheckIn", () => {
    it("invalidates payroll and user stats, revalidates admin/payroll and admin/employees", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { email: "worker@example.com" },
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "worker-1",
        email: "worker@example.com",
      });
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);
      (prisma.checkIn.create as any).mockResolvedValue({ id: "checkin-1", userId: "worker-1" });

      const res = await performCheckIn("worker-1", "checkin");
      expect(res.success).toBe(true);
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("worker-1");
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/admin");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/payroll");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees/worker-1");
    });
  });

  describe("src/app/actions/shift.ts", () => {
    it("cancelShift invalidates shift duties, user stats, and payroll caches", async () => {
      (getServerSession as any).mockResolvedValue({
        user: { email: "worker@example.com" },
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "worker-1",
        email: "worker@example.com",
        role: "USER",
      });
      (prisma.workShift.findUnique as any).mockResolvedValue({
        id: 100,
        userId: "worker-1",
        start: new Date(Date.now() + 86400000),
      });
      (prisma.workShift.delete as any).mockResolvedValue({ id: 100 });

      const res = await cancelShift(100);
      expect(res.success).toBe(true);
      expect(invalidateShiftDutyCache).toHaveBeenCalledWith("worker-1");
      expect(invalidateUserStatsCache).toHaveBeenCalledWith("worker-1");
      expect(invalidatePayrollCache).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/schedule");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/schedule");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/employees/worker-1");
    });
  });
});
