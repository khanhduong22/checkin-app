import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing the module that uses it
vi.mock("@/lib/prisma", () => ({
  prisma: {
    checkIn: {
      findMany: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
    },
  },
}));

import { calculateStreak } from "@/lib/streak";
import { prisma } from "@/lib/prisma";

// Helper: create a Date for a specific day offset from today (0 = today, -1 = yesterday, etc.)
function daysAgo(offset: number, hour = 8, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Skip to the nearest weekday (Mon-Fri), going backwards
function prevWeekday(offset: number): Date {
  const d = daysAgo(offset);
  // If it's a Sunday (0) or Saturday (6), move back more
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

describe("calculateStreak()", () => {
  const userId = "user-1";
  const mockCheckins = prisma.checkIn.findMany as ReturnType<typeof vi.fn>;
  const mockRequests = prisma.request.findMany as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when user has no checkins", async () => {
    mockCheckins.mockResolvedValue([]);
    mockRequests.mockResolvedValue([]);

    const result = await calculateStreak(userId);
    expect(result).toBe(0);
  });

  it("returns 0 when today's only checkin was late (after 8:31)", async () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0); // 9:00 = late

    mockCheckins.mockResolvedValue([
      { userId, type: "checkin", timestamp: today },
    ]);
    mockRequests.mockResolvedValue([]);

    const result = await calculateStreak(userId);
    expect(result).toBe(0);
  });

  it("counts today if checked in on time (8:00)", async () => {
    const today = new Date();
    // Only count if today is a weekday
    if (today.getDay() === 0 || today.getDay() === 6) {
      // Skip weekend
      return;
    }
    today.setHours(8, 0, 0, 0);

    mockCheckins.mockResolvedValue([{ userId, type: "checkin", timestamp: today }]);
    mockRequests.mockResolvedValue([]);

    const result = await calculateStreak(userId);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("increments streak for approved LEAVE days (no checkin needed)", async () => {
    const today = new Date();
    if (today.getDay() === 0 || today.getDay() === 6) return; // skip weekend test

    // No checkin today, but LEAVE is approved
    mockCheckins.mockResolvedValue([]);
    mockRequests.mockResolvedValue([
      { userId, type: "LEAVE", status: "APPROVED", date: today },
    ]);

    const result = await calculateStreak(userId);
    // Streak >= 1 from the leave day
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it("breaks streak with a missing day (no checkin, no leave)", async () => {
    const today = new Date();
    if (today.getDay() === 0 || today.getDay() === 6) return;

    // Checkin only today — yesterday missed
    today.setHours(8, 0, 0, 0);
    mockCheckins.mockResolvedValue([{ userId, type: "checkin", timestamp: today }]);
    mockRequests.mockResolvedValue([]);

    // Streak should be exactly 1 (only today)
    const result = await calculateStreak(userId);
    expect(result).toBe(1);
  });
});
