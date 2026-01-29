import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function checkTimeStatus(date: Date, type: 'checkin' | 'checkout') {
  const hour = date.getHours();
  const min = date.getMinutes();
  const timeVal = hour + min / 60;

  // Check-in logic: Late if after 8:30 (8.5)
  if (type === 'checkin') {
    if (timeVal > 8.5) return { label: 'Đi muộn', color: 'bg-red-100 text-red-700 border-red-200' };
  }

  // Check-out logic: Early if before 17:30 (17.5)
  if (type === 'checkout') {
    if (timeVal < 17.5) return { label: 'Về sớm', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  }

  return null;
}
