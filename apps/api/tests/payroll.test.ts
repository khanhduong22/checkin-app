import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockCheckInFindMany,
  mockWorkShiftFindMany,
  mockRequestFindMany,
  mockHolidayFindMany,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockCheckInFindMany: vi.fn(),
  mockWorkShiftFindMany: vi.fn(),
  mockRequestFindMany: vi.fn(),
  mockHolidayFindMany: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    checkIn: {
      findMany: mockCheckInFindMany,
    },
    workShift: {
      findMany: mockWorkShiftFindMany,
    },
    request: {
      findMany: mockRequestFindMany,
    },
    holiday: {
      findMany: mockHolidayFindMany,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Payroll Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-pay-1",
      email: "pay@example.com",
      role: "USER",
    });
  });

  describe("GET /api/payroll/my-summary", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/payroll/my-summary");
      expect(res.status).toBe(401);
    });

    it("returns personal payroll summary when authenticated", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-pay-1",
        name: "Pay User",
        employmentType: "PART_TIME",
        hourlyRate: 30000,
        monthlySalary: 6000000,
        adjustments: [{ id: "adj-1", amount: 100000, reason: "Thưởng", date: new Date() }],
        payslips: [],
      });

      mockCheckInFindMany.mockResolvedValue([
        {
          id: 1,
          userId: "u-pay-1",
          type: "checkin",
          timestamp: new Date("2026-10-02T01:30:00Z"),
        },
        {
          id: 2,
          userId: "u-pay-1",
          type: "checkout",
          timestamp: new Date("2026-10-02T10:30:00Z"),
        },
      ]);

      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 10,
          userId: "u-pay-1",
          start: new Date("2026-10-02T01:30:00Z"),
          end: new Date("2026-10-02T10:30:00Z"),
          isSenior: false,
        },
      ]);

      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      const res = await app.request("/api/payroll/my-summary?month=10&year=2026", {
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe("u-pay-1");
      expect(data.data.totalHours).toBeGreaterThan(0);
      expect(data.data.totalSalary).toBeGreaterThan(0);
    });
  });
});
