import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const GRACE_PERIOD_MINUTES = 1;

export function isLate(actual: Date | number, scheduled: Date | number): boolean {
  const actualTime = typeof actual === 'number' ? actual : actual.getHours() + actual.getMinutes() / 60;
  const scheduledTime = typeof scheduled === 'number' ? scheduled : scheduled.getHours() + scheduled.getMinutes() / 60;

  // Late if actual > scheduled + buffer
  return actualTime > scheduledTime + (GRACE_PERIOD_MINUTES / 60);
}

export function isEarlyLeave(actual: Date | number, scheduled: Date | number): boolean {
  const actualTime = typeof actual === 'number' ? actual : actual.getHours() + actual.getMinutes() / 60;
  const scheduledTime = typeof scheduled === 'number' ? scheduled : scheduled.getHours() + scheduled.getMinutes() / 60;

  // Early if actual < scheduled - buffer
  return actualTime < scheduledTime - (GRACE_PERIOD_MINUTES / 60);
}

export function checkTimeStatus(date: Date, type: 'checkin' | 'checkout') {
  // Check-in logic: Standard 8:30 (8.5)
  if (type === 'checkin') {
    if (isLate(date, 8.5)) return { label: 'Đi muộn', color: 'bg-red-100 text-red-700 border-red-200' };
  }

  // Check-out logic: Standard 17:30 (17.5)
  if (type === 'checkout') {
    if (isEarlyLeave(date, 17.5)) return { label: 'Về sớm', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  }

  return null;
}
