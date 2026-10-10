import { describe, it, expect, vi, beforeEach } from "vitest";
import { isShiftLocked, toVietnamTime } from "../src/lib/schedule-lock";
import { applyLateSchedulePenalty } from "../src/lib/schedule-penalty";
import { autoScheduleAdminNa } from "../src/lib/auto-schedule";

const {
  mockUserFindUnique,
  mockUserFindFirst,
  mockWorkShiftFindMany,
  mockWorkShiftCreateMany,
  mockAdjustmentFindFirst,
  mockAdjustmentCreate,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockWorkShiftFindMany: vi.fn(),
  mockWorkShiftCreateMany: vi.fn(),
  mockAdjustmentFindFirst: vi.fn(),
  mockAdjustmentCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
    },
    workShift: {
      findMany: mockWorkShiftFindMany,
      createMany: mockWorkShiftCreateMany,
    },
    payrollAdjustment: {
      findFirst: mockAdjustmentFindFirst,
      create: mockAdjustmentCreate,
    },
  },
}));

vi.mock("../src/lib/cache", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue(undefined),
  invalidatePayrollCache: vi.fn().mockResolvedValue(undefined),
  getOrSetCache: vi.fn().mockImplementation((_k, _t, fn) => fn()),
}));

describe("Schedule Rules & Automation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isShiftLocked()", () => {
    it("locks shift if current time is after previous Sunday 00:00 VN", () => {
      // Shift is on Wednesday Oct 7, 2026 (Monday is Oct 5, lock deadline was Sunday Oct 4, 00:00 VN)
      const shiftDate = new Date("2026-10-07T08:00:00.000Z");

      // Now is Monday Oct 5, 2026 10:00 VN => should be locked
      const nowDuringWeek = new Date("2026-10-05T03:00:00.000Z"); // 10:00 GMT+7
      expect(isShiftLocked(shiftDate, nowDuringWeek)).toBe(true);

      // Now is Sunday Oct 4, 2026 01:00 VN => deadline was Oct 4 00:00 VN => already locked
      const nowSundayMorning = new Date("2026-10-03T18:00:00.000Z"); // 01:00 Oct 4 GMT+7
      expect(isShiftLocked(shiftDate, nowSundayMorning)).toBe(true);
    });

    it("does NOT lock shift if current time is before previous Sunday 00:00 VN", () => {
      // Shift is on Wednesday Oct 7, 2026 (lock deadline is Sunday Oct 4, 00:00 VN)
      const shiftDate = new Date("2026-10-07T08:00:00.000Z");

      // Now is Friday Oct 2, 2026 15:00 VN => before Oct 4 00:00 => unlocked
      const nowFriday = new Date("2026-10-02T08:00:00.000Z");
      expect(isShiftLocked(shiftDate, nowFriday)).toBe(false);

      // Now is Saturday Oct 3, 2026 23:59:59 VN => before Oct 4 00:00 => unlocked
      const nowSaturdayNight = new Date("2026-10-03T16:59:59.000Z"); // 23:59:59 GMT+7
      expect(isShiftLocked(shiftDate, nowSaturdayNight)).toBe(false);
    });
  });

  describe("applyLateSchedulePenalty()", () => {
    it("skips penalty if skipPenalty flag is true", async () => {
      const result = await applyLateSchedulePenalty("u1", new Date(), true);
      expect(result.applied).toBe(false);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("skips penalty if user is FULL_TIME or ADMIN", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "u-admin",
        role: "ADMIN",
        employmentType: "PART_TIME",
      });

      const resAdmin = await applyLateSchedulePenalty("u-admin", new Date());
      expect(resAdmin.applied).toBe(false);

      mockUserFindUnique.mockResolvedValueOnce({
        id: "u-ft",
        role: "STAFF",
        employmentType: "FULL_TIME",
      });

      const resFT = await applyLateSchedulePenalty("u-ft", new Date());
      expect(resFT.applied).toBe(false);
      expect(mockAdjustmentCreate).not.toHaveBeenCalled();
    });

    it("applies 50k penalty when registering late (after Saturday 00:00 VN of week prior)", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-pt",
        role: "STAFF",
        employmentType: "PART_TIME",
      });
      mockAdjustmentFindFirst.mockResolvedValue(null);
      mockAdjustmentCreate.mockResolvedValue({ id: "adj-1" });

      // Shift is Wednesday Oct 7, 2026 (Monday is Oct 5, penalty deadline is Saturday Oct 3 00:00 VN)
      const shiftDate = new Date("2026-10-07T08:00:00.000Z");
      // Now is Sunday Oct 4, 2026 (after Saturday Oct 3 00:00 VN)
      const now = new Date("2026-10-04T08:00:00.000Z");

      const res = await applyLateSchedulePenalty("u-pt", shiftDate, false, now);

      expect(res.applied).toBe(true);
      expect(res.reason).toContain("Phạt đăng ký lịch muộn tuần 05/10 - 11/10");
      expect(mockAdjustmentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "u-pt",
          amount: -50000,
          reason: expect.stringContaining("Phạt đăng ký lịch muộn"),
        }),
      });
    });

    it("does NOT apply duplicate penalty if one already exists for that week", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-pt",
        role: "STAFF",
        employmentType: "PART_TIME",
      });
      mockAdjustmentFindFirst.mockResolvedValue({ id: "existing-adj" });

      const shiftDate = new Date("2026-10-07T08:00:00.000Z");
      const now = new Date("2026-10-04T08:00:00.000Z");

      const res = await applyLateSchedulePenalty("u-pt", shiftDate, false, now);

      expect(res.applied).toBe(false);
      expect(mockAdjustmentCreate).not.toHaveBeenCalled();
    });
  });

  describe("autoScheduleAdminNa()", () => {
    it("returns userFound: false if Na is not in database", async () => {
      mockUserFindFirst.mockResolvedValue(null);

      const res = await autoScheduleAdminNa(2);
      expect(res.success).toBe(false);
      expect(res.userFound).toBe(false);
      expect(res.createdCount).toBe(0);
    });

    it("schedules Mon-Sat shifts 09:30-17:30 VN and skips existing ones", async () => {
      mockUserFindFirst.mockResolvedValue({
        id: "na-id",
        name: "Na",
        email: "maithina4040@gmail.com",
        role: "ADMIN",
      });

      // Existing shift for Monday of current week
      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 1,
          start: new Date(Date.now()), // current day
        },
      ]);
      mockWorkShiftCreateMany.mockResolvedValue({ count: 11 });

      const res = await autoScheduleAdminNa(2);

      expect(res.success).toBe(true);
      expect(res.userFound).toBe(true);
      expect(res.userName).toBe("Na");
      expect(mockWorkShiftCreateMany).toHaveBeenCalled();
      expect(res.createdCount).toBeGreaterThan(0);
    });
  });
});
