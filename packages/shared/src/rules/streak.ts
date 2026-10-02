import { isLate } from "./late-penalty";

export interface CheckinInput {
  timestamp: Date | string;
  type?: string;
  userId?: string;
}

export interface LeaveInput {
  date: Date | string;
  status?: string;
  type?: string;
  userId?: string;
}

const isSameDate = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/**
 * Calculates attendance streak (consecutive on-time workdays + approved leave days).
 * Zero-framework / DB-independent pure function.
 *
 * @param checkins List of checkin events for the user
 * @param leaves List of approved leave requests for the user
 * @param today Reference date (defaults to new Date())
 */
export function calculateStreak(
  checkins: CheckinInput[],
  leaves: LeaveInput[] = [],
  today: Date = new Date()
): number {
  const parsedCheckins = checkins.map((c) => ({
    ...c,
    dateObj: c.timestamp instanceof Date ? c.timestamp : new Date(c.timestamp),
  }));

  const parsedLeaves = leaves.map((l) => ({
    ...l,
    dateObj: l.date instanceof Date ? l.date : new Date(l.date),
  }));

  let streak = 0;
  let loopDate = new Date(today);

  // Check today's checkin
  const todayCheckin = parsedCheckins.find((c) =>
    isSameDate(c.dateObj, today)
  );

  if (todayCheckin) {
    // 8:30 + 1m buffer
    if (!isLate(todayCheckin.dateObj, 8.5)) {
      streak++;
    } else {
      return 0; // Late today immediately breaks streak
    }
    loopDate.setDate(loopDate.getDate() - 1);
  } else {
    // Check if today is an approved leave
    const todayLeave = parsedLeaves.find(
      (l) => (!l.status || l.status === "APPROVED") && isSameDate(l.dateObj, today)
    );
    if (todayLeave) {
      streak++;
    }
    loopDate.setDate(loopDate.getDate() - 1);
  }

  // Look back up to 30 days
  for (let i = 0; i < 30; i++) {
    const dayOfWeek = loopDate.getDay();
    // Skip weekends (0: Sunday, 6: Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      loopDate.setDate(loopDate.getDate() - 1);
      continue;
    }

    const checkin = parsedCheckins.find((c) =>
      isSameDate(c.dateObj, loopDate)
    );

    if (checkin) {
      if (!isLate(checkin.dateObj, 8.5)) {
        streak++;
      } else {
        break; // Late broke streak
      }
    } else {
      const leave = parsedLeaves.find(
        (l) => (!l.status || l.status === "APPROVED") && isSameDate(l.dateObj, loopDate)
      );
      if (leave) {
        streak++; // Maintain and increment streak on Leave
      } else {
        break; // Missing day broke streak
      }
    }

    loopDate.setDate(loopDate.getDate() - 1);
  }

  return streak;
}
