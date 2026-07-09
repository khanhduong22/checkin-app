import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma before importing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollAdjustment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userTask: {
      findMany: vi.fn(),
    },
  },
}));

import { runCarryingBonus } from "@/lib/carrying-bonus";
import { prisma } from "@/lib/prisma";

const mockFindFirst = prisma.payrollAdjustment.findFirst as ReturnType<typeof vi.fn>;
const mockCreate = prisma.payrollAdjustment.create as ReturnType<typeof vi.fn>;
const mockFindManyTasks = prisma.userTask.findMany as ReturnType<typeof vi.fn>;

describe("runCarryingBonus()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("awards +100k to the user with the most approved carrying points (between 10 and 50) on the last day of the month past 18:00", async () => {
    // Set time to May 31, 2026 at 19:00 (last day of May, past 18:00)
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockResolvedValue(null); // No existing bonus given
    
    // User task data: User 1 has 9 points, User 2 has 12 points, User 3 has 0 points
    mockFindManyTasks.mockResolvedValue([
      { userId: "user-1", finalAmount: 9 },
      { userId: "user-2", finalAmount: 12 },
      { userId: "user-1", finalAmount: 0 },
    ]);
    mockCreate.mockResolvedValue({});

    await runCarryingBonus();

    expect(mockFindFirst).toHaveBeenCalledOnce();
    expect(mockFindManyTasks).toHaveBeenCalledOnce();
    expect(mockFindManyTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: {
            role: {
              not: "ADMIN"
            }
          }
        })
      })
    );
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-2",
          amount: 100000,
          reason: "Thưởng Chiến Thần Bưng Hàng (Top 1 T5/2026)",
        }),
      })
    );
  });

  it("awards +200k to the user with the most approved carrying points (greater than 50) on the last day of the month past 18:00", async () => {
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockResolvedValue(null);
    
    // User 2 has 55 points (> 50)
    mockFindManyTasks.mockResolvedValue([
      { userId: "user-1", finalAmount: 9 },
      { userId: "user-2", finalAmount: 55 },
    ]);
    mockCreate.mockResolvedValue({});

    await runCarryingBonus();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-2",
          amount: 200000,
          reason: "Thưởng Chiến Thần Bưng Hàng (Top 1 T5/2026)",
        }),
      })
    );
  });

  it("does NOT run if it is not the last day of the month", async () => {
    // Set time to May 15, 2026 at 19:00
    vi.setSystemTime(new Date("2026-05-15T19:00:00+07:00"));

    await runCarryingBonus();

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockFindManyTasks).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT run if it is the last day of the month but before 18:00", async () => {
    // Set time to May 31, 2026 at 12:00
    vi.setSystemTime(new Date("2026-05-31T12:00:00+07:00"));

    await runCarryingBonus();

    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockFindManyTasks).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT award bonus if already awarded for the target month", async () => {
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockResolvedValue({ id: "existing-adj" }); // Already awarded

    await runCarryingBonus();

    expect(mockFindFirst).toHaveBeenCalledOnce();
    expect(mockFindManyTasks).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT award bonus if there are no approved carrying tasks", async () => {
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockResolvedValue(null);
    mockFindManyTasks.mockResolvedValue([]); // No tasks

    await runCarryingBonus();

    expect(mockFindFirst).toHaveBeenCalledOnce();
    expect(mockFindManyTasks).toHaveBeenCalledOnce();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does NOT award bonus if the top user has less than 10 points", async () => {
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockResolvedValue(null);
    mockFindManyTasks.mockResolvedValue([
      { userId: "user-1", finalAmount: 9 },
    ]);

    await runCarryingBonus();

    expect(mockFindFirst).toHaveBeenCalledOnce();
    expect(mockFindManyTasks).toHaveBeenCalledOnce();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("gracefully catches database errors without crashing", async () => {
    vi.setSystemTime(new Date("2026-05-31T19:00:00+07:00"));

    mockFindFirst.mockRejectedValue(new Error("Database failure"));

    await expect(runCarryingBonus()).resolves.not.toThrow();
  });
});
