import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  time,
  numeric,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["master_admin", "manager"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "exited"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "P",
  "A",
  "L",
  "SL",
  "H",
]);

export const leaveGrantTypeEnum = pgEnum("leave_grant_type", ["L", "SL"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_org_email_idx").on(table.organizationId, table.email),
    uniqueIndex("users_org_phone_idx").on(table.organizationId, table.phone),
    index("users_org_idx").on(table.organizationId),
  ]
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    joiningDate: date("joining_date").notNull(),
    exitDate: date("exit_date"),
    exitTime: time("exit_time"),
    status: employeeStatusEnum("status").notNull().default("active"),
    currentManagerId: uuid("current_manager_id")
      .notNull()
      .references(() => users.id),
    sevenDayWeek: boolean("seven_day_week").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("employees_org_idx").on(table.organizationId),
    index("employees_manager_idx").on(table.currentManagerId),
  ]
);

export const managerAssignmentHistory = pgTable(
  "manager_assignment_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("assignment_employee_idx").on(table.employeeId)]
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attendance_employee_date_idx").on(table.employeeId, table.date),
    index("attendance_org_date_idx").on(table.organizationId, table.date),
  ]
);

export const attendanceChangeLogs = pgTable(
  "attendance_change_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    previousStatus: attendanceStatusEnum("previous_status"),
    newStatus: attendanceStatusEnum("new_status"),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
  },
  (table) => [
    index("attendance_change_logs_employee_date_idx").on(table.employeeId, table.date),
    index("attendance_change_logs_org_date_idx").on(table.organizationId, table.date),
    index("attendance_change_logs_changed_at_idx").on(table.changedAt),
  ]
);

export const leaveGrants = pgTable(
  "leave_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: leaveGrantTypeEnum("type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("leave_grants_employee_idx").on(table.employeeId),
    index("leave_grants_org_idx").on(table.organizationId),
  ]
);

export const employeeAdvances = pgTable(
  "employee_advances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date").notNull(),
    givenBy: uuid("given_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("employee_advances_employee_idx").on(table.employeeId),
    index("employee_advances_org_idx").on(table.organizationId),
    index("employee_advances_date_idx").on(table.date),
  ]
);
