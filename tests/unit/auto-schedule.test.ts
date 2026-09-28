import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { autoScheduleAdminNa, ensureAdminNaSchedule } from "../../src/lib/auto-schedule";
import { prisma } from "../../src/lib/prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    workShift: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

const mockUserFindFirst = prisma.user.findFirst as ReturnType<typeof vi.fn>;
const mockShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockShiftCreateMany = prisma.workShift.createMany as ReturnType<typeof vi.fn>;

describe("autoScheduleAdminNa()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock date to Monday, Sep 28, 2026 (07:00 UTC) = 14:00 VN
    const mockNow = new Date("2026-09-28T07:00:00.000Z");
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns failure if Admin Na user is not found", async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const result = await autoScheduleAdminNa(1);
    expect(result.success).toBe(false);
    expect(result.userFound).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(mockShiftCreateMany).not.toHaveBeenCalled();
  });

  it("creates shifts from Mon-Sat 09:30-17:30 (02:30-10:30 UTC) and skips Sundays", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "na-id",
      name: "Na",
      role: "ADMIN",
      email: "maithina4040@gmail.com",
    });

    // No existing shifts
    mockShiftFindMany.mockResolvedValue([]);
    mockShiftCreateMany.mockResolvedValue({ count: 6 });

    // 0 weeks ahead means just the current week (Mon-Sat = 6 days)
    const result = await autoScheduleAdminNa(0);

    expect(result.success).toBe(true);
    expect(result.userFound).toBe(true);
    expect(result.createdCount).toBe(6);
    expect(mockShiftCreateMany).toHaveBeenCalledTimes(1);

    const createdData = mockShiftCreateMany.mock.calls[0][0].data;
    expect(createdData).toHaveLength(6);

    // Verify time for each created shift: starts at 02:30 UTC and ends at 10:30 UTC
    for (const shift of createdData) {
      expect(shift.userId).toBe("na-id");
      expect(shift.status).toBe("APPROVED");
      const start = new Date(shift.start);
      const end = new Date(shift.end);
      expect(start.getUTCHours()).toBe(2);
      expect(start.getUTCMinutes()).toBe(30);
      expect(end.getUTCHours()).toBe(10);
      expect(end.getUTCMinutes()).toBe(30);

      // Verify no Sunday (0)
      const vnDate = new Date(start.getTime() + 7 * 60 * 60 * 1000);
      expect(vnDate.getUTCDay()).not.toBe(0);
    }
  });

  it("skips days that already have shifts for Na without duplicating", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "na-id",
      name: "Na",
      role: "ADMIN",
    });

    // Monday (2026-09-28) already has a shift
    mockShiftFindMany.mockResolvedValue([
      {
        id: 101,
        start: new Date("2026-09-28T02:30:00.000Z"),
      },
    ]);
    mockShiftCreateMany.mockResolvedValue({ count: 5 });

    const result = await autoScheduleAdminNa(0);

    expect(result.success).toBe(true);
    expect(result.createdCount).toBe(5);
    expect(result.skippedCount).toBe(1);

    const createdData = mockShiftCreateMany.mock.calls[0][0].data;
    expect(createdData).toHaveLength(5);
    // Ensure 2026-09-28 is NOT in createdData
    const hasMonday = createdData.some((s: any) =>
      new Date(s.start).toISOString().startsWith("2026-09-28")
    );
    expect(hasMonday).toBe(false);
  });

  it("ensureAdminNaSchedule runs cleanly without throwing", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "na-id",
      name: "Na",
    });
    mockShiftFindMany.mockResolvedValue([]);
    mockShiftCreateMany.mockResolvedValue({ count: 0 });

    await expect(ensureAdminNaSchedule(1)).resolves.not.toThrow();
  });
});
