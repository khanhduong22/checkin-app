export const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getVietnamNow(): Date {
  return new Date();
}

/**
 * Returns start and end of day in Vietnam timezone (UTC+7) converted to UTC Dates.
 */
export function getVietnamDayRange(dateInput: Date = new Date()): {
  startOfDay: Date;
  endOfDay: Date;
  dateStr: string;
} {
  const vnTime = new Date(dateInput.getTime() + VN_OFFSET_MS);
  const year = vnTime.getUTCFullYear();
  const month = vnTime.getUTCMonth();
  const day = vnTime.getUTCDate();

  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - VN_OFFSET_MS);
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - VN_OFFSET_MS);
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { startOfDay, endOfDay, dateStr };
}

/**
 * Returns start and end of month in Vietnam timezone (UTC+7) converted to UTC Dates.
 */
export function getVietnamMonthRange(monthInput?: number, yearInput?: number): {
  startDate: Date;
  endDate: Date;
  month: number;
  year: number;
} {
  const now = new Date();
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const year = yearInput ?? vnNow.getUTCFullYear();
  const month = monthInput ?? (vnNow.getUTCMonth() + 1); // 1-indexed

  // 1st of month at 00:00:00 VN time
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - VN_OFFSET_MS);
  // Last day of month at 23:59:59.999 VN time
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - VN_OFFSET_MS);

  return { startDate, endDate, month, year };
}

/**
 * Converts date to YYYY-MM-DD in Vietnam timezone.
 */
export function toVNDateString(date: Date): string {
  const vnTime = new Date(date.getTime() + VN_OFFSET_MS);
  const year = vnTime.getUTCFullYear();
  const month = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
