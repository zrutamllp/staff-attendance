import type { SessionUser, AttendanceStatus, AttendanceTotals } from "@/types/session";
import type { Employee } from "@/types/domain";

type AttendanceRecordMap = Record<string, AttendanceStatus | null>;
type EmployeeRecordMap = Record<string, AttendanceRecordMap>;
type EmployeeStatusFilter = "active" | "exited";

import { eq, and, gte, lte, inArray, desc, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  employees,
  attendanceRecords,
  users,
  managerAssignmentHistory,
  leaveGrants,
  employeeAdvances,
  attendanceChangeLogs,
  organizations,
} from "@/lib/db/schema";
import { getEmployeeFilter, canAccessEmployee } from "@/lib/permissions";
import {
  calculateTotals,
  toDateString,
  countLeaveUsage,
  SICK_LEAVE_ANNUAL_QUOTA,
  WEEKLY_LEAVE_QUOTA,
  buildMonthDayRecords,
  getWeekRange,
  buildEmployeeMonthRows,
  isEmployedOnDate,
  canEditAttendanceDate,
  ADMIN_EDIT_WINDOW_DAYS,
  EDIT_LOCK_CODES,
  normalizeStoredStatus,
  effectiveStatus,
  type DayRecordInput,
} from "@/lib/attendance";
import {
  getBackupDateRange,
  resolveBackupDateRange,
  type BackupRangeParams,
} from "@/lib/backup-range";
import {
  AUTO_PRESENT_TIMEZONE,
  getLocalDateString,
  getLocalHour,
  isBeforeAutoPresentTime,
} from "@/lib/auto-present";
import { ValidationError } from "@/lib/api-auth";
import { normalizePhone, isValidPhone } from "@/lib/phone";

export const QUOTA_CODES = {
  WEEKLY_LEAVE_LIMIT: "WEEKLY_LEAVE_LIMIT",
  SICK_LEAVE_LIMIT: "SICK_LEAVE_LIMIT",
};

type LeaveGrantType = "L" | "SL";

async function hasLeaveGrantForDate(
  employeeId: string,
  date: string,
  type: LeaveGrantType
) {
  const [grant] = await db
    .select({ id: leaveGrants.id })
    .from(leaveGrants)
    .where(
      and(
        eq(leaveGrants.employeeId, employeeId),
        eq(leaveGrants.type, type),
        lte(leaveGrants.startDate, date),
        gte(leaveGrants.endDate, date)
      )
    )
    .limit(1);

  return Boolean(grant);
}

async function getOrganizationDefaultOwnerId(organizationId: string) {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.organizationId, organizationId), eq(users.role, "master_admin"))
    )
    .limit(1);

  return admin?.id ?? null;
}

export async function getEmployeesForUser(
  user: SessionUser,
  { status }: { status?: EmployeeStatusFilter } = {}
) {
  const filter = getEmployeeFilter(user);
  const conditions = [eq(employees.organizationId, filter.organizationId)];

  if (status) {
    conditions.push(eq(employees.status, status));
  }

  return db
    .select()
    .from(employees)
    .where(and(...conditions))
    .orderBy(asc(employees.name));
}

export async function getEmployeeById(user: SessionUser, employeeId: string) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee || !canAccessEmployee(user, employee)) {
    return null;
  }
  return employee;
}

export async function createEmployee(
  user: SessionUser,
  { name, joiningDate }: { name: string; joiningDate: string }
) {
  const ownerId = (await getOrganizationDefaultOwnerId(user.organizationId)) || user.id;

  const [employee] = await db
    .insert(employees)
    .values({
      organizationId: user.organizationId,
      name,
      joiningDate,
      sevenDayWeek: true,
      currentManagerId: ownerId,
    })
    .returning();

  await db.insert(managerAssignmentHistory).values({
    employeeId: employee.id,
    managerId: ownerId,
    startDate: joiningDate,
  });

  return employee;
}

export async function updateEmployee(
  user: SessionUser,
  employeeId: string,
  data: { name?: string; joiningDate?: string }
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  const updates: Partial<{ name: string; joiningDate: string; updatedAt: Date }> = {};
  if (data.name) updates.name = data.name;
  if (data.joiningDate) updates.joiningDate = data.joiningDate;
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(employees)
    .set(updates)
    .where(eq(employees.id, employeeId))
    .returning();

  return updated;
}

export async function exitEmployee(
  user: SessionUser,
  employeeId: string,
  exitDate: string,
  exitTime: string | null
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  await db
    .update(managerAssignmentHistory)
    .set({ endDate: exitDate })
    .where(
      and(
        eq(managerAssignmentHistory.employeeId, employeeId),
        sql`${managerAssignmentHistory.endDate} IS NULL`
      )
    );

  const [updated] = await db
    .update(employees)
    .set({
      status: "exited",
      exitDate,
      exitTime: exitTime || null,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, employeeId))
    .returning();

  return updated;
}

export async function reactivateEmployee(
  user: SessionUser,
  employeeId: string,
  { joiningDate }: { joiningDate?: string } = {}
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee || employee.status !== "exited") return null;

  const rejoinDate = joiningDate || new Date().toISOString().split("T")[0];
  const ownerId =
    (await getOrganizationDefaultOwnerId(user.organizationId)) ||
    employee.currentManagerId;

  await db.insert(managerAssignmentHistory).values({
    employeeId: employee.id,
    managerId: ownerId,
    startDate: rejoinDate,
  });

  const [updated] = await db
    .update(employees)
    .set({
      status: "active",
      exitDate: null,
      exitTime: null,
      joiningDate: rejoinDate,
      currentManagerId: ownerId,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, employeeId))
    .returning();

  return updated;
}

export async function deleteEmployee(user: SessionUser, employeeId: string) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return false;

  await db.delete(employees).where(eq(employees.id, employeeId));
  return true;
}

export async function getAttendanceForMonth(
  user: SessionUser,
  year: number,
  month: number,
  employeeIds: string[]
) {
  const startDate = toDateString(year, month, 1);
  const endDate = toDateString(year, month, getDaysInMonth(year, month));

  const conditions = [
    eq(attendanceRecords.organizationId, user.organizationId),
    gte(attendanceRecords.date, startDate),
    lte(attendanceRecords.date, endDate),
  ];

  if (employeeIds?.length) {
    conditions.push(inArray(attendanceRecords.employeeId, employeeIds));
  }

  return db
    .select()
    .from(attendanceRecords)
    .where(and(...conditions));
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

async function getStoredAttendanceStatus(employeeId: string, date: string) {
  const [existing] = await db
    .select({ status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.date, date)
      )
    )
    .limit(1);

  return existing?.status ?? null;
}

async function logAttendanceChange({
  organizationId,
  employeeId,
  date,
  previousStatus,
  newStatus,
  changedBy,
}: {
  organizationId: string;
  employeeId: string;
  date: string;
  previousStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus | null;
  changedBy: string;
}) {
  await db.insert(attendanceChangeLogs).values({
    organizationId,
    employeeId,
    date,
    previousStatus,
    newStatus,
    changedBy,
  });
}

export async function getLatestChangeMapForMonth(
  user: SessionUser,
  year: number,
  month: number,
  employeeIds: string[]
) {
  if (!employeeIds.length) return {};

  const startDate = toDateString(year, month, 1);
  const endDate = toDateString(year, month, getDaysInMonth(year, month));

  const logs = await db
    .select({
      employeeId: attendanceChangeLogs.employeeId,
      date: attendanceChangeLogs.date,
      newStatus: attendanceChangeLogs.newStatus,
      changedBy: attendanceChangeLogs.changedBy,
      changedAt: attendanceChangeLogs.changedAt,
      changedByName: users.name,
      changedByRole: users.role,
    })
    .from(attendanceChangeLogs)
    .innerJoin(users, eq(attendanceChangeLogs.changedBy, users.id))
    .where(
      and(
        eq(attendanceChangeLogs.organizationId, user.organizationId),
        inArray(attendanceChangeLogs.employeeId, employeeIds),
        gte(attendanceChangeLogs.date, startDate),
        lte(attendanceChangeLogs.date, endDate)
      )
    )
    .orderBy(desc(attendanceChangeLogs.changedAt));

  const map: Record<string, (typeof logs)[number]> = {};
  for (const log of logs) {
    const key = `${log.employeeId}:${log.date}`;
    if (!map[key]) map[key] = log;
  }
  return map;
}

export async function getAttendanceGridData(
  user: SessionUser,
  year: number,
  month: number
) {
  const employees = await getEmployeesForUser(user, { status: "active" });
  const employeeIds = employees.map((e) => e.id);
  const records = await getAttendanceForMonth(user, year, month, employeeIds);

  const recordMap: EmployeeRecordMap = {};
  for (const r of records) {
    if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
    recordMap[r.employeeId][r.date] = r.status;
  }

  const daysInMonth = getDaysInMonth(year, month);
  const now = new Date();
  const today = getLocalDateString(now);
  const changeMap = await getLatestChangeMapForMonth(user, year, month, employeeIds);

  const grid = employees.map((emp) => {
    const empRecordMap = recordMap[emp.id] ?? {};
    const empRecords = buildMonthDayRecords(year, month, empRecordMap, {
      joiningDate: emp.joiningDate,
      exitDate: emp.exitDate,
    }).map((day) => {
      const latest = changeMap[`${emp.id}:${day.date}`];
      return {
        ...day,
        editable: day.employed && canEditAttendanceDate(user.role, day.date, today),
        lastChangedBy: latest?.changedBy ?? null,
        lastChangedByName: latest?.changedByName ?? null,
        lastChangedAt: latest?.changedAt ?? null,
      };
    });
    return {
      employee: emp,
      days: empRecords,
      totals: calculateTotals(empRecords, { referenceDate: now }),
    };
  });

  return {
    year,
    month,
    grid,
    daysInMonth,
    editPolicy: {
      role: user.role,
      adminWindowDays: ADMIN_EDIT_WINDOW_DAYS,
      referenceDate: today,
    },
  };
}

export async function getAttendanceChangeLogsForMonth(
  user: SessionUser,
  year: number,
  month: number
) {
  const startDate = toDateString(year, month, 1);
  const endDate = toDateString(year, month, getDaysInMonth(year, month));

  return db
    .select({
      id: attendanceChangeLogs.id,
      employeeId: attendanceChangeLogs.employeeId,
      employeeName: employees.name,
      date: attendanceChangeLogs.date,
      previousStatus: attendanceChangeLogs.previousStatus,
      newStatus: attendanceChangeLogs.newStatus,
      changedBy: attendanceChangeLogs.changedBy,
      changedByName: users.name,
      changedByRole: users.role,
      changedAt: attendanceChangeLogs.changedAt,
    })
    .from(attendanceChangeLogs)
    .innerJoin(employees, eq(attendanceChangeLogs.employeeId, employees.id))
    .innerJoin(users, eq(attendanceChangeLogs.changedBy, users.id))
    .where(
      and(
        eq(attendanceChangeLogs.organizationId, user.organizationId),
        gte(attendanceChangeLogs.date, startDate),
        lte(attendanceChangeLogs.date, endDate)
      )
    )
    .orderBy(desc(attendanceChangeLogs.changedAt));
}

export async function setAttendance(
  user: SessionUser,
  employeeId: string,
  date: string,
  status: AttendanceStatus | null
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  if (!isEmployedOnDate(employee.joiningDate, employee.exitDate, date)) {
    throw new ValidationError(
      "Attendance can only be marked from the employee's join date until their exit date"
    );
  }

  if (!canEditAttendanceDate(user.role, date)) {
    if (user.role === "master_admin") {
      throw new ValidationError(
        `Attendance older than ${ADMIN_EDIT_WINDOW_DAYS} days cannot be changed`,
        EDIT_LOCK_CODES.ATTENDANCE_LOCKED
      );
    }
    throw new ValidationError(
      "Managers can only change today's attendance",
      EDIT_LOCK_CODES.MANAGER_TODAY_ONLY
    );
  }

  const previousStatus = await getStoredAttendanceStatus(employeeId, date);
  const newStatus = normalizeStoredStatus(status);

  if (previousStatus === newStatus) {
    return { employeeId, date, status: newStatus };
  }

  if (newStatus === "L") {
    const [weekStart, weekEnd] = getWeekRange(date);
    const weekRecords = await db
      .select({ date: attendanceRecords.date, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.status, "L"),
          gte(attendanceRecords.date, weekStart),
          lte(attendanceRecords.date, weekEnd)
        )
      );

    const used = countLeaveUsage(weekRecords, { date, type: "L" });
    if (used >= WEEKLY_LEAVE_QUOTA) {
      const covered = await hasLeaveGrantForDate(employeeId, date, "L");
      if (!covered) {
        throw new ValidationError(
          "Weekly leave limit reached (1 day per week). Grant extra leave to mark more.",
          QUOTA_CODES.WEEKLY_LEAVE_LIMIT
        );
      }
    }
  }

  if (newStatus === "SL") {
    const yearStart = `${date.slice(0, 4)}-01-01`;
    const yearEnd = `${date.slice(0, 4)}-12-31`;
    const yearRecords = await db
      .select({ date: attendanceRecords.date, status: attendanceRecords.status })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.status, "SL"),
          gte(attendanceRecords.date, yearStart),
          lte(attendanceRecords.date, yearEnd)
        )
      );

    const used = countLeaveUsage(yearRecords, { date, type: "SL" });
    if (used >= SICK_LEAVE_ANNUAL_QUOTA) {
      const covered = await hasLeaveGrantForDate(employeeId, date, "SL");
      if (!covered) {
        throw new ValidationError(
          `Sick leave limit reached (${SICK_LEAVE_ANNUAL_QUOTA} days per year). Grant extra sick leave to mark more.`,
          QUOTA_CODES.SICK_LEAVE_LIMIT
        );
      }
    }
  }

  if (newStatus === null) {
    await db
      .delete(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.date, date)
        )
      );

    await logAttendanceChange({
      organizationId: user.organizationId,
      employeeId,
      date,
      previousStatus,
      newStatus: null,
      changedBy: user.id,
    });

    return { employeeId, date, status: null };
  }

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      organizationId: user.organizationId,
      employeeId,
      date,
      status: newStatus,
    })
    .onConflictDoUpdate({
      target: [attendanceRecords.employeeId, attendanceRecords.date],
      set: { status: newStatus, updatedAt: new Date() },
    })
    .returning();

  await logAttendanceChange({
    organizationId: user.organizationId,
    employeeId,
    date,
    previousStatus,
    newStatus,
    changedBy: user.id,
  });

  return record;
}

export async function getLeaveBalances(employeeId: string, dateStr: string) {
  const [weekStart, weekEnd] = getWeekRange(dateStr);

  const weeklyRecords = await db
    .select({ date: attendanceRecords.date, status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.status, "L"),
        gte(attendanceRecords.date, weekStart),
        lte(attendanceRecords.date, weekEnd)
      )
    );

  const yearStart = `${dateStr.slice(0, 4)}-01-01`;
  const yearEnd = `${dateStr.slice(0, 4)}-12-31`;

  const sickRecords = await db
    .select({ date: attendanceRecords.date, status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.status, "SL"),
        gte(attendanceRecords.date, yearStart),
        lte(attendanceRecords.date, yearEnd)
      )
    );

  const weeklyUsed = weeklyRecords.length;
  const sickUsed = sickRecords.length;

  return {
    weeklyLeave: {
      used: weeklyUsed,
      quota: WEEKLY_LEAVE_QUOTA,
      remaining: Math.max(0, WEEKLY_LEAVE_QUOTA - weeklyUsed),
      weekStart,
      weekEnd,
    },
    sickLeave: {
      used: sickUsed,
      quota: SICK_LEAVE_ANNUAL_QUOTA,
      remaining: Math.max(0, SICK_LEAVE_ANNUAL_QUOTA - sickUsed),
      year: parseInt(dateStr.slice(0, 4), 10),
    },
  };
}

export async function getLeaveGrantsForEmployee(user: SessionUser, employeeId: string) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  return db
    .select({
      id: leaveGrants.id,
      type: leaveGrants.type,
      startDate: leaveGrants.startDate,
      endDate: leaveGrants.endDate,
      createdAt: leaveGrants.createdAt,
      grantedByName: users.name,
    })
    .from(leaveGrants)
    .innerJoin(users, eq(leaveGrants.grantedBy, users.id))
    .where(eq(leaveGrants.employeeId, employeeId))
    .orderBy(desc(leaveGrants.createdAt));
}

export async function createLeaveGrant(
  user: SessionUser,
  employeeId: string,
  {
    type,
    startDate,
    endDate,
    forDate,
  }: {
    type: LeaveGrantType;
    startDate: string;
    endDate: string;
    forDate?: string;
  }
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  if (type !== "L" && type !== "SL") {
    throw new ValidationError("Grant type must be L or SL");
  }
  if (!startDate || !endDate) {
    throw new ValidationError("Start and end dates are required");
  }
  if (startDate > endDate) {
    throw new ValidationError("Start date must be on or before end date");
  }
  if (forDate && (forDate < startDate || forDate > endDate)) {
    throw new ValidationError(
      "The grant range must include the attendance date you are marking"
    );
  }

  const [grant] = await db
    .insert(leaveGrants)
    .values({
      organizationId: user.organizationId,
      employeeId,
      type,
      startDate,
      endDate,
      grantedBy: user.id,
    })
    .returning();

  const [granter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    ...grant,
    grantedByName: granter?.name ?? user.name,
  };
}

function parseAdvanceAmount(value: string | number): string {
  const amount = Number.parseFloat(String(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("Enter a valid amount greater than zero");
  }
  return amount.toFixed(2);
}

function sumAdvanceAmounts(rows: Array<{ amount: string }>): number {
  return rows.reduce((total, row) => total + Number.parseFloat(row.amount), 0);
}

export async function getAdvancesForEmployee(user: SessionUser, employeeId: string) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  return db
    .select({
      id: employeeAdvances.id,
      amount: employeeAdvances.amount,
      date: employeeAdvances.date,
      notes: employeeAdvances.notes,
      createdAt: employeeAdvances.createdAt,
      givenByName: users.name,
    })
    .from(employeeAdvances)
    .innerJoin(users, eq(employeeAdvances.givenBy, users.id))
    .where(eq(employeeAdvances.employeeId, employeeId))
    .orderBy(desc(employeeAdvances.date), desc(employeeAdvances.createdAt));
}

export async function getAdvanceSummary(
  user: SessionUser,
  employeeId: string,
  referenceDate?: string
) {
  const advances = await getAdvancesForEmployee(user, employeeId);
  if (advances === null) return null;

  const ref = referenceDate || getLocalDateString();
  const [year, month] = ref.split("-");

  const monthRows = advances.filter((row) => row.date.startsWith(`${year}-${month}`));
  const yearRows = advances.filter((row) => row.date.startsWith(`${year}-`));

  return {
    monthTotal: sumAdvanceAmounts(monthRows),
    yearTotal: sumAdvanceAmounts(yearRows),
    allTimeTotal: sumAdvanceAmounts(advances),
    month: parseInt(month, 10),
    year: parseInt(year, 10),
  };
}

export async function createEmployeeAdvance(
  user: SessionUser,
  employeeId: string,
  {
    amount,
    date,
    notes,
  }: { amount: string | number; date: string; notes?: string | null }
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  if (!date) {
    throw new ValidationError("Date is required");
  }

  const normalizedAmount = parseAdvanceAmount(String(amount));

  const [advance] = await db
    .insert(employeeAdvances)
    .values({
      organizationId: user.organizationId,
      employeeId,
      amount: normalizedAmount,
      date,
      givenBy: user.id,
      notes: notes?.trim() || null,
    })
    .returning();

  const [granter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    ...advance,
    givenByName: granter?.name ?? user.name,
  };
}

export async function getDashboardStats(user: SessionUser) {
  const activeEmployees = await getEmployeesForUser(user, { status: "active" });
  const today = getLocalDateString();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const employeeIds = activeEmployees.map((e) => e.id);

  let todayRecords: { employeeId: string; status: AttendanceStatus | null }[] = [];
  if (employeeIds.length) {
    todayRecords = await db
      .select({
        employeeId: attendanceRecords.employeeId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(
        and(
          inArray(attendanceRecords.employeeId, employeeIds),
          eq(attendanceRecords.date, today)
        )
      );
  }

  const monthRecords =
    employeeIds.length > 0
      ? await getAttendanceForMonth(user, year, month, employeeIds)
      : [];

  const todayRecordMap = Object.fromEntries(
    todayRecords.map((r) => [r.employeeId, r.status])
  );

  const todayRows = activeEmployees.map((emp) => ({
    status: todayRecordMap[emp.id] ?? null,
    date: today,
    employed: isEmployedOnDate(emp.joiningDate, emp.exitDate, today),
  }));

  const todayTotals = calculateTotals(todayRows, { referenceDate: now });

  const exceptionsToday = todayRows.filter((r) => {
    if (!r.employed) return false;
    const status = effectiveStatus(r.status, r.date, {
      employed: true,
      referenceDate: now,
    });
    return status && status !== "P";
  }).length;

  const monthRecordsByEmployee: EmployeeRecordMap = {};
  for (const r of monthRecords) {
    if (!monthRecordsByEmployee[r.employeeId]) {
      monthRecordsByEmployee[r.employeeId] = {};
    }
    monthRecordsByEmployee[r.employeeId][r.date] = r.status;
  }

  const allMonthRows: DayRecordInput[] = [];
  for (const emp of activeEmployees) {
    allMonthRows.push(
      ...buildMonthDayRecords(year, month, monthRecordsByEmployee[emp.id] ?? {}, {
        joiningDate: emp.joiningDate,
        exitDate: emp.exitDate,
      })
    );
  }

  const markedToday = todayRows.filter((r) => {
    if (!r.employed) return false;
    const status = effectiveStatus(r.status, r.date, {
      employed: true,
      referenceDate: now,
    });
    return status != null;
  }).length;

  return {
    totalEmployees: activeEmployees.length,
    markedToday,
    remainingToday: exceptionsToday,
    exceptionsToday,
    todayTotals,
    monthTotals: calculateTotals(allMonthRows, { referenceDate: now }),
  };
}

export async function getManagers(user: SessionUser) {
  return db
    .select()
    .from(users)
    .where(
      and(eq(users.organizationId, user.organizationId), eq(users.role, "manager"))
    )
    .orderBy(asc(users.name));
}

export async function createManager(
  user: SessionUser,
  { name, phone, password }: { name: string; phone: string; password: string }
) {
  const bcrypt = await import("bcryptjs");

  const normalizedPhone = normalizePhone(phone);
  if (!isValidPhone(normalizedPhone)) {
    throw new Error("Enter a valid phone number (10–15 digits)");
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.organizationId, user.organizationId),
        eq(users.phone, normalizedPhone)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error("This phone number is already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [manager] = await db
    .insert(users)
    .values({
      organizationId: user.organizationId,
      name,
      phone: normalizedPhone,
      passwordHash,
      role: "manager",
      status: "active",
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      organizationId: users.organizationId,
      createdAt: users.createdAt,
    });

  return manager;
}

export async function deactivateManager(adminUser: SessionUser, managerId: string) {
  const [manager] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.organizationId, adminUser.organizationId),
        eq(users.role, "manager")
      )
    )
    .limit(1);

  if (!manager || manager.status === "inactive") return null;

  const [updated] = await db
    .update(users)
    .set({ status: "inactive" })
    .where(eq(users.id, managerId))
    .returning();

  return { manager: updated, transferredCount: 0 };
}

export async function transferEmployee(
  adminUser: SessionUser,
  employeeId: string,
  newManagerId: string
) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.id, employeeId),
        eq(employees.organizationId, adminUser.organizationId)
      )
    )
    .limit(1);

  if (!employee) return null;

  const today = getLocalDateString();
  const oldManagerId = employee.currentManagerId;

  await db
    .update(managerAssignmentHistory)
    .set({ endDate: today })
    .where(
      and(
        eq(managerAssignmentHistory.employeeId, employeeId),
        eq(managerAssignmentHistory.managerId, oldManagerId),
        sql`${managerAssignmentHistory.endDate} IS NULL`
      )
    );

  await db.insert(managerAssignmentHistory).values({
    employeeId,
    managerId: newManagerId,
    startDate: today,
  });

  const [updated] = await db
    .update(employees)
    .set({ currentManagerId: newManagerId, updatedAt: new Date() })
    .where(eq(employees.id, employeeId))
    .returning();

  return updated;
}

export async function getOrgAnalytics(user: SessionUser) {
  const allEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.organizationId, user.organizationId));

  const allManagers = await db
    .select()
    .from(users)
    .where(
      and(eq(users.organizationId, user.organizationId), eq(users.role, "manager"))
    );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startDate = toDateString(year, month, 1);
  const endDate = toDateString(year, month, getDaysInMonth(year, month));

  const monthAttendance = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.organizationId, user.organizationId),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate)
      )
    );

  const activeEmployees = allEmployees.filter((e) => e.status === "active");
  const exitedEmployees = allEmployees.filter((e) => e.status === "exited");
  const activeManagers = allManagers.filter((m) => m.status === "active");
  const daysInMonth = getDaysInMonth(year, month);
  const recordMap: EmployeeRecordMap = {};
  for (const r of monthAttendance) {
    if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
    recordMap[r.employeeId][r.date] = r.status;
  }

  const allMonthRows: DayRecordInput[] = [];
  for (const emp of activeEmployees) {
    allMonthRows.push(
      ...buildMonthDayRecords(year, month, recordMap[emp.id] ?? {}, {
        joiningDate: emp.joiningDate,
        exitDate: emp.exitDate,
      })
    );
  }

  const monthTotals = calculateTotals(allMonthRows);

  const managerStats = allManagers.map((manager) => ({
    id: manager.id,
    name: manager.name,
    status: manager.status,
    employeeCount: activeEmployees.length,
    ...monthTotals,
  }));

  return {
    totalManagers: allManagers.length,
    activeManagers: activeManagers.length,
    totalEmployees: allEmployees.length,
    activeEmployees: activeEmployees.length,
    exitedEmployees: exitedEmployees.length,
    monthTotals,
    managerStats,
  };
}

export async function exportBackup(user: SessionUser, params: BackupRangeParams) {
  const range = getBackupDateRange(params);

  const orgEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.organizationId, user.organizationId));

  const orgManagers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      status: users.status,
    })
    .from(users)
    .where(eq(users.organizationId, user.organizationId));

  const attendance = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.organizationId, user.organizationId),
        gte(attendanceRecords.date, range.startDate),
        lte(attendanceRecords.date, range.endDate)
      )
    );

  const assignments = await db
    .select()
    .from(managerAssignmentHistory)
    .where(
      inArray(
        managerAssignmentHistory.employeeId,
        orgEmployees.map((e) => e.id)
      )
    );

  return {
    version: 1,
    period: range.period,
    year: range.year,
    month: range.month,
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    startDate: range.startDate,
    endDate: range.endDate,
    exportedAt: new Date().toISOString(),
    organizationId: user.organizationId,
    employees: orgEmployees,
    managers: orgManagers,
    attendance,
    managerAssignmentHistory: assignments,
  };
}

export async function exportYearBackup(user: SessionUser, year: number) {
  return exportBackup(user, { period: "yearly", year });
}

export async function getEmployeeWithManager(user: SessionUser, employeeId: string) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  const [manager] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, employee.currentManagerId))
    .limit(1);

  return { ...employee, manager };
}

export async function getEmployeesWithManagers(
  user: SessionUser,
  options: { status?: EmployeeStatusFilter } = {}
) {
  const list = await getEmployeesForUser(user, options);

  const managerIds = [...new Set(list.map((e) => e.currentManagerId))];
  const managers =
    managerIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, managerIds))
      : [];

  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));

  return list.map((e) => ({
    ...e,
    manager: managerMap[e.currentManagerId] ?? null,
  }));
}

const VALID_STATUSES = new Set(["P", "A", "L", "SL", "H"]);

export function validateBackup(data: Record<string, unknown>, organizationId: string) {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Invalid backup format"] };
  }
  if (data.version !== 1) errors.push("Unsupported backup version");
  if (!data.year || typeof data.year !== "number") errors.push("Invalid year");
  if (!Array.isArray(data.employees)) errors.push("Missing employees array");
  if (!Array.isArray(data.attendance)) errors.push("Missing attendance array");

  if (errors.length) return { valid: false, errors };

  const range = resolveBackupDateRange(data);

  for (const emp of data.employees as Array<Record<string, unknown>>) {
    if (!emp.id || !emp.name || !emp.joiningDate) {
      errors.push(`Invalid employee record: ${String(emp.name || "unknown")}`);
    }
  }

  for (const rec of data.attendance as Array<Record<string, unknown>>) {
    if (!rec.employeeId || !rec.date) {
      errors.push("Invalid attendance record");
      continue;
    }
    if (rec.status && !VALID_STATUSES.has(String(rec.status))) {
      errors.push(`Invalid status: ${rec.status}`);
    }
    const date = String(rec.date);
    if (date < range.startDate || date > range.endDate) {
      errors.push(`Attendance date ${date} outside backup range`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      period: range.period,
      year: range.year,
      month: range.month,
      weekStart: range.weekStart,
      weekEnd: range.weekEnd,
      startDate: range.startDate,
      endDate: range.endDate,
      employees: (data.employees as unknown[]).length,
      managers: Array.isArray(data.managers) ? data.managers.length : 0,
      attendance: (data.attendance as unknown[]).length,
      organizationId,
    },
  };
}

export async function restoreBackup(
  adminUser: SessionUser,
  data: Record<string, unknown>,
  mode: "merge" | "replace" | "overwrite" = "merge"
) {
  const validation = validateBackup(data, adminUser.organizationId);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const range = resolveBackupDateRange(data);
  const { startDate, endDate } = range;
  let employeesUpserted = 0;
  let attendanceUpserted = 0;

  if (mode === "overwrite") {
    await db
      .delete(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationId, adminUser.organizationId),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      );
  }

  for (const emp of data.employees as Array<Record<string, unknown>>) {
    const [existing] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, emp.id as string),
          eq(employees.organizationId, adminUser.organizationId)
        )
      )
      .limit(1);

    const payload = {
      name: emp.name as string,
      joiningDate: emp.joiningDate as string,
      exitDate: (emp.exitDate as string | null | undefined) ?? null,
      exitTime: (emp.exitTime as string | null | undefined) ?? null,
      status: (emp.status as "active" | "exited" | undefined) ?? "active",
      sevenDayWeek: (emp.sevenDayWeek as boolean | undefined) ?? true,
      currentManagerId: emp.currentManagerId as string,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(employees)
        .set(payload)
        .where(eq(employees.id, emp.id as string));
    } else {
      await db.insert(employees).values({
        id: emp.id as string,
        organizationId: adminUser.organizationId,
        ...payload,
      });
    }
    employeesUpserted += 1;
  }

  if (Array.isArray(data.managers)) {
    for (const mgr of data.managers) {
      if (mgr.role === "master_admin") continue;
      const [existing] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.id, mgr.id), eq(users.organizationId, adminUser.organizationId))
        )
        .limit(1);

      if (existing) {
        await db
          .update(users)
          .set({
            name: mgr.name,
            phone: mgr.phone ?? existing.phone,
            email: mgr.email ?? existing.email,
            status: mgr.status ?? "active",
          })
          .where(eq(users.id, mgr.id));
      }
    }
  }

  for (const rec of data.attendance as Array<Record<string, unknown>>) {
    const [empExists] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, rec.employeeId as string),
          eq(employees.organizationId, adminUser.organizationId)
        )
      )
      .limit(1);

    if (!empExists) continue;

    if (rec.status) {
      await db
        .insert(attendanceRecords)
        .values({
          organizationId: adminUser.organizationId,
          employeeId: rec.employeeId as string,
          date: rec.date as string,
          status: rec.status as AttendanceStatus,
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.employeeId, attendanceRecords.date],
          set: { status: rec.status as AttendanceStatus, updatedAt: new Date() },
        });
    } else if (mode === "overwrite") {
      await db
        .delete(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, rec.employeeId as string),
            eq(attendanceRecords.date, rec.date as string)
          )
        );
    }
    attendanceUpserted += 1;
  }

  if (Array.isArray(data.managerAssignmentHistory)) {
    for (const a of data.managerAssignmentHistory) {
      const [exists] = await db
        .select({ id: managerAssignmentHistory.id })
        .from(managerAssignmentHistory)
        .where(eq(managerAssignmentHistory.id, a.id))
        .limit(1);
      if (!exists) {
        await db.insert(managerAssignmentHistory).values({
          id: a.id,
          employeeId: a.employeeId,
          managerId: a.managerId,
          startDate: a.startDate,
          endDate: a.endDate ?? null,
        });
      }
    }
  }

  return {
    mode,
    period: range.period,
    year: range.year,
    startDate,
    endDate,
    employeesUpserted,
    attendanceUpserted,
  };
}

export async function transferEmployees(
  adminUser: SessionUser,
  employeeIds: string[],
  newManagerId: string
) {
  const results: Employee[] = [];
  for (const employeeId of employeeIds) {
    const updated = await transferEmployee(adminUser, employeeId, newManagerId);
    if (updated) results.push(updated);
  }
  return results;
}

export async function getManagerDetail(adminUser: SessionUser, managerId: string) {
  const [manager] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.organizationId, adminUser.organizationId),
        eq(users.role, "manager")
      )
    )
    .limit(1);

  if (!manager) return null;

  const orgEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.organizationId, adminUser.organizationId))
    .orderBy(asc(employees.name));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const ids = orgEmployees.filter((e) => e.status === "active").map((e) => e.id);
  const activeEmployees = orgEmployees.filter((e) => e.status === "active");
  const recordMap: EmployeeRecordMap = {};
  const records =
    ids.length > 0 ? await getAttendanceForMonth(adminUser, year, month, ids) : [];
  for (const r of records) {
    if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
    recordMap[r.employeeId][r.date] = r.status;
  }
  const monthRows = buildEmployeeMonthRows(year, month, activeEmployees, recordMap);

  return {
    ...manager,
    employees: orgEmployees,
    activeCount: orgEmployees.filter((e) => e.status === "active").length,
    monthTotals: calculateTotals(monthRows),
  };
}

export async function updateManager(
  adminUser: SessionUser,
  managerId: string,
  data: {
    name?: string;
    phone?: string;
    password?: string;
    status?: "active" | "inactive";
  }
) {
  const [manager] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.organizationId, adminUser.organizationId),
        eq(users.role, "manager")
      )
    )
    .limit(1);

  if (!manager) return null;

  const updates: Partial<{ name: string; phone: string; passwordHash: string }> = {};
  if (data.name) updates.name = data.name;

  if (data.phone) {
    const normalizedPhone = normalizePhone(data.phone);
    if (!isValidPhone(normalizedPhone)) {
      throw new Error("Enter a valid phone number (10–15 digits)");
    }
    const [duplicate] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, adminUser.organizationId),
          eq(users.phone, normalizedPhone)
        )
      )
      .limit(1);
    if (duplicate && duplicate.id !== managerId) {
      throw new Error("This phone number is already registered");
    }
    updates.phone = normalizedPhone;
  }

  if (data.password) {
    const bcrypt = await import("bcryptjs");
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, managerId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
    });

  return updated;
}

export async function getEmployeeAttendanceHistory(
  user: SessionUser,
  employeeId: string,
  year: number
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const records = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.date, startDate),
        lte(attendanceRecords.date, endDate)
      )
    );

  const months: Array<{ month: number } & AttendanceTotals> = [];
  for (let m = 1; m <= 12; m++) {
    const recordMap: AttendanceRecordMap = {};
    for (const r of records) {
      if (r.date.startsWith(`${year}-${String(m).padStart(2, "0")}`)) {
        recordMap[r.date] = r.status;
      }
    }
    const monthRecords = buildMonthDayRecords(year, m, recordMap, {
      joiningDate: employee.joiningDate,
      exitDate: employee.exitDate,
    });
    months.push({
      month: m,
      ...calculateTotals(monthRecords),
    });
  }

  return { employee, year, months };
}

export async function getEmployeeAssignmentHistory(
  user: SessionUser,
  employeeId: string
) {
  const employee = await getEmployeeById(user, employeeId);
  if (!employee) return null;

  const history = await db
    .select({
      id: managerAssignmentHistory.id,
      managerId: managerAssignmentHistory.managerId,
      startDate: managerAssignmentHistory.startDate,
      endDate: managerAssignmentHistory.endDate,
      managerName: users.name,
    })
    .from(managerAssignmentHistory)
    .innerJoin(users, eq(managerAssignmentHistory.managerId, users.id))
    .where(eq(managerAssignmentHistory.employeeId, employeeId))
    .orderBy(asc(managerAssignmentHistory.startDate));

  return { employee, history };
}

export async function getReport(
  user: SessionUser,
  type: string,
  params: Record<string, string | undefined>
) {
  const { year, month, employeeId, managerId: _managerId } = params;
  const yearNum = parseInt(String(year), 10);
  const monthNum = parseInt(String(month), 10);

  if (type === "monthly") {
    const employees = await getEmployeesForUser(user, { status: "active" });
    const ids = employees.map((e) => e.id);
    const records =
      ids.length > 0 ? await getAttendanceForMonth(user, yearNum, monthNum, ids) : [];
    const recordMap: EmployeeRecordMap = {};
    for (const r of records) {
      if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
      recordMap[r.employeeId][r.date] = r.status;
    }
    const monthRows = buildEmployeeMonthRows(yearNum, monthNum, employees, recordMap);
    const totals = calculateTotals(monthRows);
    return {
      year,
      month,
      totalEmployees: employees.length,
      workingDays: totals.marked,
      ...totals,
    };
  }

  if (type === "manager-comparison") {
    const allManagers = await db
      .select()
      .from(users)
      .where(
        and(eq(users.organizationId, user.organizationId), eq(users.role, "manager"))
      );

    const activeEmployees = await getEmployeesForUser(user, { status: "active" });
    const ids = activeEmployees.map((e) => e.id);
    const records =
      ids.length > 0 ? await getAttendanceForMonth(user, yearNum, monthNum, ids) : [];
    const recordMap: EmployeeRecordMap = {};
    for (const r of records) {
      if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
      recordMap[r.employeeId][r.date] = r.status;
    }
    const orgRows = buildEmployeeMonthRows(
      yearNum,
      monthNum,
      activeEmployees,
      recordMap
    );
    const orgTotals = calculateTotals(orgRows);

    const managers = allManagers.map((manager) => ({
      id: manager.id,
      name: manager.name,
      status: manager.status,
      employeeCount: activeEmployees.length,
      ...orgTotals,
    }));

    return { year, month, managers };
  }

  if (type === "employee") {
    if (!employeeId) {
      throw new ValidationError("employeeId is required");
    }
    return getEmployeeAttendanceHistory(user, employeeId, yearNum);
  }

  if (type === "yearly") {
    const activeEmployees = await getEmployeesForUser(user, { status: "active" });
    const ids = activeEmployees.map((e) => e.id);

    if (ids.length === 0) {
      return {
        year,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          P: 0,
          A: 0,
          L: 0,
          SL: 0,
          H: 0,
          marked: 0,
          percentage: 0,
        })),
      };
    }

    const startDate = `${yearNum}-01-01`;
    const endDate = `${yearNum}-12-31`;
    const records = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.organizationId, user.organizationId),
          inArray(attendanceRecords.employeeId, ids),
          gte(attendanceRecords.date, startDate),
          lte(attendanceRecords.date, endDate)
        )
      );

    const recordMap: EmployeeRecordMap = {};
    for (const r of records) {
      if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
      recordMap[r.employeeId][r.date] = r.status;
    }

    const months: Array<{ month: number } & AttendanceTotals> = [];
    for (let m = 1; m <= 12; m++) {
      const monthRows =
        activeEmployees.length > 0
          ? buildEmployeeMonthRows(yearNum, m, activeEmployees, recordMap)
          : [];
      months.push({ month: m, ...calculateTotals(monthRows) });
    }
    return { year: yearNum, months };
  }

  throw new Error("Invalid report type");
}

export async function getEmployeesFiltered(
  user: SessionUser,
  filters: Record<string, string | undefined> = {}
) {
  const filter = getEmployeeFilter(user);
  const conditions = [eq(employees.organizationId, filter.organizationId)];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(employees.status, filters.status as EmployeeStatusFilter));
  }
  if (filters.joinFrom) {
    conditions.push(gte(employees.joiningDate, filters.joinFrom));
  }
  if (filters.joinTo) {
    conditions.push(lte(employees.joiningDate, filters.joinTo));
  }
  if (filters.exitFrom) {
    conditions.push(gte(employees.exitDate, filters.exitFrom));
  }
  if (filters.exitTo) {
    conditions.push(lte(employees.exitDate, filters.exitTo));
  }

  const list = await db
    .select()
    .from(employees)
    .where(and(...conditions))
    .orderBy(asc(employees.name));

  const managerIds = [...new Set(list.map((e) => e.currentManagerId))];
  const managers =
    managerIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, managerIds))
      : [];
  const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));

  return list.map((e) => ({
    ...e,
    manager: managerMap[e.currentManagerId] ?? null,
  }));
}

/** Daily 10:00 job — confirms auto-present window; Present is applied via effectiveStatus rules. */
export async function runAutoPresent({ requireWindow = false } = {}) {
  const now = new Date();
  const date = getLocalDateString(now);
  const hour = getLocalHour(now);

  if (requireWindow && isBeforeAutoPresentTime(now)) {
    return {
      skipped: true,
      reason: "Before auto-present time",
      date,
      timezone: AUTO_PRESENT_TIMEZONE,
      hour,
      autoPresentHour: parseInt(process.env.AUTO_PRESENT_HOUR || "10", 10),
    };
  }

  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let eligible = 0;
  let exceptions = 0;
  let skippedNonWorking = 0;
  let skippedNotEmployed = 0;

  for (const org of orgs) {
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(and(eq(employees.organizationId, org.id), eq(employees.status, "active")));

    const employeeIds = activeEmployees.map((e) => e.id);
    let existingRecords: { employeeId: string; status: AttendanceStatus | null }[] = [];
    if (employeeIds.length > 0) {
      existingRecords = await db
        .select({
          employeeId: attendanceRecords.employeeId,
          status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .where(
          and(
            inArray(attendanceRecords.employeeId, employeeIds),
            eq(attendanceRecords.date, date)
          )
        );
    }

    const recordMap = Object.fromEntries(
      existingRecords.map((r) => [r.employeeId, r.status])
    );

    for (const emp of activeEmployees) {
      if (!isEmployedOnDate(emp.joiningDate, emp.exitDate, date)) {
        skippedNotEmployed += 1;
        continue;
      }
      if (recordMap[emp.id] != null) {
        exceptions += 1;
        continue;
      }
      eligible += 1;
    }
  }

  return {
    skipped: false,
    date,
    timezone: AUTO_PRESENT_TIMEZONE,
    hour,
    autoPresentHour: parseInt(process.env.AUTO_PRESENT_HOUR || "10", 10),
    organizations: orgs.length,
    eligible,
    exceptions,
    skippedNonWorking,
    skippedNotEmployed,
    message:
      "Auto-present is active after the configured hour. Employees without exceptions count as Present.",
  };
}
