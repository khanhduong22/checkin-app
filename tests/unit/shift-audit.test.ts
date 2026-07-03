import { describe, it, expect, vi, beforeEach } from "vitest";
import { logShiftAction } from "../../src/lib/audit";
import { getShiftAuditLogs } from "../../src/app/actions/audit-actions";
import { prisma } from "../../src/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    shiftAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockAuditCreate = prisma.shiftAuditLog.create as ReturnType<typeof vi.fn>;
const mockAuditFindMany = prisma.shiftAuditLog.findMany as ReturnType<typeof vi.fn>;
const mockAuditCount = prisma.shiftAuditLog.count as ReturnType<typeof vi.fn>;

describe("Shift Audit Log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logShiftAction", () => {
    it("successfully creates a shift audit log entry", async () => {
      mockAuditCreate.mockResolvedValue({ id: 1 });

      const logParams = {
        shiftId: 101,
        userId: "user-1",
        action: "CREATE" as const,
        changedById: "admin-1",
        newStart: new Date("2026-07-01T08:00:00Z"),
        newEnd: new Date("2026-07-01T12:00:00Z"),
      };

      await logShiftAction(logParams);

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: {
          shiftId: 101,
          userId: "user-1",
          action: "CREATE",
          changedById: "admin-1",
          oldStart: undefined,
          oldEnd: undefined,
          newStart: logParams.newStart,
          newEnd: logParams.newEnd,
        },
      });
    });
  });

  describe("getShiftAuditLogs", () => {
    it("returns error if unauthorized", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await getShiftAuditLogs();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error if not admin", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "user-1", role: "STAFF" });

      const result = await getShiftAuditLogs();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Forbidden");
    });

    it("returns logs and total count if user is admin", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "admin@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
      
      const mockLogs = [
        {
          id: 1,
          shiftId: 101,
          userId: "user-1",
          action: "CREATE",
          changedById: "admin-1",
          createdAt: new Date(),
          user: { name: "User 1", email: "user1@example.com" },
          changedBy: { name: "Admin", email: "admin@example.com" },
        }
      ];
      mockAuditFindMany.mockResolvedValue(mockLogs);
      mockAuditCount.mockResolvedValue(1);

      const result = await getShiftAuditLogs(1, 50);

      expect(result.success).toBe(true);
      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
      expect(mockAuditFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 50,
        skip: 0,
        include: {
          user: { select: { id: true, name: true, email: true } },
          changedBy: { select: { id: true, name: true, email: true } },
        },
      });
    });
  });
});
