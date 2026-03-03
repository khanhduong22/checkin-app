import { describe, it, expect } from "vitest";
import { calculateLatePenalty } from "@/lib/stats";

describe("calculateLatePenalty()", () => {
  it("returns 0 when lateCount is 0", () => {
    expect(calculateLatePenalty(0)).toBe(0);
  });

  it("returns 0 when lateCount is 1", () => {
    expect(calculateLatePenalty(1)).toBe(0);
  });

  it("returns 0 when lateCount is 2", () => {
    expect(calculateLatePenalty(2)).toBe(0);
  });

  it("returns 0 when lateCount is 3 (last free)", () => {
    expect(calculateLatePenalty(3)).toBe(0);
  });

  it("returns 1 hour penalty when lateCount is 4 (first penalty)", () => {
    expect(calculateLatePenalty(4)).toBe(1);
  });

  it("returns 2 hours penalty when lateCount is 5", () => {
    expect(calculateLatePenalty(5)).toBe(2);
  });

  it("returns 3 hours penalty when lateCount is 6", () => {
    expect(calculateLatePenalty(6)).toBe(3);
  });

  it("returns 7 hours penalty when lateCount is 10", () => {
    expect(calculateLatePenalty(10)).toBe(7);
  });

  it("returns n-3 hours for any n >= 4", () => {
    for (let n = 4; n <= 15; n++) {
      expect(calculateLatePenalty(n)).toBe(n - 3);
    }
  });
});
