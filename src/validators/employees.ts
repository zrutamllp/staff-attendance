import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const createEmployeeBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  joiningDate: dateString,
});

export const updateEmployeeBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  joiningDate: dateString.optional(),
  action: z.enum(["exit", "reactivate"]).optional(),
  exitDate: dateString.optional(),
  exitTime: z.string().optional(),
});

export const createAdvanceBodySchema = z.object({
  amount: z.union([z.string(), z.number()]),
  date: dateString,
  notes: z.string().optional(),
});

export const createLeaveGrantBodySchema = z.object({
  type: z.enum(["L", "SL"]),
  startDate: dateString,
  endDate: dateString,
  forDate: dateString.optional(),
});

export type CreateEmployeeBody = z.infer<typeof createEmployeeBodySchema>;
