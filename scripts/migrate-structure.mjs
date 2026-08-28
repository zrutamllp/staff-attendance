/**
 * One-time migration: restructure to feature folders + TypeScript extensions.
 * Run: node scripts/migrate-structure.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");

const moves = [
  // attendance feature
  ["components/AttendanceMarkingList.js", "features/attendance/components/AttendanceMarkingList.tsx"],
  ["components/AttendanceLedgerTable.js", "features/attendance/components/AttendanceLedgerTable.tsx"],
  ["components/AttendanceStatusPicker.js", "features/attendance/components/AttendanceStatusPicker.tsx"],
  ["components/AttendanceOverwriteModal.js", "features/attendance/components/AttendanceOverwriteModal.tsx"],
  ["components/MonthSelector.js", "features/attendance/components/MonthSelector.tsx"],
  ["components/StatusStamp.js", "features/attendance/components/StatusStamp.tsx"],
  ["components/LeaveGrantModal.js", "features/attendance/components/LeaveGrantModal.tsx"],
  ["hooks/useOptimisticAttendance.js", "features/attendance/hooks/useOptimisticAttendance.ts"],
  ["lib/attendance-client.js", "features/attendance/lib/attendance-client.ts"],

  // employees feature
  ["components/AddEmployeeForm.js", "features/employees/components/AddEmployeeForm.tsx"],
  ["components/EmployeeAdvancesSection.js", "features/employees/components/EmployeeAdvancesSection.tsx"],
  ["components/RestoreEmployeeModal.js", "features/employees/components/RestoreEmployeeModal.tsx"],
  ["components/FutureJoinDateNotice.js", "features/employees/components/FutureJoinDateNotice.tsx"],

  // admin feature
  ["components/AdminSidebar.js", "features/admin/components/AdminSidebar.tsx"],

  // shared UI / layout
  ["components/UIStates.js", "components/ui/UIStates.tsx"],
  ["components/DateInputField.js", "components/ui/DateInputField.tsx"],
  ["components/Providers.js", "components/layout/Providers.tsx"],
  ["components/ManagerBottomNav.js", "components/layout/ManagerBottomNav.tsx"],

  // services
  ["lib/services/attendance-service.js", "services/attendance-service.ts"],

  // lib (typescript)
  ["lib/attendance.js", "lib/attendance.ts"],
  ["lib/auto-present.js", "lib/auto-present.ts"],
  ["lib/api-auth.js", "lib/api-auth.ts"],
  ["lib/auth.js", "lib/auth.ts"],
  ["lib/permissions.js", "lib/permissions.ts"],
  ["lib/phone.js", "lib/phone.ts"],
  ["lib/db/schema.js", "lib/db/schema.ts"],
  ["lib/db/index.js", "lib/db/index.ts"],
  ["middleware.js", "middleware.ts"],
];

const importReplacements = [
  [/@\/components\/UIStates/g, "@/components/ui/UIStates"],
  [/@\/components\/DateInputField/g, "@/components/ui/DateInputField"],
  [/@\/components\/Providers/g, "@/components/layout/Providers"],
  [/@\/components\/ManagerBottomNav/g, "@/components/layout/ManagerBottomNav"],
  [/@\/components\/AdminSidebar/g, "@/features/admin/components/AdminSidebar"],
  [/@\/components\/AddEmployeeForm/g, "@/features/employees/components/AddEmployeeForm"],
  [/@\/components\/EmployeeAdvancesSection/g, "@/features/employees/components/EmployeeAdvancesSection"],
  [/@\/components\/RestoreEmployeeModal/g, "@/features/employees/components/RestoreEmployeeModal"],
  [/@\/components\/FutureJoinDateNotice/g, "@/features/employees/components/FutureJoinDateNotice"],
  [/@\/components\/AttendanceMarkingList/g, "@/features/attendance/components/AttendanceMarkingList"],
  [/@\/components\/AttendanceLedgerTable/g, "@/features/attendance/components/AttendanceLedgerTable"],
  [/@\/components\/AttendanceStatusPicker/g, "@/features/attendance/components/AttendanceStatusPicker"],
  [/@\/components\/AttendanceOverwriteModal/g, "@/features/attendance/components/AttendanceOverwriteModal"],
  [/@\/components\/MonthSelector/g, "@/features/attendance/components/MonthSelector"],
  [/@\/components\/StatusStamp/g, "@/features/attendance/components/StatusStamp"],
  [/@\/components\/LeaveGrantModal/g, "@/features/attendance/components/LeaveGrantModal"],
  [/@\/hooks\/useOptimisticAttendance/g, "@/features/attendance/hooks/useOptimisticAttendance"],
  [/@\/lib\/attendance-client/g, "@/features/attendance/lib/attendance-client"],
  [/@\/lib\/services\/attendance-service/g, "@/services/attendance-service"],
];

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of importReplacements) {
    out = out.replace(from, to);
  }
  return out;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "features") continue;
      walk(full, files);
    } else if (name.endsWith(".js") || name.endsWith(".jsx")) {
      files.push(full);
    }
  }
  return files;
}

// Move mapped files
for (const [fromRel, toRel] of moves) {
  const from = path.join(src, fromRel);
  const to = path.join(src, toRel);
  if (!fs.existsSync(from)) {
    console.warn("Skip missing:", fromRel);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  let content = fs.readFileSync(from, "utf8");
  content = applyReplacements(content);
  fs.writeFileSync(to, content);
  fs.unlinkSync(from);
  console.log("Moved:", fromRel, "->", toRel);
}

// Rename remaining app/ files: page.js -> page.tsx, layout.js -> layout.tsx, route.js -> route.ts
const appFiles = walk(path.join(src, "app"));
for (const file of appFiles) {
  let content = fs.readFileSync(file, "utf8");
  content = applyReplacements(content);
  const base = path.basename(file);
  const dir = path.dirname(file);
  let ext = ".ts";
  if (base === "page.js" || base === "layout.js") ext = ".tsx";
  else if (base === "route.js") ext = ".ts";
  else if (content.includes("React") || content.includes('use client') || content.includes("<")) ext = ".tsx";
  const newPath = path.join(dir, base.replace(/\.js$/, ext));
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(file);
  console.log("Renamed:", path.relative(src, file), "->", path.relative(src, newPath));
}

// Update all ts/tsx files with import replacements
function walkTs(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walkTs(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      const content = fs.readFileSync(full, "utf8");
      const updated = applyReplacements(content);
      if (updated !== content) fs.writeFileSync(full, updated);
    }
  }
}
walkTs(src);

// Remove empty lib/services if exists
const servicesDir = path.join(src, "lib", "services");
if (fs.existsSync(servicesDir) && fs.readdirSync(servicesDir).length === 0) {
  fs.rmdirSync(servicesDir);
}

console.log("Migration complete.");
