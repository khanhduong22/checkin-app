import { describe, it, expect } from "vitest";
import { normalizeIP, isIPMatch } from "@/lib/ip-utils";

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
    // Stored prefix has ::ffff: — should still match plain IPv4
    expect(isIPMatch("192.168.1.100", ["::ffff:192.168.1.100"])).toBe(true);
  });

  it("returns false when normalized client does not match normalized prefix", () => {
    expect(isIPMatch("::ffff:10.0.0.1", ["192.168.1"])).toBe(false);
  });

  it("normalizes ::ffff: client IP and matches prefix", () => {
    expect(isIPMatch("::ffff:192.168.1.100", ["192.168.1"])).toBe(true);
  });
});
