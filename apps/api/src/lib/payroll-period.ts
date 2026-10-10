import { prisma } from "@checkin/db";

export type DateOrPeriodMonth = Date | string | { month: number; year: number } | null | undefined;

/**
 * Asserts that the payroll period for the given date or month/year is open.
 * Throws an Error if the period is CLOSED.
 */
export async function assertPeriodOpen(
  dateOrMonth?: DateOrPeriodMonth
): Promise<void> {
  if (!dateOrMonth) return;

  let month: number;
  let year: number;

  if (dateOrMonth instanceof Date || typeof (dateOrMonth as any)?.getTime === "function" || typeof dateOrMonth === "string") {
    const d = new Date(dateOrMonth as any);
    if (isNaN(d.getTime())) return;
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const vnDate = new Date(d.getTime() + VN_OFFSET_MS);
    month = vnDate.getUTCMonth() + 1;
    year = vnDate.getUTCFullYear();
  } else if (
    typeof (dateOrMonth as any)?.month === "number" &&
    typeof (dateOrMonth as any)?.year === "number"
  ) {
    month = (dateOrMonth as any).month;
    year = (dateOrMonth as any).year;
  } else {
    return;
  }

  if (!prisma?.payrollPeriod?.findUnique) {
    return;
  }

  const period = await prisma.payrollPeriod.findUnique({
    where: { month_year: { month, year } },
  });

  if (period && period.status === "CLOSED") {
    throw new Error(
      `Kỳ lương tháng ${month}/${year} đã chốt. Vui lòng mở lại kỳ lương để chỉnh sửa.`
    );
  }
}
