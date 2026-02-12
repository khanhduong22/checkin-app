import { prisma } from "@/lib/prisma";
import { isLate } from "@/lib/utils";

export async function calculateStreak(userId: string) {
  // Get all checkins of user, sorted desc
  const checkins = await prisma.checkIn.findMany({
    where: { userId, type: 'checkin' },
    orderBy: { timestamp: 'desc' },
    take: 100 // Look back 100 days max
  });

  let streak = 0;

  // Fetch approved leaves
  const leaves = await prisma.request.findMany({
    where: {
      userId,
      status: 'APPROVED',
      type: 'LEAVE',
      date: { gte: new Date(new Date().setDate(new Date().getDate() - 40)) } // Optimization: fetch last 40 days
    }
  });

  // Helper to check if date matches
  const isSameDate = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Start checking from TODAY or YESTERDAY
  const today = new Date();

  // Check if user checked in today?
  const todayCheckin = checkins.find((c: any) => isSameDate(c.timestamp, today));

  let loopDate = new Date(today);

  if (todayCheckin) {
    // Check if late (8:30 + buffer)
    if (!isLate(todayCheckin.timestamp, 8.5)) {
      streak++; // Today counts!
    } else {
      return 0; // Today late -> Streak died immediately :(
    }
    loopDate.setDate(loopDate.getDate() - 1); // Move to yesterday
  } else {
    // Check if today is a Leave day?
    const todayLeave = leaves.find((l: any) => isSameDate(l.date, today));
    if (todayLeave) {
      streak++;
    }
    // If not leave and not checked in, assume day not started or missed.
    // If it's passed 9am? Logic kept simple: start checking from yesterday.
    loopDate.setDate(loopDate.getDate() - 1);
  }

  // Max lookback 30 days
  for (let i = 0; i < 30; i++) {
    // Skip Weekend (Sat/Sun)
    const dayOfWeek = loopDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      loopDate.setDate(loopDate.getDate() - 1);
      continue;
    }

    // Check DB for this date
    const checkin = checkins.find((c: any) => isSameDate(c.timestamp, loopDate));

    if (checkin) {
      if (!isLate(checkin.timestamp, 8.5)) {
        streak++;
      } else {
        break; // Late! Streak broken.
      }
    } else {
      // Check for Leave
      const leave = leaves.find((l: any) => isSameDate(l.date, loopDate));
      if (leave) {
        streak++; // Maintain and increment streak on Leave
      } else {
        break; // No checkin, No leave -> Broken
      }
    }

    loopDate.setDate(loopDate.getDate() - 1);
  }

  return streak;
}
