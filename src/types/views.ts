import type { Employee } from "@/types/domain";
import type { AttendanceStatus, AttendanceTotals } from "@/types/session";

export interface AttendanceEmployeeRef {
  id: string;
  name: string;
}

export interface AttendancePickerState {
  employee: AttendanceEmployeeRef;
  date: string;
  storedStatus: AttendanceStatus | null;
  lastChangedBy?: string | null;
  lastChangedByName?: string | null;
}

export interface GrantModalState {
  employee: AttendanceEmployeeRef;
  date: string;
  type: AttendanceStatus;
  pendingCode?: string;
  message?: string;
}

export interface OverwriteModalState {
  employee: AttendanceEmployeeRef;
  date: string;
  storedStatus: AttendanceStatus | null;
  nextStatus: AttendanceStatus;
  pendingCode?: AttendanceStatus;
  lastChangedByName?: string | null;
  currentStoredStatus?: AttendanceStatus | null;
}

export interface EditPolicyState {
  employee: AttendanceEmployeeRef;
  date: string;
  type: string;
  message: string;
}

export interface AttendanceEditPolicyState {
  role: string;
  adminWindowDays: number;
  referenceDate: string;
}

export interface BackupPreview {
  period?: "weekly" | "monthly" | "yearly";
  year: number;
  month?: number;
  weekStart?: string;
  weekEnd?: string;
  startDate?: string;
  endDate?: string;
  label?: string;
  data: Record<string, unknown>;
  employees: number;
  managers: number;
  attendance: number;
}

export interface ManagerListRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
}

export interface ManagerDetailData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
  activeCount: number;
  monthTotals: AttendanceTotals;
  employees: Employee[];
}

export interface MonthlyReport {
  year?: number;
  month?: number;
  totalEmployees?: number;
  workingDays?: number;
  P?: number;
  A?: number;
  L?: number;
  SL?: number;
  H?: number;
  marked?: number;
  percentage?: number;
  managers?: Array<ManagerListRow & AttendanceTotals & { employeeCount?: number }>;
  months?: Array<{ month: number } & AttendanceTotals>;
}

export interface EmployeeDetailData {
  employee: Employee & { managerName?: string | null };
  history?: { year: number; months: Array<{ month: number } & AttendanceTotals> };
  assignments?: Array<{
    id: string;
    managerId: string;
    managerName: string;
    startDate: string;
    endDate: string | null;
  }>;
}

export interface SessionProfile {
  user: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string;
    organizationName?: string;
  };
}

export interface AttendanceGridRow {
  employee: Employee;
  days: Array<{
    date: string;
    status: AttendanceStatus | null;
    employed: boolean;
    editable?: boolean;
  }>;
  totals: AttendanceTotals;
}
