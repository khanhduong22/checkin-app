/**
 * Late penalty & attendance timing rules.
 */

export const GRACE_PERIOD_MINUTES = 1;

/**
 * Calculate late penalty hours:
 * - 1st–3rd late: no penalty (0 hours)
 * - 4th late: -1h, 5th: -2h, 6th: -3h, ... nth: -(n-3) hours
 */
export function calculateLatePenalty(lateCount: number): number {
  if (lateCount < 4) return 0;
  return lateCount - 3;
}

/**
 * Check if actual check-in time is later than scheduled time plus grace period.
 * @param actual Date or decimal hour (e.g. 8.5 for 8:30)
 * @param scheduled Date or decimal hour
 * @param graceMinutes Default GRACE_PERIOD_MINUTES (1 min)
 */
export function isLate(
  actual: Date | number,
  scheduled: Date | number,
  graceMinutes: number = GRACE_PERIOD_MINUTES
): boolean {
  const actualTime =
    typeof actual === "number"
      ? actual
      : actual.getHours() + actual.getMinutes() / 60;
  const scheduledTime =
    typeof scheduled === "number"
      ? scheduled
      : scheduled.getHours() + scheduled.getMinutes() / 60;

  return actualTime > scheduledTime + graceMinutes / 60;
}

/**
 * Check if actual check-out time is earlier than scheduled time minus grace period.
 */
export function isEarlyLeave(
  actual: Date | number,
  scheduled: Date | number,
  graceMinutes: number = GRACE_PERIOD_MINUTES
): boolean {
  const actualTime =
    typeof actual === "number"
      ? actual
      : actual.getHours() + actual.getMinutes() / 60;
  const scheduledTime =
    typeof scheduled === "number"
      ? scheduled
      : scheduled.getHours() + scheduled.getMinutes() / 60;

  return actualTime < scheduledTime - graceMinutes / 60;
}

export interface TimeStatusResult {
  label: string;
  color: string;
}

/**
 * Check time status against standard office working hours (8:30 in, 17:30 out).
 */
export function checkTimeStatus(
  date: Date,
  type: "checkin" | "checkout"
): TimeStatusResult | null {
  if (type === "checkin") {
    if (isLate(date, 8.5)) {
      return {
        label: "Đi muộn",
        color: "bg-red-100 text-red-700 border-red-200",
      };
    }
  }

  if (type === "checkout") {
    if (isEarlyLeave(date, 17.5)) {
      return {
        label: "Về sớm",
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    }
  }

  return null;
}
