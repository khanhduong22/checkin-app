import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockWorkShiftFindMany,
  mockWorkShiftCreate,
  mockWorkShiftFindUnique,
  mockWorkShiftDelete,
  mockCheckInFindMany,
  mockCheckInFindFirst,
  mockAnnouncementFindMany,
  mockRequestFindMany,
  mockRequestCreate,
  mockAllowedIPFindMany,
  mockHolidayFindMany,
  mockPayrollPeriodFindUnique,
  mockShiftDutyFindUnique,
  mockShiftDutyUpdate,
  mockLuckyWheelPrizeFindMany,
  mockLuckyWheelPrizeUpdate,
  mockLuckyWheelHistoryFindFirst,
  mockLuckyWheelHistoryFindMany,
  mockLuckyWheelHistoryCreate,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockWorkShiftFindMany: vi.fn(),
  mockWorkShiftCreate: vi.fn(),
  mockWorkShiftFindUnique: vi.fn(),
  mockWorkShiftDelete: vi.fn(),
  mockCheckInFindMany: vi.fn(),
  mockCheckInFindFirst: vi.fn(),
  mockAnnouncementFindMany: vi.fn(),
  mockRequestFindMany: vi.fn(),
  mockRequestCreate: vi.fn(),
  mockAllowedIPFindMany: vi.fn(),
  mockHolidayFindMany: vi.fn(),
  mockPayrollPeriodFindUnique: vi.fn(),
  mockShiftDutyFindUnique: vi.fn(),
  mockShiftDutyUpdate: vi.fn(),
  mockLuckyWheelPrizeFindMany: vi.fn(),
  mockLuckyWheelPrizeUpdate: vi.fn(),
  mockLuckyWheelHistoryFindFirst: vi.fn(),
  mockLuckyWheelHistoryFindMany: vi.fn(),
  mockLuckyWheelHistoryCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    workShift: {
      findMany: mockWorkShiftFindMany,
      create: mockWorkShiftCreate,
      findUnique: mockWorkShiftFindUnique,
      delete: mockWorkShiftDelete,
    },
    checkIn: {
      findMany: mockCheckInFindMany,
      findFirst: mockCheckInFindFirst,
    },
    announcement: {
      findMany: mockAnnouncementFindMany,
    },
    request: {
      findMany: mockRequestFindMany,
      create: mockRequestCreate,
    },
    allowedIP: {
      findMany: mockAllowedIPFindMany,
    },
    holiday: {
      findMany: mockHolidayFindMany,
    },
    payrollPeriod: {
      findUnique: mockPayrollPeriodFindUnique,
    },
    shiftDuty: {
      findUnique: mockShiftDutyFindUnique,
      update: mockShiftDutyUpdate,
    },
    luckyWheelPrize: {
      findMany: mockLuckyWheelPrizeFindMany,
      update: mockLuckyWheelPrizeUpdate,
    },
    luckyWheelHistory: {
      findFirst: mockLuckyWheelHistoryFindFirst,
      findMany: mockLuckyWheelHistoryFindMany,
      create: mockLuckyWheelHistoryCreate,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Staff Routes", () => {
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    authToken = await signAccessToken({
      sub: "staff-1",
      email: "staff@example.com",
      role: "USER",
    });
  });

  describe("GET /api/staff/home-data", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/staff/home-data");
      expect(res.status).toBe(401);
    });

    it("returns comprehensive aggregate home data when authenticated", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "staff-1",
        name: "Staff One",
        email: "staff@example.com",
        role: "USER",
        isActive: true,
        employmentType: "PART_TIME",
        hourlyRate: 35000,
        monthlySalary: 6000000,
        birthday: new Date("2000-01-15"),
        startDate: new Date("2024-03-01"),
        luckyWheelAllowed: true,
        achievements: [
          { id: "ach-1", code: "LUCKY_STAR", title: "Ngôi sao may mắn" },
        ],
      });

      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 101,
          userId: "staff-1",
          start: new Date().toISOString(),
          end: new Date().toISOString(),
          isSenior: false,
        },
      ]);

      mockCheckInFindMany.mockResolvedValueOnce([
        {
          id: 201,
          userId: "staff-1",
          type: "checkin",
          timestamp: new Date().toISOString(),
        },
      ]); // todayCheckins

      mockAnnouncementFindMany.mockResolvedValue([
        {
          id: "ann-1",
          title: "Cuộc họp sáng",
          content: "Tất cả có mặt lúc 9h",
          type: "INFO",
          active: true,
        },
      ]);

      mockUserFindMany.mockResolvedValue([]); // for specialDays
      mockHolidayFindMany.mockResolvedValue([]); // for specialDays

      mockCheckInFindMany.mockResolvedValueOnce([
        {
          id: 201,
          userId: "staff-1",
          type: "checkin",
          timestamp: new Date(),
        },
      ]); // recentCheckins for streak

      mockRequestFindMany.mockResolvedValue([]); // recentLeaves for streak
      mockAllowedIPFindMany.mockResolvedValue([]); // allowedIP for ipStatus

      const res = await app.request("/api/staff/home-data", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.user.name).toBe("Staff One");
      expect(data.data.user.achievements).toHaveLength(1);
      expect(data.data.todayShifts).toHaveLength(1);
      expect(data.data.todayCheckins).toHaveLength(1);
      expect(data.data.announcements).toHaveLength(1);
      expect(typeof data.data.streak).toBe("number");
      expect(data.data.ipStatus).toBeDefined();
    });
  });

  describe("GET /api/staff/schedule", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/staff/schedule");
      expect(res.status).toBe(401);
    });

    it("returns monthly shifts with currentUserId when authenticated", async () => {
      const mockShifts = [
        {
          id: 1,
          userId: "staff-1",
          start: new Date("2026-10-15T08:30:00Z"),
          end: new Date("2026-10-15T12:00:00Z"),
          shiftType: "MORNING",
          status: "APPROVED",
          user: {
            id: "staff-1",
            name: "Staff One",
            image: null,
            email: "staff@example.com",
          },
        },
      ];
      mockWorkShiftFindMany.mockResolvedValue(mockShifts);

      const res = await app.request("/api/staff/schedule?month=10&year=2026", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.currentUserId).toBe("staff-1");
    });
  });

  describe("POST /api/staff/schedule/register", () => {
    it("returns 400 for invalid payload", async () => {
      const res = await app.request("/api/staff/schedule/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shift: "INVALID" }),
      });
      expect(res.status).toBe(400);
    });

    it("registers shift successfully with correct start/end times", async () => {
      mockWorkShiftCreate.mockResolvedValue({
        id: 105,
        userId: "staff-1",
        start: new Date("2026-10-15T01:30:00.000Z"),
        end: new Date("2026-10-15T05:00:00.000Z"),
        shiftType: "MORNING",
        status: "APPROVED",
        user: { id: "staff-1", name: "Staff One", image: null, email: "staff@example.com" },
      });

      const res = await app.request("/api/staff/schedule/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateStr: "2026-10-15",
          shift: "MORNING",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.shiftType).toBe("MORNING");
      expect(mockWorkShiftCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/staff/schedule/cancel", () => {
    it("returns 404 when shift not found", async () => {
      mockWorkShiftFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/staff/schedule/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shiftId: 999 }),
      });

      expect(res.status).toBe(404);
    });

    it("cancels shift successfully when owned by user", async () => {
      mockWorkShiftFindUnique.mockResolvedValue({
        id: 105,
        userId: "staff-1",
      });
      mockWorkShiftDelete.mockResolvedValue({ id: 105 });

      const res = await app.request("/api/staff/schedule/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shiftId: 105 }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockWorkShiftDelete).toHaveBeenCalledWith({ where: { id: 105 } });
    });
  });

  describe("GET /api/staff/payroll", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/staff/payroll");
      expect(res.status).toBe(401);
    });

    it("returns payroll data with stats and isClosed flag", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "staff-1",
        name: "Staff One",
        employmentType: "PART_TIME",
        hourlyRate: 25000,
        monthlySalary: 6000000,
        adjustments: [],
        payslips: [],
      });
      mockCheckInFindMany.mockResolvedValue([]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockRequestFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);
      mockPayrollPeriodFindUnique.mockResolvedValue({ status: "OPEN" });

      const res = await app.request("/api/staff/payroll?month=10&year=2026", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.stats).toBeDefined();
      expect(json.data.isClosed).toBe(false);
      expect(json.data.month).toBe(10);
      expect(json.data.year).toBe(2026);
    });
  });

  describe("GET /api/staff/history", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/staff/history");
      expect(res.status).toBe(401);
    });

    it("returns user checkin history", async () => {
      mockCheckInFindMany.mockResolvedValue([
        { id: 1, userId: "staff-1", type: "checkin", timestamp: new Date() },
        { id: 2, userId: "staff-1", type: "checkout", timestamp: new Date() },
      ]);

      const res = await app.request("/api/staff/history", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
    });
  });

  describe("GET and POST /api/staff/requests", () => {
    it("GET /api/staff/requests returns user requests", async () => {
      mockRequestFindMany.mockResolvedValue([
        { id: 1, userId: "staff-1", type: "LEAVE", reason: "Nghỉ ốm", status: "PENDING" },
      ]);

      const res = await app.request("/api/staff/requests", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
    });

    it("POST /api/staff/requests returns 400 for missing fields", async () => {
      const res = await app.request("/api/staff/requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "LEAVE" }),
      });

      expect(res.status).toBe(400);
    });

    it("POST /api/staff/requests creates request successfully", async () => {
      mockRequestCreate.mockResolvedValue({
        id: 10,
        userId: "staff-1",
        type: "WFH",
        date: new Date("2026-10-20"),
        reason: "Làm việc tại nhà",
        status: "PENDING",
      });

      const res = await app.request("/api/staff/requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "WFH",
          date: "2026-10-20",
          reason: "Làm việc tại nhà",
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("WFH");
    });
  });
});
