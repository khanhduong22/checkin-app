import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateVN(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatTimeVN(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDateTimeVN(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--";
  return `${formatDateVN(d)} ${formatTimeVN(d)}`;
}
