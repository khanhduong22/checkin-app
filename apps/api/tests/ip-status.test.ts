import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAllowedIPFindMany } = vi.hoisted(() => ({
  mockAllowedIPFindMany: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    allowedIP: {
      findMany: mockAllowedIPFindMany,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";

describe("IP Status Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/ip-status", () => {
    it("returns ip status and locationName when allowed", async () => {
      mockAllowedIPFindMany.mockResolvedValue([
        { id: 1, prefix: "192.168.1.", label: "LimArt Office" },
      ]);

      const res = await app.request("/api/ip-status", {
        headers: {
          "x-forwarded-for": "192.168.1.50",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.ip).toBe("192.168.1.50");
      expect(data.isAllowed).toBe(true);
      expect(data.locationName).toBe("LimArt Office");
    });

    it("returns isAllowed false and 'Ngoài vùng phủ sóng' when not in whitelist", async () => {
      mockAllowedIPFindMany.mockResolvedValue([
        { id: 1, prefix: "192.168.1.", label: "LimArt Office" },
      ]);

      const res = await app.request("/api/ip-status", {
        headers: {
          "x-forwarded-for": "10.0.0.1",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.ip).toBe("10.0.0.1");
      expect(data.isAllowed).toBe(false);
      expect(data.locationName).toBe("Ngoài vùng phủ sóng");
    });
  });
});
