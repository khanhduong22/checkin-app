import { prisma } from "@/lib/prisma";

export async function calculateStreak(userId: string) {
  // Get all checkins of user, sorted desc
  const checkins = await prisma.checkIn.findMany({
    where: { userId, type: 'checkin' },
    orderBy: { timestamp: 'desc' },
    take: 100 // Look back 100 days max
  });

  let streak = 0;

  // Helper to check if date matches
  const isSameDate = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Start checking from TODAY or YESTERDAY
  const today = new Date();
  let currentDate = new Date(today); // Clone
  currentDate.setHours(0, 0, 0, 0);

  // If today has passed 8:30 and no checkin, streak might be broken if not handled, 
  // but usually we calculate completed days. 
  // Let's iterate back day by day.

  // Allow gap of today (if not checked in yet)
  // Check if user checked in today?
  const todayCheckin = checkins.find((c: any) => isSameDate(c.timestamp, today));

  // If checked in today and ON TIME -> streak starts at 1
  // If not checked in today -> start checking from yesterday

  let loopDate = new Date(today);

  // Adjustment: If today is active working day but user hasn't checked in yet, 
  // we don't break streak immediately, we just don't count today.
  // BUT if user Check-in today LATE, streak reset? 
  // Let's simplify: Count CONSECUTIVE ON-TIME CHECK-INS backwards.

  if (todayCheckin) {
    const hour = todayCheckin.timestamp.getHours() + todayCheckin.timestamp.getMinutes() / 60;
    if (hour <= 8.5) {
      streak++; // Today counts!
    } else {
      return 0; // Today late -> Streak died immediately :(
    }
    loopDate.setDate(loopDate.getDate() - 1); // Move to yesterday
  } else {
    // Not checked in today yet.
    // If it's already past working hours? Let's be lenient, maybe they are on leave.
    // Start checking from yesterday.
    loopDate.setDate(loopDate.getDate() - 1);
  }

  // Max lookback 30 days
  for (let i = 0; i < 30; i++) {
    // Skip Weekend (Sat/Sun) - assuming office closed
    // 0 = Sun, 6 = Sat
    const dayOfWeek = loopDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      loopDate.setDate(loopDate.getDate() - 1);
      continue;
    }

    // Check DB for this date
    const checkin = checkins.find((c: any) => isSameDate(c.timestamp, loopDate));

    if (checkin) {
      const hour = checkin.timestamp.getHours() + checkin.timestamp.getMinutes() / 60;
      if (hour <= 8.5) {
        streak++;
      } else {
        break; // Late! Streak broken.
      }
    } else {
      // No check-in this day.
      // Was it a holiday? Or Leave Request?
      // For MVP: If missing checkin on weekday -> Streak Broken.

      // TODO: Check Approved Leave Requests here to maintain streak
      break;
    }

    loopDate.setDate(loopDate.getDate() - 1);
  }

  return streak;
}
