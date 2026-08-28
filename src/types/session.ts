export type UserRole = "master_admin" | "manager";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export type AttendanceStatus = "P" | "A" | "L" | "SL" | "H";

export interface AttendanceTotals {
  P: number;
  A: number;
  L: number;
  SL: number;
  H: number;
  marked: number;
  percentage: number;
}

export interface AttendanceDayRecord {
  date: string;
  status: AttendanceStatus | null;
  employed: boolean;
  editable?: boolean;
  lastChangedBy?: string | null;
  lastChangedByName?: string | null;
  lastChangedAt?: string | null;
}

export interface AttendanceGridRow {
  employee: Record<string, unknown>;
  days: AttendanceDayRecord[];
  totals: AttendanceTotals;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string | null;
}
