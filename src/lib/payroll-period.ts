import { prisma } from "@/lib/prisma";

export type DateOrPeriodMonth = Date | { month: number; year: number };

/**
 * Asserts that the payroll period for the given date or month/year is open.
 * Throws an Error if the period is CLOSED.
 */
export async function assertPeriodOpen(
  dateOrMonth: DateOrPeriodMonth
): Promise<void> {
  let month: number;
  let year: number;

  if (dateOrMonth instanceof Date) {
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const vnDate = new Date(dateOrMonth.getTime() + VN_OFFSET_MS);
    month = vnDate.getUTCMonth() + 1;
    year = vnDate.getUTCFullYear();
  } else {
    month = dateOrMonth.month;
    year = dateOrMonth.year;
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
