import { prisma } from "@/lib/prisma";

export interface SpecialEvent {
  id: string;
  userId?: string;
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'HOLIDAY';
  date: number;
  month: number;
  name: string;
  title: string;
  image?: string | null;
  details?: string;
  isToday: boolean;
}

export async function getSpecialDayUsers(): Promise<SpecialEvent[]> {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentMonthNum = currentMonth + 1;
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();

  // 1. Fetch Users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { birthday: { not: null } },
        { startDate: { not: null } }
      ]
    },
    select: {
      id: true,
      name: true,
      image: true,
      birthday: true,
      startDate: true
    }
  });

  // 2. Fetch Holidays for this month
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });

  const specialEvents: SpecialEvent[] = [];

  // Process Users
  users.forEach(user => {
    // Birthday
    if (user.birthday) {
      const b = new Date(user.birthday);
      if (b.getMonth() === currentMonth) {
        specialEvents.push({
          id: `${user.id}-birthday`,
          userId: user.id,
          type: 'BIRTHDAY',
          date: b.getDate(),
          month: currentMonthNum,
          name: user.name || 'Unknown',
          title: 'Sinh nhật',
          image: user.image,
          isToday: b.getDate() === currentDay
        });
      }
    }

    // Anniversary
    if (user.startDate) {
      const s = new Date(user.startDate);
      if (s.getMonth() === currentMonth && currentYear > s.getFullYear()) {
        const yearsWorked = currentYear - s.getFullYear();
        specialEvents.push({
          id: `${user.id}-anniversary`,
          userId: user.id,
          type: 'ANNIVERSARY',
          date: s.getDate(),
          month: currentMonthNum,
          name: user.name || 'Unknown',
          title: 'Kỷ niệm công việc',
          image: user.image,
          details: `${yearsWorked} năm`,
          isToday: s.getDate() === currentDay
        });
      }
    }
  });

  // Process Holidays
  holidays.forEach(h => {
    const hDate = new Date(h.date);
    specialEvents.push({
      id: `holiday-${h.id}`,
      type: 'HOLIDAY',
      date: hDate.getDate(),
      month: currentMonthNum,
      name: h.name,
      title: h.name,
      image: null,
      isToday: hDate.getDate() === currentDay
    });
  });

  // Sort
  return specialEvents.sort((a, b) => a.date - b.date);
}
