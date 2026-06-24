/**
 * Converts a date to Vietnam Time (GMT+7)
 */
export function toVietnamTime(date: Date | string | number): Date {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}

/**
 * Checks if a shift's start date is locked for editing by normal employees.
 * The schedule for the upcoming week (Monday to Sunday) is locked on Saturday 00:00 of the previous week.
 *
 * Example:
 * If shift is on Wednesday, July 1, 2026.
 * - Monday of that week is Monday, June 29, 2026.
 * - Lock deadline is Saturday, June 27, 2026 at 00:00:00 (GMT+7).
 * - If now >= June 27, 2026 00:00, the shift is locked.
 */
export function isShiftLocked(shiftDate: Date | string | number): boolean {
  const shiftVN = toVietnamTime(shiftDate);
  
  // Get current time in Vietnam timezone
  const nowVN = toVietnamTime(new Date());

  const day = shiftVN.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Find Monday of the shift's week
  // Sunday is 0, Monday is 1, Tuesday is 2, ..., Saturday is 6
  // To get Monday:
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayVN = new Date(shiftVN.getTime());
  mondayVN.setDate(shiftVN.getDate() + diffToMonday);
  mondayVN.setHours(0, 0, 0, 0);
  
  // Lock deadline is Saturday 00:00 of the previous week (2 days before Monday)
  const lockDeadlineVN = new Date(mondayVN.getTime());
  lockDeadlineVN.setDate(mondayVN.getDate() - 2);
  lockDeadlineVN.setHours(0, 0, 0, 0);
  
  return nowVN.getTime() >= lockDeadlineVN.getTime();
}
