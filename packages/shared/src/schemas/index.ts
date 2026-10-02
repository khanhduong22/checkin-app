import { z } from "zod";

export const CheckinTypeSchema = z.enum(["checkin", "checkout"]);
export type CheckinType = z.infer<typeof CheckinTypeSchema>;

export const CheckinRequestSchema = z.object({
  type: CheckinTypeSchema,
  note: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  clientTimestamp: z.string().optional(),
});
export type CheckinRequest = z.infer<typeof CheckinRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  googleToken: z.string().optional(),
  idToken: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const WeeklyShiftQuerySchema = z.object({
  date: z.string().optional(),
});
export type WeeklyShiftQuery = z.infer<typeof WeeklyShiftQuerySchema>;

export const PayrollQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
});
export type PayrollQuery = z.infer<typeof PayrollQuerySchema>;
