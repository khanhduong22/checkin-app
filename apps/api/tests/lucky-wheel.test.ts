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
      updateMany: vi.fn((...args: any[]) => {
        mockLuckyWheelPrizeUpdate(...args);
        return Promise.resolve({ count: 1 });
      }),
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
    $transaction: vi.fn(async (cb) =>
      cb({
        user: { findUnique: mockUserFindUnique },
        luckyWheelPrize: {
          findMany: mockLuckyWheelPrizeFindMany,
          update: mockLuckyWheelPrizeUpdate,
          updateMany: vi.fn((...args: any[]) => {
            mockLuckyWheelPrizeUpdate(...args);
            return Promise.resolve({ count: 1 });
          }),
        },
        checkIn: { findFirst: mockCheckInFindFirst },
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
      })
    ),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";
import { _resetLocks } from "../src/lib/lock";
import { _resetRateLimits } from "../src/middleware/rate-limiter";

describe("Lucky Wheel Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    _resetLocks();
    _resetRateLimits();
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
        headers: { Cookie: `access_token=${userToken}` },
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
        headers: { Cookie: `access_token=${userToken}` },
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
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.prize.name).toBe("Voucher 100k");
      expect(mockLuckyWheelPrizeUpdate).toHaveBeenCalled();
    });

    it("rejects spin immediately if user already spun today with ALREADY_SPUN", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
        achievements: [],
      });
      mockCheckInFindFirst.mockResolvedValue({ id: 10 });
      mockLuckyWheelHistoryFindFirst.mockResolvedValue({
        id: "hist-1",
        userId: "u-wheel-1",
        createdAt: new Date(),
      });

      const res = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("ALREADY_SPUN");
    });

    it("rejects concurrent double-spin attempts from the same user with SPIN_IN_PROGRESS", async () => {
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
          name: "Voucher 50k",
          type: "MONEY",
          value: 50000,
          remaining: 5,
          probability: 1.0,
          active: true,
        },
      ]);
      mockLuckyWheelPrizeUpdate.mockResolvedValue({});
      mockLuckyWheelHistoryCreate.mockResolvedValue({});
      mockPayrollAdjustmentCreate.mockResolvedValue({});

      // Simulate a slow first transaction so concurrent request hits while lock is held
      let finishFirstTx: () => void = () => {};
      const txDelay = new Promise<void>((resolve) => {
        finishFirstTx = resolve;
      });

      const origUserFindUnique = mockUserFindUnique.getMockImplementation();
      let firstCall = true;
      mockUserFindUnique.mockImplementation(async (...args: any[]) => {
        if (firstCall) {
          firstCall = false;
          await txDelay;
        }
        return origUserFindUnique ? origUserFindUnique(...args) : {
          id: "u-wheel-1",
          role: "USER",
          luckyWheelAllowed: true,
          achievements: [],
        };
      });

      // Launch first spin (which holds lock until finishFirstTx is called)
      const promise1 = app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      // Small tick to ensure promise1 has acquired lock
      await new Promise((r) => setTimeout(r, 20));

      // Launch second concurrent spin from same user
      const promise2 = app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      const res2 = await promise2;
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.success).toBe(false);
      expect(data2.error).toBe("SPIN_IN_PROGRESS");

      // Release first tx
      finishFirstTx();
      const res1 = await promise1;
      expect(res1.status).toBe(200);
    });

    it("rejects spin when prize remaining is 0 (database safety check)", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
        achievements: [],
      });
      mockCheckInFindFirst.mockResolvedValue({ id: 10 });
      mockLuckyWheelHistoryFindFirst.mockResolvedValue(null);
      mockLuckyWheelPrizeFindMany.mockResolvedValue([]);

      const res = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("Kho quà đã hết sạch rồi!");
    });

    it("releases lock in finally block allowing subsequent spin attempts", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-wheel-1",
        role: "USER",
        luckyWheelAllowed: true,
        achievements: [],
      });
      mockCheckInFindFirst.mockResolvedValue(null); // will fail with NOT_CHECKED_IN

      const res1 = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });
      expect(res1.status).toBe(400);

      // Now user checks in
      mockCheckInFindFirst.mockResolvedValue({ id: 10 });
      mockLuckyWheelHistoryFindFirst.mockResolvedValue(null);
      mockLuckyWheelPrizeFindMany.mockResolvedValue([
        { id: "p-1", name: "Gift", type: "PHYSICAL", remaining: 1, probability: 1, active: true },
      ]);
      mockLuckyWheelPrizeUpdate.mockResolvedValue({});
      mockLuckyWheelHistoryCreate.mockResolvedValue({});

      // Second attempt should be able to acquire lock immediately (not locked out)
      const res2 = await app.request("/api/lucky-wheel/spin", {
        method: "POST",
        headers: { Cookie: `access_token=${userToken}` },
      });
      expect(res2.status).toBe(200);
    });
  });
});
