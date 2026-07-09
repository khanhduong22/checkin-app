import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing report library
vi.mock("@/lib/prisma", () => ({
  prisma: {
    checkIn: {
      findMany: vi.fn(),
    },
    workShift: {
      findMany: vi.fn(),
    },
  },
}));

import { getMonthlyReport } from "@/lib/report";
import { prisma } from "@/lib/prisma";

const mockFindManyCheckins = prisma.checkIn.findMany as ReturnType<typeof vi.fn>;
const mockFindManyShifts = prisma.workShift.findMany as ReturnType<typeof vi.fn>;

describe("getMonthlyReport()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates report metrics and filters out users whose role is ADMIN", async () => {
    mockFindManyCheckins.mockResolvedValue([
      {
        userId: "user-employee",
        type: "checkin",
        timestamp: new Date("2026-05-10T08:00:00Z"),
        user: {
          id: "user-employee",
          name: "Employee A",
          role: "USER",
          employmentType: "PART_TIME",
        },
      },
    ]);

    mockFindManyShifts.mockResolvedValue([
      {
        userId: "user-employee",
        start: new Date("2026-05-10T08:30:00Z"),
        end: new Date("2026-05-10T17:30:00Z"),
      },
    ]);

    const report = await getMonthlyReport(5, 2026);

    // Verify Prisma query was called with the not ADMIN filter
    expect(mockFindManyCheckins).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: expect.objectContaining({
            role: expect.objectContaining({
              not: "ADMIN",
            }),
          }),
        }),
      })
    );

    // Verify output structure
    expect(report.topEarlyBird).toBeDefined();
    expect(report.topLate).toBeDefined();
    expect(report.topDiscipline).toBeDefined();
  });
});
