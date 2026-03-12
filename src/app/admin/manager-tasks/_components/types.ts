import type { ManagerTask, User } from "@prisma/client";

export type MUser = Pick<User, "id" | "name" | "email" | "image">;

export type MTask = ManagerTask & {
  assignee: MUser | null;
  createdBy: MUser;
  subtasks: (ManagerTask & { assignee: MUser | null })[];
};

export type Quadrant = "q1" | "q2" | "q3" | "q4";

export function getQuadrant(t: { isUrgent: boolean; isImportant: boolean }): Quadrant {
  if (t.isUrgent && t.isImportant) return "q1";
  if (!t.isUrgent && t.isImportant) return "q2";
  if (t.isUrgent && !t.isImportant) return "q3";
  return "q4";
}

export const QUADRANT_META = {
  q1: { label: "🔴 DO NOW", sub: "Khẩn + Quan trọng", color: "border-red-300 bg-red-50", badge: "bg-red-100 text-red-700" },
  q2: { label: "🟡 LÊN KẾ HOẠCH", sub: "Không khẩn + Quan trọng", color: "border-yellow-300 bg-yellow-50", badge: "bg-yellow-100 text-yellow-700" },
  q3: { label: "🔵 GIAO VIỆC", sub: "Khẩn + Không quan trọng", color: "border-blue-300 bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  q4: { label: "⚫ LOẠI BỎ", sub: "Không khẩn + Không quan trọng", color: "border-gray-200 bg-gray-50", badge: "bg-gray-100 text-gray-500" },
} as const;

export const STATUS_COLUMNS = [
  { id: "TODO", label: "📋 TODO" },
  { id: "DOING", label: "🔄 Đang làm" },
  { id: "PENDING", label: "⏳ Pending" },
  { id: "DONE", label: "✅ Xong" },
  { id: "DELEGATED", label: "👥 Đã giao" },
];
