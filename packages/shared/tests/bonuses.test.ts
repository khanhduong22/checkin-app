import { describe, it, expect } from "vitest";
import {
  applyHardworkingBonus,
  isBirthdayToday,
  calculateCarryingBonus,
  calculatePackingBonus,
} from "../src/rules/bonuses";

describe("bonuses rules", () => {
  describe("applyHardworkingBonus()", () => {
    it("grants +200k to top 1 Part-Time employee with >= 130 hours", () => {
      const payrollList = [
        {
          id: "u1",
          name: "Linh",
          role: "USER",
          employmentType: "PART_TIME",
          totalHours: 135,
          totalSalary: 3000000,
          adjustments: [],
        },
        {
          id: "u2",
          name: "An",
          role: "USER",
          employmentType: "PART_TIME",
          totalHours: 110,
          totalSalary: 2500000,
          adjustments: [],
        },
      ];

      const result = applyHardworkingBonus(payrollList, 5, 2026);
      expect(result[0].totalSalary).toBe(3200000);
      expect(result[0].adjustments).toHaveLength(1);
      expect(result[0].adjustments[0].amount).toBe(200000);
      expect(result[1].totalSalary).toBe(2500000);
    });

    it("does not grant bonus if top hours < 130", () => {
      const payrollList = [
        {
          id: "u1",
          name: "Linh",
          role: "USER",
          employmentType: "PART_TIME",
          totalHours: 125,
          totalSalary: 3000000,
          adjustments: [],
        },
      ];

      const result = applyHardworkingBonus(payrollList, 5, 2026);
      expect(result[0].totalSalary).toBe(3000000);
      expect(result[0].adjustments).toHaveLength(0);
    });

    it("excludes FULL_TIME and ADMIN users", () => {
      const payrollList = [
        {
          id: "admin1",
          name: "Boss",
          role: "ADMIN",
          employmentType: "PART_TIME",
          totalHours: 160,
          totalSalary: 10000000,
          adjustments: [],
        },
        {
          id: "ft1",
          name: "Huong",
          role: "USER",
          employmentType: "FULL_TIME",
          totalHours: 150,
          totalSalary: 7000000,
          adjustments: [],
        },
        {
          id: "pt1",
          name: "Thuy",
          role: "USER",
          employmentType: "PART_TIME",
          totalHours: 132,
          totalSalary: 3000000,
          adjustments: [],
        },
      ];

      const result = applyHardworkingBonus(payrollList, 5, 2026);
      expect(result[0].totalSalary).toBe(10000000); // Admin skipped
      expect(result[1].totalSalary).toBe(7000000); // Full-time skipped
      expect(result[2].totalSalary).toBe(3200000); // Eligible PT awarded
    });

    it("is idempotent: does not double bonus if run twice", () => {
      const payrollList = [
        {
          id: "u1",
          name: "Linh",
          role: "USER",
          employmentType: "PART_TIME",
          totalHours: 140,
          totalSalary: 3000000,
          adjustments: [],
        },
      ];

      applyHardworkingBonus(payrollList, 5, 2026);
      applyHardworkingBonus(payrollList, 5, 2026);

      expect(payrollList[0].totalSalary).toBe(3200000);
      expect(payrollList[0].adjustments).toHaveLength(1);
    });
  });

  describe("isBirthdayToday()", () => {
    it("returns true when birthday UTC date matches VN today", () => {
      // Vietnam date: May 15
      const nowVN = new Date("2026-05-15T02:00:00Z"); // 09:00 VN time
      const birthday = new Date("1995-05-15T00:00:00Z");
      expect(isBirthdayToday(birthday, nowVN)).toBe(true);
    });

    it("returns false when birthday does not match", () => {
      const nowVN = new Date("2026-05-15T02:00:00Z");
      const birthday = new Date("1995-05-16T00:00:00Z");
      expect(isBirthdayToday(birthday, nowVN)).toBe(false);
    });
  });

  describe("calculateCarryingBonus()", () => {
    it("returns null if top score is less than 10 points", () => {
      const tasks = [
        { userId: "u1", finalAmount: 5 },
        { userId: "u2", finalAmount: 4 },
      ];
      expect(calculateCarryingBonus(tasks, 4, 2026)).toBeNull();
    });

    it("awards 100k if top score is between 10 and 50 points", () => {
      const tasks = [
        { userId: "u1", finalAmount: 20 },
        { userId: "u2", finalAmount: 15 },
      ];
      const res = calculateCarryingBonus(tasks, 4, 2026);
      expect(res).not.toBeNull();
      expect(res?.baseAmount).toBe(100000);
      expect(res?.tiedUsers).toEqual(["u1"]);
      expect(res?.splitAmount).toBe(100000);
    });

    it("awards 200k if top score > 50 points", () => {
      const tasks = [
        { userId: "u1", finalAmount: 60 },
        { userId: "u2", finalAmount: 10 },
      ];
      const res = calculateCarryingBonus(tasks, 4, 2026);
      expect(res?.baseAmount).toBe(200000);
      expect(res?.splitAmount).toBe(200000);
    });

    it("splits evenly if multiple users tie for top score", () => {
      const tasks = [
        { userId: "u1", finalAmount: 60 },
        { userId: "u2", finalAmount: 60 },
      ];
      const res = calculateCarryingBonus(tasks, 4, 2026);
      expect(res?.tiedUsers).toHaveLength(2);
      expect(res?.splitAmount).toBe(100000);
    });
  });

  describe("calculatePackingBonus()", () => {
    it("returns null if top score is 0", () => {
      const tasks = [{ userId: "u1", finalAmount: 0 }];
      expect(calculatePackingBonus(tasks, 4, 2026)).toBeNull();
    });

    it("awards 100k if top score <= 50 points", () => {
      const tasks = [{ userId: "u1", finalAmount: 30 }];
      const res = calculatePackingBonus(tasks, 4, 2026);
      expect(res?.splitAmount).toBe(100000);
    });

    it("awards 200k if top score > 50 points", () => {
      const tasks = [{ userId: "u1", finalAmount: 55 }];
      const res = calculatePackingBonus(tasks, 4, 2026);
      expect(res?.splitAmount).toBe(200000);
    });
  });
});
