import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockLuckyWheelPrizeFindMany,
  mockCheckInFindFirst,
  mockLuckyWheelHistoryFindFirst,
  mockLuckyWheelHistoryFindMany,
  mockLuckyWheelPrizeUpdate,
  mockLuckyWheelHistoryCreate,
  mockPayrollAdjustmentCreate,
  mockUserAchievementFindUnique,
  mockUserAchievementCreate,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockLuckyWheelPrizeFindMany: vi.fn(),
  mockCheckInFindFirst: vi.fn(),
  mockLuckyWheelHistoryFindFirst: vi.fn(),
  mockLuckyWheelHistoryFindMany: vi.fn(),
  mockLuckyWheelPrizeUpdate: vi.fn(),
  mockLuckyWheelHistoryCreate: vi.fn(),
  mockPayrollAdjustmentCreate: vi.fn(),
  mockUserAchievementFindUnique: vi.fn(),
  mockUserAchievementCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    luckyWheelPrize: {
      findMany: mockLuckyWheelPrizeFindMany,
      update: mockLuckyWheelPrizeUpdate,
    },
    checkIn: {
      findFirst: mockCheckInFindFirst,
    },
    luckyWheelHistory: {
      findFirst: mockLuckyWheelHistoryFindFirst,
      findMany: mockLuckyWheelHistoryFindMany,
      create: mockLuckyWheelHistoryCreate,
    },
    payrollAdjustment: {
      create: mockPayrollAdjustmentCreate,
    },
    userAchievement: {
      findUnique: mockUserAchievementFindUnique,
      create: mockUserAchievementCreate,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Lucky Wheel Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-wheel-1",
      email: "wheel@example.com",
      role: "USER",
    });
  });

  describe("GET /api/lucky-wheel", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/lucky-wheel");
      expect(res.status).toBe(401);
    });

    it("returns lucky wheel status and prizes", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
      });
      mockLuckyWheelPrizeFindMany.mockResolvedValue([
        { id: "p-1", name: "Vé xem phim", remaining: 5, active: true },
      ]);
      mockCheckInFindFirst.mockResolvedValue({ id: 10 });
      mockLuckyWheelHistoryFindFirst.mockResolvedValue(null);
      mockLuckyWheelHistoryFindMany.mockResolvedValue([]);

      const res = await app.request("/api/lucky-wheel", {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.allowed).toBe(true);
      expect(data.hasCheckedInToday).toBe(true);
      expect(data.hasSpunToday).toBe(false);
      expect(data.canSpin).toBe(true);
      expect(data.prizes).toHaveLength(1);
    });
  });

  describe("POST /api/lucky-wheel/spin", () => {
    it("rejects spin if user has not checked in today", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
        achievements: [],
      });
      mockCheckInFindFirst.mockResolvedValue(null);

      const res = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("chưa điểm danh");
    });

    it("spins successfully and awards prize", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
        achievements: [],
      });
      mockCheckInFindFirst.mockResolvedValue({ id: 10 });
      mockLuckyWheelHistoryFindFirst.mockResolvedValue(null);
      mockLuckyWheelPrizeFindMany.mockResolvedValue([
        {
          id: "p-1",
          name: "Voucher 100k",
          type: "MONEY",
          value: 100000,
          remaining: 5,
          probability: 1.0,
          active: true,
        },
      ]);
      mockLuckyWheelPrizeUpdate.mockResolvedValue({});
      mockLuckyWheelHistoryCreate.mockResolvedValue({});
      mockPayrollAdjustmentCreate.mockResolvedValue({});

      const res = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.prize.name).toBe("Voucher 100k");
      expect(mockLuckyWheelPrizeUpdate).toHaveBeenCalled();
    });
  });
});
