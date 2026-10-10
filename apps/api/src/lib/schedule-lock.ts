import { VN_OFFSET_MS } from "./date-utils";

/**
 * Converts a date to Vietnam Time (GMT+7).
 */
export function toVietnamTime(date: Date | string | number): Date {
  const d = new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + VN_OFFSET_MS);
}

/**
 * Checks if a shift's start date is locked for editing by regular employees.
 * The schedule for the upcoming week (Monday to Sunday) is locked on Sunday 00:00:00 (GMT+7)
 * of the previous week (1 day before Monday).
 *
 * Example:
 * If shift is on Wednesday, Oct 7, 2026:
 * - Monday of that week is Monday, Oct 5, 2026.
 * - Lock deadline is Sunday, Oct 4, 2026 at 00:00:00 (GMT+7).
 * - If now >= Oct 4, 2026 00:00, the shift is locked.
 */
export function isShiftLocked(
  shiftDate: Date | string | number,
  nowInput?: Date | string | number
): boolean {
  const shiftVN = toVietnamTime(shiftDate);
  const nowVN = toVietnamTime(nowInput ? new Date(nowInput) : new Date());

  const day = shiftVN.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const mondayVN = new Date(shiftVN.getTime());
  mondayVN.setDate(shiftVN.getDate() + diffToMonday);
  mondayVN.setHours(0, 0, 0, 0);

  // Lock deadline is Sunday 00:00:00 of the previous week (1 day before Monday)
  const lockDeadlineVN = new Date(mondayVN.getTime());
  lockDeadlineVN.setDate(mondayVN.getDate() - 1);
  lockDeadlineVN.setHours(0, 0, 0, 0);

  return nowVN.getTime() >= lockDeadlineVN.getTime();
}
