import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payrollPeriod: {
      findUnique: vi.fn(),
    },
  },
}));

import { assertPeriodOpen } from "@/lib/payroll-period";
import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.payrollPeriod.findUnique as ReturnType<typeof vi.fn>;

describe("assertPeriodOpen() Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves without throwing when period does not exist (default open)", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(assertPeriodOpen({ month: 10, year: 2026 })).resolves.not.toThrow();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 10, year: 2026 } },
    });
  });

  it("resolves without throwing when period status is OPEN", async () => {
    mockFindUnique.mockResolvedValue({
      id: "p-1",
      month: 10,
      year: 2026,
      status: "OPEN",
    });

    await expect(assertPeriodOpen({ month: 10, year: 2026 })).resolves.not.toThrow();
  });

  it("throws an error when period status is CLOSED with month/year object", async () => {
    mockFindUnique.mockResolvedValue({
      id: "p-2",
      month: 9,
      year: 2026,
      status: "CLOSED",
    });

    await expect(assertPeriodOpen({ month: 9, year: 2026 })).rejects.toThrow(
      "Kỳ lương tháng 9/2026 đã chốt. Vui lòng mở lại kỳ lương để chỉnh sửa."
    );
  });

  it("throws an error when period status is CLOSED with Date object (Vietnam timezone)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "p-3",
      month: 8,
      year: 2026,
      status: "CLOSED",
    });

    // 2026-08-15 10:00:00 UTC -> Month 8, 2026 in Vietnam
    const date = new Date(Date.UTC(2026, 7, 15, 10, 0, 0));

    await expect(assertPeriodOpen(date)).rejects.toThrow(
      "Kỳ lương tháng 8/2026 đã chốt. Vui lòng mở lại kỳ lương để chỉnh sửa."
    );
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { month_year: { month: 8, year: 2026 } },
    });
  });
});
