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
export function toVNDateString(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const vnTime = new Date(d.getTime() + VN_OFFSET_MS);
  const year = vnTime.getUTCFullYear();
  const month = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vnTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns Monday 00:00:00 and Sunday 23:59:59.999 in Vietnam timezone for a given date.
 */
export function getWeekBounds(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const vnNow = new Date(date.getTime() + VN_OFFSET_MS);
  const currentDay = vnNow.getUTCDay(); // 0 = Sun, 1 = Mon... 6 = Sat
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const weekStartLocal = new Date(vnNow);
  weekStartLocal.setUTCDate(vnNow.getUTCDate() + diffToMonday);
  weekStartLocal.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(weekStartLocal.getTime() - VN_OFFSET_MS);

  const weekEndLocal = new Date(weekStartLocal);
  weekEndLocal.setUTCDate(weekStartLocal.getUTCDate() + 6);
  weekEndLocal.setUTCHours(23, 59, 59, 999);
  const weekEnd = new Date(weekEndLocal.getTime() - VN_OFFSET_MS);

  return { weekStart, weekEnd };
}

/**
 * Returns week bounds for an ISO week number and year in Vietnam timezone.
 */
export function getWeekBoundsFromWeekAndYear(week: number, year: number): { weekStart: Date; weekEnd: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monWeek1 = new Date(jan4.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
  const weekMon = new Date(monWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);

  return getWeekBounds(weekMon);
}

