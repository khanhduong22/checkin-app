import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindManyShiftDuties } = vi.hoisted(() => ({
  mockFindManyShiftDuties: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    shiftDuty: {
      findMany: mockFindManyShiftDuties,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../src/lib/cache", () => ({
  getOrSetCache: vi.fn().mockImplementation((_key, _ttl, fetcher) => fetcher()),
  checkCacheHealth: vi.fn().mockResolvedValue("connected"),
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Shift Duty Routes", () => {
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    authToken = await signAccessToken({
      sub: "u-staff-1",
      email: "staff@example.com",
      role: "USER",
    });
  });

  describe("GET /api/shift-duties/weekly", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/shift-duties/weekly");
      expect(res.status).toBe(401);
    });

    it("returns weekly shift duties when authenticated", async () => {
      mockFindManyShiftDuties.mockResolvedValue([
        {
          id: "duty-1",
          userId: "u-staff-1",
          date: new Date().toISOString(),
          shift: { name: "Ca Sáng", startHour: 8.5, endHour: 17.5 },
          user: { id: "u-staff-1", name: "Staff 1", email: "staff@example.com" },
        },
      ]);

      const res = await app.request("/api/shift-duties/weekly", {
        headers: { Cookie: `access_token=${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.weekRange).toHaveProperty("start");
      expect(data.weekRange).toHaveProperty("end");
    });
  });
});
