import { describe, it, expect } from "vitest";
import { normalizeIP, isIPMatch, expandIPv6, matchCIDR } from "@/lib/ip-utils";

describe("normalizeIP()", () => {
  it("returns empty string for empty input", () => {
    expect(normalizeIP("")).toBe("");
  });

  it("strips ::ffff: prefix from IPv4-mapped IPv6", () => {
    expect(normalizeIP("::ffff:192.168.1.1")).toBe("192.168.1.1");
  });

  it("strips ::ffff: prefix with different IP", () => {
    expect(normalizeIP("::ffff:10.0.0.1")).toBe("10.0.0.1");
  });

  it("returns plain IPv4 unchanged", () => {
    expect(normalizeIP("192.168.1.100")).toBe("192.168.1.100");
  });

  it("returns pure IPv6 (::1) unchanged — does not strip", () => {
    expect(normalizeIP("::1")).toBe("::1");
  });

  it("returns 127.0.0.1 unchanged", () => {
    expect(normalizeIP("127.0.0.1")).toBe("127.0.0.1");
  });
});

describe("expandIPv6()", () => {
  it("returns null for non-IPv6 addresses", () => {
    expect(expandIPv6("192.168.1.1")).toBeNull();
    expect(expandIPv6("")).toBeNull();
  });

  it("returns expanded representation of fully expanded address", () => {
    expect(expandIPv6("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
  });

  it("expands compressed IPv6 addresses", () => {
    expect(expandIPv6("2001:db8::1")).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
  });

  it("expands IPv6 with :: at start", () => {
    expect(expandIPv6("::1")).toBe("0000:0000:0000:0000:0000:0000:0000:0001");
  });

  it("expands IPv6 with :: at end", () => {
    expect(expandIPv6("2001:db8::")).toBe("2001:0db8:0000:0000:0000:0000:0000:0000");
  });

  it("expands simple :: address", () => {
    expect(expandIPv6("::")).toBe("0000:0000:0000:0000:0000:0000:0000:0000");
  });

  it("strips brackets and CIDR mask when expanding", () => {
    expect(expandIPv6("[2001:db8::1]/64")).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
  });

  it("pads shorter addresses that have fewer than 8 segments", () => {
    expect(expandIPv6("2001:ee0:4b74:34c0")).toBe("2001:0ee0:4b74:34c0:0000:0000:0000:0000");
  });

  it("returns null for invalid IPv6 strings", () => {
    expect(expandIPv6("2001:db8:::1")).toBeNull();
    expect(expandIPv6("2001:db8:xyz::1")).toBeNull();
    expect(expandIPv6("2001:db8:00000::1")).toBeNull();
    expect(expandIPv6("1:2:3:4:5:6:7:8:9")).toBeNull();
  });
});

describe("matchCIDR()", () => {
  it("returns false if CIDR does not contain a slash", () => {
    expect(matchCIDR("192.168.1.5", "192.168.1.0")).toBe(false);
  });

  it("returns false if bits parameter is invalid", () => {
    expect(matchCIDR("192.168.1.5", "192.168.1.0/abc")).toBe(false);
  });

  it("matches IPv4 CIDR correctly", () => {
    expect(matchCIDR("192.168.1.5", "192.168.1.0/24")).toBe(true);
    expect(matchCIDR("192.168.1.5", "192.168.1.0/32")).toBe(false);
    expect(matchCIDR("192.168.1.5", "192.168.1.5/32")).toBe(true);
    expect(matchCIDR("192.168.1.5", "0.0.0.0/0")).toBe(true);
    expect(matchCIDR("10.0.0.1", "192.168.1.0/24")).toBe(false);
  });

  it("returns false for invalid IPv4 formatting in CIDR", () => {
    expect(matchCIDR("192.168.1.256", "192.168.1.0/24")).toBe(false);
    expect(matchCIDR("192.168.1.5", "192.168.1.abc/24")).toBe(false);
    expect(matchCIDR("192.168.1.5", "192.168.1.0/35")).toBe(false);
  });

  it("matches IPv6 CIDR correctly", () => {
    expect(matchCIDR("2001:db8::1", "2001:db8::/64")).toBe(true);
    expect(matchCIDR("2001:db8:0:0:0:0:0:1", "2001:db8::/64")).toBe(true);
    expect(matchCIDR("2001:db8:1::1", "2001:db8::/64")).toBe(false);
    expect(matchCIDR("2001:db8::1", "2001:db8::1/128")).toBe(true);
    expect(matchCIDR("2001:db8::2", "2001:db8::1/128")).toBe(false);
  });

  it("returns false for mismatched IP families in CIDR", () => {
    expect(matchCIDR("192.168.1.5", "2001:db8::/64")).toBe(false);
    expect(matchCIDR("2001:db8::1", "192.168.1.0/24")).toBe(false);
  });
});

describe("isIPMatch()", () => {
  it("returns true for exact IP match", () => {
    expect(isIPMatch("192.168.1.100", ["192.168.1.100"])).toBe(true);
  });

  it("returns true when IP starts with allowed prefix", () => {
    expect(isIPMatch("192.168.1.100", ["192.168.1"])).toBe(true);
  });

  it("returns false when IP does not match any prefix", () => {
    expect(isIPMatch("10.0.0.1", ["192.168.1"])).toBe(false);
  });

  it("returns false for empty prefixes list", () => {
    expect(isIPMatch("192.168.1.1", [])).toBe(false);
  });

  it("returns true when one of multiple prefixes matches", () => {
    expect(isIPMatch("10.0.0.5", ["192.168.1", "10.0.0"])).toBe(true);
  });

  it("handles ::ffff: mapped prefix and normalizes it", () => {
    expect(isIPMatch("192.168.1.100", ["::ffff:192.168.1.100"])).toBe(true);
  });

  it("returns false when normalized client does not match normalized prefix", () => {
    expect(isIPMatch("::ffff:10.0.0.1", ["192.168.1"])).toBe(false);
  });

  it("normalizes ::ffff: client IP and matches prefix", () => {
    expect(isIPMatch("::ffff:192.168.1.100", ["192.168.1"])).toBe(true);
  });

  it("matches CIDR prefixes in list", () => {
    expect(isIPMatch("192.168.1.5", ["10.0.0.0/8", "192.168.1.0/24"])).toBe(true);
    expect(isIPMatch("2001:db8::10", ["2001:db8::/64"])).toBe(true);
  });

  it("automatically matches IPv6 addresses in same /64 subnet fallback", () => {
    // Admin whitelisted one full IP from the office network
    const allowed = ["2001:ee0:4b74:34c0:5e02:5ccf:e156:835b"];
    
    // User tries to check in with a different dynamic IPv6 in the same /64 range
    expect(isIPMatch("2001:ee0:4b74:34c0:826c:d7bd:3750:17da", allowed)).toBe(true);
    
    // User tries to check in with a different subnet entirely
    expect(isIPMatch("2001:ee0:4b74:34c1:826c:d7bd:3750:17da", allowed)).toBe(false);
  });

  it("automatically matches IPv6 allowed prefix without :: ending", () => {
    const allowed = ["2001:ee0:4b74:34c0"];
    expect(isIPMatch("2001:ee0:4b74:34c0:826c:d7bd:3750:17da", allowed)).toBe(true);
  });
});

