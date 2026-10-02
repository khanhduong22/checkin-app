export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
  department?: string;
  hourlyRate?: number;
  monthlySalary?: number;
  isActive: boolean;
  startDate?: string;
  birthday?: string;
}

export type RequestType = "LEAVE" | "WFH" | "LATE_EARLY" | "OVERTIME" | "DEVICE";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface RequestItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    department?: string;
  };
  type: RequestType;
  status: RequestStatus;
  startDate: string;
  endDate?: string | null;
  reason: string;
  reviewerNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    department?: string;
  };
  checkinTime: string;
  checkoutTime?: string | null;
  workHours?: number | null;
  status: "ON_TIME" | "LATE" | "EARLY_LEAVE" | "WORKING" | "COMPLETED";
  ipAddress?: string | null;
  isVerifiedIp: boolean;
  date: string;
}

export interface PayrollItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  month: number;
  year: number;
  standardHours: number;
  actualHours: number;
  overtimeHours: number;
  hourlyRate: number;
  baseSalary: number;
  bonus: number;
  allowance: number;
  penalty: number;
  totalSalary: number;
  isPaid: boolean;
}

export type TaskType = "PACKAGING" | "WFH_DEV" | "CONTENT" | "DESIGN";
export type TaskStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface AdminTaskItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    department?: string;
  };
  title: string;
  type: TaskType;
  quantity?: number;
  ratePerUnit?: number;
  totalReward: number;
  proofUrl?: string;
  notes?: string;
  status: TaskStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface DashboardStats {
  todayCheckinCount: number;
  todayCheckoutCount: number;
  pendingRequestsCount: number;
  pendingTasksCount: number;
  totalEmployeesCount: number;
  estimatedMonthPayroll: number;
  onTimeRate: number;
  lateRate: number;
}

export interface SettingsConfig {
  allowedIps: string[];
  officeLat: number;
  officeLng: number;
  geofenceRadiusMeters: number;
  standardWorkHours: number;
  latePenaltyPerMinute: number;
  autoApproveCheckout: boolean;
}
