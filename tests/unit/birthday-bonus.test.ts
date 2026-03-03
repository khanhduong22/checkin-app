import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    payrollAdjustment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { runBirthdayBonus } from "@/lib/birthday-bonus";
import { prisma } from "@/lib/prisma";

const mockFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.payrollAdjustment.findFirst as ReturnType<typeof vi.fn>;
const mockCreate = prisma.payrollAdjustment.create as ReturnType<typeof vi.fn>;

// Build a birthday Date that matches today (month + day), but in a past year
function makeBirthdayMatchingToday(): Date {
  const now = new Date();
  // Use VN time (UTC+7) to match the logic in birthday-bonus.ts
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  // Set the birthday to same month/day in UTC
  return new Date(
    Date.UTC(2000, vnNow.getUTCMonth(), vnNow.getUTCDate())
  );
}

describe("runBirthdayBonus()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a +100k adjustment for a user whose birthday is today", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Văn A",
      email: "a@example.com",
      birthday: makeBirthdayMatchingToday(),
    };

    mockFindMany.mockResolvedValue([user]);
    mockFindFirst.mockResolvedValue(null); // no existing bonus
    mockCreate.mockResolvedValue({});

    await runBirthdayBonus();

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          amount: 100000,
          reason: expect.stringContaining("sinh nhật"),
        }),
      })
    );
  });

  it("does NOT create adjustment if bonus already given today", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Văn B",
      email: "b@example.com",
      birthday: makeBirthdayMatchingToday(),
    };

    mockFindMany.mockResolvedValue([user]);
    mockFindFirst.mockResolvedValue({ id: "existing-adj" }); // already given
    mockCreate.mockResolvedValue({});

    await runBirthdayBonus();

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT create adjustment for user whose birthday is a different day", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Create a birthday matching yesterday
    const vnYesterday = new Date(yesterday.getTime() + 7 * 60 * 60 * 1000);
    const notTodayBirthday = new Date(
      Date.UTC(2000, vnYesterday.getUTCMonth(), vnYesterday.getUTCDate())
    );

    const user = {
      id: "user-2",
      name: "Trần Thị C",
      email: "c@example.com",
      birthday: notTodayBirthday,
    };

    mockFindMany.mockResolvedValue([user]);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});

    await runBirthdayBonus();

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does nothing when no users have a birthday set", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCreate.mockResolvedValue({});

    await runBirthdayBonus();

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not throw on Prisma errors — swallows error gracefully", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed"));

    await expect(runBirthdayBonus()).resolves.not.toThrow();
  });
});
