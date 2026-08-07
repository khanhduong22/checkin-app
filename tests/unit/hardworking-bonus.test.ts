import { describe, it, expect } from "vitest";
import { applyHardworkingBonus } from "@/lib/payroll";

describe("applyHardworkingBonus() Helper Logic", () => {
  const month = 8;
  const year = 2026;

  it("does not award bonus if Top 1 has less than 130 hours", () => {
    const payrollList = [
      {
        id: "user-1",
        name: "Uyên",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 129.0,
        totalSalary: 2580000,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-2",
        name: "Hương",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 127.2,
        totalSalary: 2544000,
        totalAdjustments: 0,
        adjustments: [],
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, false);

    expect(result[0].totalSalary).toBe(2580000);
    expect(result[0].totalAdjustments).toBe(0);
    expect(result[0].adjustments).toHaveLength(0);
  });

  it("awards 200k bonus to Top 1 with at least 130 hours", () => {
    const payrollList = [
      {
        id: "user-1",
        name: "Uyên",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 131.0,
        totalSalary: 2620000,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-2",
        name: "Hương",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 127.2,
        totalSalary: 2544000,
        totalAdjustments: 0,
        adjustments: [],
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, false);

    // Uyên (user-1) is Top 1 with 131 hours (>= 130) -> gets 200k bonus
    expect(result[0].totalSalary).toBe(2820000); // 2620000 + 200000
    expect(result[0].totalAdjustments).toBe(200000);
    expect(result[0].adjustments).toHaveLength(1);
    expect(result[0].adjustments[0].reason).toBe("Thưởng Top 1 Chăm Chỉ (Làm tối thiểu 130h)");
    expect(result[0].adjustments[0].amount).toBe(200000);

    // Hương (user-2) is not Top 1 -> no bonus
    expect(result[1].totalSalary).toBe(2544000);
    expect(result[1].totalAdjustments).toBe(0);
  });

  it("supports nested stats shape and awards bonus accordingly", () => {
    const payrollList = [
      {
        id: "user-1",
        name: "Uyên",
        role: "USER",
        stats: {
          employmentType: "PART_TIME",
          totalHours: 135.0,
          totalSalary: 2700000,
          totalAdjustments: 0,
          adjustments: [],
        },
      },
      {
        id: "user-2",
        name: "Hương",
        role: "USER",
        stats: {
          employmentType: "PART_TIME",
          totalHours: 127.2,
          totalSalary: 2544000,
          totalAdjustments: 0,
          adjustments: [],
        },
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, true);

    expect(result[0].stats.totalSalary).toBe(2900000);
    expect(result[0].stats.totalAdjustments).toBe(200000);
    expect(result[0].stats.adjustments).toHaveLength(1);
    expect(result[0].stats.adjustments[0].reason).toBe("Thưởng Top 1 Chăm Chỉ (Làm tối thiểu 130h)");
  });

  it("awards 200k bonus to both if there is a tie for Top 1 >= 130 hours", () => {
    const payrollList = [
      {
        id: "user-1",
        name: "Uyên",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 130.0,
        totalSalary: 2600000,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-2",
        name: "Hương",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 130.0,
        totalSalary: 2600000,
        totalAdjustments: 0,
        adjustments: [],
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, false);

    expect(result[0].totalSalary).toBe(2800000);
    expect(result[0].totalAdjustments).toBe(200000);
    expect(result[1].totalSalary).toBe(2800000);
    expect(result[1].totalAdjustments).toBe(200000);
  });

  it("excludes FULL_TIME employees from hardworking bonus calculation", () => {
    const payrollList = [
      {
        id: "user-1",
        name: "Uyên",
        role: "USER",
        employmentType: "FULL_TIME",
        totalHours: 150.0,
        totalSalary: 6000000,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-2",
        name: "Hương",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 131.0,
        totalSalary: 2620000,
        totalAdjustments: 0,
        adjustments: [],
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, false);

    // Uyên (user-1) is FULL_TIME -> excluded
    expect(result[0].totalSalary).toBe(6000000);
    expect(result[0].totalAdjustments).toBe(0);

    // Hương (user-2) is Top 1 PART_TIME with 131h -> gets 200k bonus
    expect(result[1].totalSalary).toBe(2820000);
    expect(result[1].totalAdjustments).toBe(200000);
  });

  it("excludes ADMIN users and resigned employees (excludedNames)", () => {
    const payrollList = [
      {
        id: "user-admin",
        name: "Admin User",
        role: "ADMIN",
        employmentType: "PART_TIME",
        totalHours: 160.0,
        totalSalary: 0,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-resigned",
        name: "Na",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 140.0,
        totalSalary: 2800000,
        totalAdjustments: 0,
        adjustments: [],
      },
      {
        id: "user-active",
        name: "Hương",
        role: "USER",
        employmentType: "PART_TIME",
        totalHours: 131.0,
        totalSalary: 2620000,
        totalAdjustments: 0,
        adjustments: [],
      },
    ];

    const result = applyHardworkingBonus(payrollList, month, year, false);

    // Admin is excluded
    expect(result[0].totalSalary).toBe(0);
    expect(result[0].totalAdjustments).toBe(0);

    // Na (resigned) is excluded in August 2026
    expect(result[1].totalSalary).toBe(2800000);
    expect(result[1].totalAdjustments).toBe(0);

    // Hương (active top part-time) gets the 200k bonus
    expect(result[2].totalSalary).toBe(2820000);
    expect(result[2].totalAdjustments).toBe(200000);
  });
});
