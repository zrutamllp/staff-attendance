import type { InferSelectModel } from "drizzle-orm";
import {
  employees,
  users,
  employeeAdvances,
  leaveGrants,
  attendanceRecords,
} from "@/lib/db/schema";

export type Employee = InferSelectModel<typeof employees>;
export type User = InferSelectModel<typeof users>;
export type EmployeeAdvance = InferSelectModel<typeof employeeAdvances>;
export type LeaveGrant = InferSelectModel<typeof leaveGrants>;
export type AttendanceRecord = InferSelectModel<typeof attendanceRecords>;

export interface EmployeeDetailResponse extends Employee {
  managerName?: string | null;
  leaveBalances?: {
    weeklyLeave: {
      used: number;
      quota: number;
      remaining: number;
      weekStart: string;
      weekEnd: string;
    };
    sickLeave: {
      used: number;
      quota: number;
      remaining: number;
      year: number;
    };
  };
  leaveGrants?: Array<{
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    createdAt: Date;
    grantedByName: string | null;
  }>;
  advances?: Array<{
    id: string;
    date: string;
    amount: string;
    givenByName: string;
    notes?: string | null;
  }>;
  advanceSummary?: {
    monthTotal: number;
    yearTotal: number;
    allTimeTotal: number;
    month: number;
    year: number;
  };
}

export interface ManagerListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
}

export interface AdvanceSummary {
  totalGiven: number;
  count: number;
}
