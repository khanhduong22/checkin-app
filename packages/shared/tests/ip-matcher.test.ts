import { describe, it, expect } from "vitest";
import {
  normalizeIP,
  expandIPv6,
  matchCIDR,
  isIPMatch,
} from "../src/rules/ip-matcher";

describe("ip-matcher utilities", () => {
  describe("normalizeIP()", () => {
    it("strips ::ffff: prefix from IPv4-mapped IPv6", () => {
      expect(normalizeIP("::ffff:192.168.1.1")).toBe("192.168.1.1");
    });

    it("returns clean trimmed IP", () => {
      expect(normalizeIP("  10.0.0.1  ")).toBe("10.0.0.1");
    });
  });

  describe("expandIPv6()", () => {
    it("expands standard shortened IPv6 ::1 to 8 segments", () => {
      expect(expandIPv6("::1")).toBe("0000:0000:0000:0000:0000:0000:0000:0001");
    });

    it("expands 2001:db8:: to 8 segments", () => {
      expect(expandIPv6("2001:db8::")).toBe(
        "2001:0db8:0000:0000:0000:0000:0000:0000"
      );
    });

    it("returns null for invalid IPv6", () => {
      expect(expandIPv6("192.168.1.1")).toBeNull();
      expect(expandIPv6("not-an-ip")).toBeNull();
    });
  });

  describe("matchCIDR()", () => {
    it("matches IPv4 within CIDR subnet", () => {
      expect(matchCIDR("192.168.1.50", "192.168.1.0/24")).toBe(true);
      expect(matchCIDR("192.168.2.1", "192.168.1.0/24")).toBe(false);
    });

    it("matches IPv6 within /64 subnet", () => {
      expect(
        matchCIDR("2001:db8:abcd:0012:0000:0000:0000:0001", "2001:db8:abcd:12::/64")
      ).toBe(true);
      expect(
        matchCIDR("2001:db8:abcd:0013:0000:0000:0000:0001", "2001:db8:abcd:12::/64")
      ).toBe(false);
    });
  });

  describe("isIPMatch()", () => {
    it("matches exact IPv4", () => {
      expect(isIPMatch("192.168.1.10", ["192.168.1.10"])).toBe(true);
      expect(isIPMatch("192.168.1.11", ["192.168.1.10"])).toBe(false);
    });

    it("matches IPv4 CIDR", () => {
      expect(isIPMatch("10.0.0.45", ["10.0.0.0/24"])).toBe(true);
      expect(isIPMatch("10.0.1.45", ["10.0.0.0/24"])).toBe(false);
    });

    it("matches IPv6 /64 prefix automatically", () => {
      const client = "2402:800:6370:d33e:80c8:2738:397d:9146";
      const allowed = "2402:800:6370:d33e:1111:2222:3333:4444";
      expect(isIPMatch(client, [allowed])).toBe(true);
    });
  });
});
