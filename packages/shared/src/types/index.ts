export type UserRole = "ADMIN" | "USER" | "MANAGER" | "PARTNER";

export type EmploymentType = "FULL_TIME" | "PART_TIME";

export interface CurrentUserSession {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  image?: string | null;
  employmentType?: EmploymentType;
  hourlyRate?: number;
}

export interface CheckinResult {
  success: boolean;
  message: string;
  checkIn?: any;
}

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  time: string;
  db: "connected" | "disconnected";
  valkey?: "connected" | "disconnected";
  meilisearch?: "connected" | "disconnected";
  uptimeSeconds: number;
}
