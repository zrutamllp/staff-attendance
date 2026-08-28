import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function patchFile(relPath, patchFn) {
  const full = path.join(root, relPath);
  const original = readFileSync(full, "utf8");
  const next = patchFn(original);
  if (next !== original) {
    writeFileSync(full, next, "utf8");
    console.log("patched", relPath);
  }
}

// --- attendance-service.ts ---
patchFile("src/services/attendance-service.ts", (content) => {
  if (content.includes("import type { SessionUser }")) return content;

  const imports = `import type { SessionUser, AttendanceStatus, AttendanceTotals } from "@/types/session";
import type { Employee } from "@/types/domain";

type AttendanceRecordMap = Record<string, AttendanceStatus | null>;
type EmployeeRecordMap = Record<string, AttendanceRecordMap>;
type EmployeeStatusFilter = "active" | "exited";

`;

  content = imports + content;

  const replacements = [
    ["async function hasLeaveGrantForDate(employeeId, date, type)", "async function hasLeaveGrantForDate(employeeId: string, date: string, type: AttendanceStatus)"],
    ["async function getOrganizationDefaultOwnerId(organizationId)", "async function getOrganizationDefaultOwnerId(organizationId: string)"],
    ["export async function getEmployeesForUser(user, { status } = {})", "export async function getEmployeesForUser(user: SessionUser, { status }: { status?: EmployeeStatusFilter } = {})"],
    ["export async function getEmployeeById(user, employeeId)", "export async function getEmployeeById(user: SessionUser, employeeId: string)"],
    ["export async function createEmployee(user, { name, joiningDate })", "export async function createEmployee(user: SessionUser, { name, joiningDate }: { name: string; joiningDate: string })"],
    ["export async function updateEmployee(user, employeeId, data)", "export async function updateEmployee(user: SessionUser, employeeId: string, data: { name?: string; joiningDate?: string })"],
    ["export async function exitEmployee(user, employeeId, exitDate, exitTime)", "export async function exitEmployee(user: SessionUser, employeeId: string, exitDate: string, exitTime: string | null)"],
    ["export async function deleteEmployee(user, employeeId)", "export async function deleteEmployee(user: SessionUser, employeeId: string)"],
    ["export async function getAttendanceForMonth(user, year, month, employeeIds)", "export async function getAttendanceForMonth(user: SessionUser, year: number, month: number, employeeIds: string[])"],
    ["export async function getLatestChangeMapForMonth(user, year, month, employeeIds)", "export async function getLatestChangeMapForMonth(user: SessionUser, year: number, month: number, employeeIds: string[])"],
    ["export async function getAttendanceChangeLogsForMonth(user, year, month)", "export async function getAttendanceChangeLogsForMonth(user: SessionUser, year: number, month: number)"],
    ["export async function setAttendance(user, employeeId, date, status)", "export async function setAttendance(user: SessionUser, employeeId: string, date: string, status: AttendanceStatus | null)"],
    ["export async function getLeaveBalances(employeeId, dateStr)", "export async function getLeaveBalances(employeeId: string, dateStr: string)"],
    ["export async function getLeaveGrantsForEmployee(user, employeeId)", "export async function getLeaveGrantsForEmployee(user: SessionUser, employeeId: string)"],
    ["export async function getAdvancesForEmployee(user, employeeId)", "export async function getAdvancesForEmployee(user: SessionUser, employeeId: string)"],
    ["export async function getAdvanceSummary(user, employeeId, referenceDate)", "export async function getAdvanceSummary(user: SessionUser, employeeId: string, referenceDate?: string)"],
    ["export async function getDashboardStats(user)", "export async function getDashboardStats(user: SessionUser)"],
    ["export async function getManagers(user)", "export async function getManagers(user: SessionUser)"],
    ["export async function deactivateManager(adminUser, managerId)", "export async function deactivateManager(adminUser: SessionUser, managerId: string)"],
    ["export async function transferEmployee(adminUser, employeeId, newManagerId)", "export async function transferEmployee(adminUser: SessionUser, employeeId: string, newManagerId: string)"],
    ["export async function getOrgAnalytics(user)", "export async function getOrgAnalytics(user: SessionUser)"],
    ["export async function exportYearBackup(user, year)", "export async function exportYearBackup(user: SessionUser, year: number)"],
    ["export async function getEmployeeWithManager(user, employeeId)", "export async function getEmployeeWithManager(user: SessionUser, employeeId: string)"],
    ["export async function getEmployeesWithManagers(user, options = {})", "export async function getEmployeesWithManagers(user: SessionUser, options: { status?: EmployeeStatusFilter } = {})"],
    ["export async function restoreBackup(adminUser, data, mode = \"merge\")", "export async function restoreBackup(adminUser: SessionUser, data: Record<string, unknown>, mode: \"merge\" | \"replace\" = \"merge\")"],
    ["export async function transferEmployees(adminUser, employeeIds, newManagerId)", "export async function transferEmployees(adminUser: SessionUser, employeeIds: string[], newManagerId: string)"],
    ["export async function getManagerDetail(adminUser, managerId)", "export async function getManagerDetail(adminUser: SessionUser, managerId: string)"],
    ["export async function updateManager(adminUser, managerId, data)", "export async function updateManager(adminUser: SessionUser, managerId: string, data: { name?: string; phone?: string; password?: string; status?: \"active\" | \"inactive\" })"],
    ["export async function getEmployeeAttendanceHistory(user, employeeId, year)", "export async function getEmployeeAttendanceHistory(user: SessionUser, employeeId: string, year: number)"],
    ["export async function getEmployeeAssignmentHistory(user, employeeId)", "export async function getEmployeeAssignmentHistory(user: SessionUser, employeeId: string)"],
    ["export async function getReport(user, type, params)", "export async function getReport(user: SessionUser, type: string, params: Record<string, string | undefined>)"],
    ["export async function getEmployeesFiltered(user, filters = {})", "export async function getEmployeesFiltered(user: SessionUser, filters: Record<string, string | undefined> = {})"],
    ["const updates = {};", "const updates: Partial<{ name: string; joiningDate: string; updatedAt: Date }> = {};"],
    ["const managerUpdates = {};", "const managerUpdates: Partial<{ name: string; phone: string; passwordHash: string; status: \"active\" | \"inactive\" }> = {};"],
    ["const recordMap = {};", "const recordMap: EmployeeRecordMap = {};"],
    ["const changeMap = {};", "const changeMap: Record<string, { changedBy: string; changedByName: string; changedAt: Date }> = {};"],
    ["const empMap = {};", "const empMap: AttendanceRecordMap = {};"],
    ["let todayRecords = [];", "let todayRecords: { employeeId: string; status: AttendanceStatus | null }[] = [];"],
    ["let existingRecords = [];", "let existingRecords: { employeeId: string; date: string; status: AttendanceStatus }[] = [];"],
  ];

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  // reactivateEmployee and createManager / createLeaveGrant / createEmployeeAdvance - multiline
  content = content.replace(
    /export async function reactivateEmployee\(\s*\n\s*user,/,
    "export async function reactivateEmployee(\n  user: SessionUser,"
  );
  content = content.replace(
    /export async function createManager\(user, \{ name, phone, password \}\)/,
    "export async function createManager(user: SessionUser, { name, phone, password }: { name: string; phone: string; password: string })"
  );
  content = content.replace(
    /export async function createLeaveGrant\(\s*\n\s*user,/,
    "export async function createLeaveGrant(\n  user: SessionUser,"
  );
  content = content.replace(
    /export async function createEmployeeAdvance\(\s*\n\s*user,/,
    "export async function createEmployeeAdvance(\n  user: SessionUser,"
  );

  return content;
});

// --- client tsx: toast + error patterns ---
const tsxFiles = walk(path.join(root, "src"));

for (const file of tsxFiles) {
  let content = readFileSync(file, "utf8");
  let changed = false;

  if (content.includes("const [toast, setToast] = useState(null)")) {
    if (!content.includes('from "@/types/ui"')) {
      content = content.replace(
        /^(\"use client\";\n\n)?/,
        (m) => `${m || ""}import type { FlashMessage } from "@/types/ui";\n`
      );
    }
    content = content.replace(
      /const \[toast, setToast\] = useState\(null\)/g,
      "const [toast, setToast] = useState<FlashMessage | null>(null)"
    );
    changed = true;
  }

  if (content.includes("const [error, setError] = useState(null)")) {
    content = content.replace(
      /const \[error, setError\] = useState\(null\)/g,
      "const [error, setError] = useState<string | null>(null)"
    );
    changed = true;
  }

  if (content.match(/catch \(err\) \{[\s\S]*?err\.message/) && !content.includes('from "@/lib/errors"')) {
    content = content.replace(
      /^(import .+\n)(?!import type \{ FlashMessage)/m,
      "$1import { getErrorMessage } from \"@/lib/errors\";\n"
    );
    content = content.replace(/setError\(err\.message\)/g, "setError(getErrorMessage(err))");
    content = content.replace(/setToast\(\{ message: err\.message/g, "setToast({ message: getErrorMessage(err");
    changed = true;
  }

  if (changed) {
    writeFileSync(file, content, "utf8");
    console.log("patched", path.relative(root, file));
  }
}

console.log("done");
