import { z } from "zod";

export const attendanceMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const setAttendanceBodySchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  status: z.enum(["P", "A", "L", "SL", "H"]).nullable().optional(),
});

export type SetAttendanceBody = z.infer<typeof setAttendanceBodySchema>;
