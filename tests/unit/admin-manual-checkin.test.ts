import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminManualCheckIn } from "@/app/admin/actions";
import { performCheckIn } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { invalidatePayrollCache } from "@/lib/payroll";
import { invalidateUserStatsCache } from "@/lib/stats";
import { headers } from "next/headers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    checkIn: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    allowedIP: {
      findMany: vi.fn(),
    },
    shiftDuty: {
      findMany: vi.fn(),
    },
    workShift: {
      findFirst: vi.fn(),
    },
    request: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

vi.mock("@/lib/payroll", () => ({
  invalidatePayrollCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/stats", () => ({
  invalidateUserStatsCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/actions/manager-checklist-actions", () => ({
  verifyChecklistComplete: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/manager-weekly-actions", () => ({
  verifyWeeklyChecklistComplete: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Check-In Actions & Cache Invalidation", () => {
  const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
  const mockRevalidatePath = revalidatePath as ReturnType<typeof vi.fn>;
  const mockInvalidatePayrollCache = invalidatePayrollCache as ReturnType<typeof vi.fn>;
  const mockInvalidateUserStatsCache = invalidateUserStatsCache as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("adminManualCheckIn", () => {
    it("rejects non-admin users when not in development", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "USER" },
      });

      const origEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      const res = await adminManualCheckIn("user-2", "2026-10-05", "08:00", "17:00");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Forbidden");

      (process.env as any).NODE_ENV = origEnv;
    });

    it("successfully creates manual checkin/checkout, invalidates payroll & stats cache, and revalidates paths", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN", name: "Admin Test" },
      });
      (prisma.checkIn.deleteMany as any).mockResolvedValue({ count: 0 });
      (prisma.checkIn.create as any).mockResolvedValue({ id: "checkin-1" });

      const res = await adminManualCheckIn("target-user-1", "2026-10-05", "08:00", "17:00");

      expect(res.success).toBe(true);
      expect(prisma.checkIn.deleteMany).toHaveBeenCalled();
      expect(prisma.checkIn.create).toHaveBeenCalledTimes(2);

      // Verify cache invalidations
      expect(mockInvalidatePayrollCache).toHaveBeenCalledTimes(1);
      expect(mockInvalidateUserStatsCache).toHaveBeenCalledWith("target-user-1");
      expect(mockInvalidateUserStatsCache).toHaveBeenCalledWith();

      // Verify revalidated paths
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/payroll");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/payroll");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/employees/target-user-1");
    });
  });

  describe("performCheckIn", () => {
    it("invalidates payroll and user stats cache and revalidates '/', '/payroll', and '/admin' on successful checkin", async () => {
      (prisma.allowedIP.findMany as any).mockResolvedValue([{ prefix: "127.0.0.1" }]);
      (prisma.checkIn.findFirst as any).mockResolvedValue(null);
      (prisma.checkIn.create as any).mockResolvedValue({ id: "checkin-new" });
      (prisma.shiftDuty.findMany as any).mockResolvedValue([]);

      const res = await performCheckIn("user-normal-1", "checkin");

      expect(res.success).toBe(true);
      expect(mockInvalidatePayrollCache).toHaveBeenCalledTimes(1);
      expect(mockInvalidateUserStatsCache).toHaveBeenCalledWith("user-normal-1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/payroll");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
    });
  });
});
