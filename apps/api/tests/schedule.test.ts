import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWorkShiftFindMany } = vi.hoisted(() => ({
  mockWorkShiftFindMany: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    workShift: {
      findMany: mockWorkShiftFindMany,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Schedule Routes", () => {
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    userToken = await signAccessToken({
      sub: "u-sched-1",
      email: "sched@example.com",
      role: "USER",
    });
  });

  describe("GET /api/schedule/my-shifts", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/schedule/my-shifts");
      expect(res.status).toBe(401);
    });

    it("returns user shifts with duties for given month", async () => {
      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 1,
          userId: "u-sched-1",
          start: new Date("2026-10-05T08:00:00Z"),
          end: new Date("2026-10-05T17:00:00Z"),
          duties: [
            {
              id: "duty-1",
              title: "Dọn dẹp quầy",
              isCompleted: true,
            },
          ],
        },
      ]);

      const res = await app.request("/api/schedule/my-shifts?month=10&year=2026", {
        headers: { Cookie: `access_token=${userToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].duties).toHaveLength(1);
    });
  });
});
