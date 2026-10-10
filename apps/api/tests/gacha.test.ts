import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockCheckInFindFirst,
  mockPayrollAdjustmentFindFirst,
  mockLuckyWheelHistoryFindMany,
  mockLuckyWheelPrizeCount,
  mockLuckyWheelPrizeFindMany,
  mockLuckyWheelPrizeUpdate,
  mockLuckyWheelHistoryCreate,
  mockUserAchievementFindUnique,
  mockUserAchievementCreate,
  mockPayrollAdjustmentCreate,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockCheckInFindFirst: vi.fn(),
  mockPayrollAdjustmentFindFirst: vi.fn(),
  mockLuckyWheelHistoryFindMany: vi.fn(),
  mockLuckyWheelPrizeCount: vi.fn(),
  mockLuckyWheelPrizeFindMany: vi.fn(),
  mockLuckyWheelPrizeUpdate: vi.fn(),
  mockLuckyWheelHistoryCreate: vi.fn(),
  mockUserAchievementFindUnique: vi.fn(),
  mockUserAchievementCreate: vi.fn(),
  mockPayrollAdjustmentCreate: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    checkIn: {
      findFirst: mockCheckInFindFirst,
    },
    payrollAdjustment: {
      findFirst: mockPayrollAdjustmentFindFirst,
      create: mockPayrollAdjustmentCreate,
    },
    luckyWheelHistory: {
      findMany: mockLuckyWheelHistoryFindMany,
      create: mockLuckyWheelHistoryCreate,
    },
    luckyWheelPrize: {
      count: mockLuckyWheelPrizeCount,
      findMany: mockLuckyWheelPrizeFindMany,
      update: mockLuckyWheelPrizeUpdate,
      updateMany: vi.fn((...args: any[]) => {
        mockLuckyWheelPrizeUpdate(...args);
        return Promise.resolve({ count: 1 });
      }),
    },
    userAchievement: {
      findUnique: mockUserAchievementFindUnique,
      create: mockUserAchievementCreate,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (cb) =>
      cb({
        user: { findUnique: mockUserFindUnique },
        checkIn: { findFirst: mockCheckInFindFirst },
        payrollAdjustment: {
          findFirst: mockPayrollAdjustmentFindFirst,
          create: mockPayrollAdjustmentCreate,
        },
        luckyWheelPrize: {
          findMany: mockLuckyWheelPrizeFindMany,
          update: mockLuckyWheelPrizeUpdate,
          updateMany: vi.fn((...args: any[]) => {
        mockLuckyWheelPrizeUpdate(...args);
        return Promise.resolve({ count: 1 });
      }),
        },
        luckyWheelHistory: {
          findMany: mockLuckyWheelHistoryFindMany,
          create: mockLuckyWheelHistoryCreate,
        },
        userAchievement: {
          findUnique: mockUserAchievementFindUnique,
          create: mockUserAchievementCreate,
        },
      })
    ),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Gacha Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-gacha-1",
      email: "gacha@example.com",
      role: "USER",
    });
  });

  describe("GET /api/gacha", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/gacha");
      expect(res.status).toBe(401);
    });

    it("returns status for authenticated user", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "u-gacha-1", role: "USER" });
      mockCheckInFindFirst.mockResolvedValue({ id: 1, type: "checkin" });
      mockPayrollAdjustmentFindFirst.mockResolvedValue(null);
      mockLuckyWheelHistoryFindMany.mockResolvedValue([]);
      mockLuckyWheelPrizeCount.mockResolvedValue(5);

      const res = await app.request("/api/gacha", {
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.hasCheckedIn).toBe(true);
      expect(data.hasRolled).toBe(false);
      expect(data.canRoll).toBe(true);
    });
  });

  describe("POST /api/gacha/spin", () => {
    it("rejects spin if user has not checked in today", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "u-gacha-1", role: "USER" });
      mockCheckInFindFirst.mockResolvedValue(null);

      const res = await app.request("/api/gacha/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Chấm công trước");
    });

    it("rejects spin if user already rolled today", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "u-gacha-1", role: "USER" });
      mockCheckInFindFirst.mockResolvedValue({ id: 1 });
      mockPayrollAdjustmentFindFirst.mockResolvedValue({ id: "adj-1", reason: "[Gacha] Quà" });

      const res = await app.request("/api/gacha/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Mỗi ngày 1 lượt");
    });

    it("successfully spins gacha and awards prize", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "u-gacha-1", role: "USER" });
      mockCheckInFindFirst.mockResolvedValue({ id: 1 });
      mockPayrollAdjustmentFindFirst.mockResolvedValue(null);
      mockLuckyWheelPrizeFindMany.mockResolvedValue([
        {
          id: "prize-1",
          name: "Thưởng 50k",
          type: "MONEY",
          value: 50000,
          probability: 1.0,
          remaining: 10,
        },
      ]);
      mockLuckyWheelPrizeUpdate.mockResolvedValue({});
      mockLuckyWheelHistoryCreate.mockResolvedValue({});
      mockPayrollAdjustmentCreate.mockResolvedValue({});

      const res = await app.request("/api/gacha/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.reward.type).toBe("MONEY");
      expect(data.reward.value).toBe(50000);
      expect(mockLuckyWheelPrizeUpdate).toHaveBeenCalled();
      expect(mockPayrollAdjustmentCreate).toHaveBeenCalled();
    });
  });
});
