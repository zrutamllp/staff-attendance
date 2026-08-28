import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const stateFixes = [
  {
    file: "src/app/admin/employees/page.tsx",
    imports: `import type { Employee } from "@/types/domain";\nimport { getErrorMessage } from "@/lib/errors";\n`,
    replacements: [
      ["const [employees, setEmployees] = useState([])", "const [employees, setEmployees] = useState<Employee[]>([])"],
      ["const [restoreEmp, setRestoreEmp] = useState(null)", "const [restoreEmp, setRestoreEmp] = useState<Employee | null>(null)"],
    ],
  },
  {
    file: "src/app/manager/employees/page.tsx",
    imports: `import type { Employee } from "@/types/domain";\n`,
    replacements: [
      ["const [employees, setEmployees] = useState([])", "const [employees, setEmployees] = useState<Employee[]>([])"],
      ["const [restoreEmp, setRestoreEmp] = useState(null)", "const [restoreEmp, setRestoreEmp] = useState<Employee | null>(null)"],
    ],
  },
  {
    file: "src/app/admin/managers/page.tsx",
    imports: `import type { ManagerListRow } from "@/types/views";\n`,
    replacements: [
      ["const [managers, setManagers] = useState([])", "const [managers, setManagers] = useState<ManagerListRow[]>([])"],
    ],
  },
  {
    file: "src/app/admin/managers/[id]/page.tsx",
    imports: `import type { ManagerDetailData } from "@/types/views";\n`,
    replacements: [
      ["const [manager, setManager] = useState(null)", "const [manager, setManager] = useState<ManagerDetailData | null>(null)"],
    ],
  },
  {
    file: "src/app/admin/reports/page.tsx",
    imports: `import type { MonthlyReport } from "@/types/views";\n`,
    replacements: [
      ["const [report, setReport] = useState(null)", "const [report, setReport] = useState<MonthlyReport | null>(null)"],
    ],
  },
  {
    file: "src/app/manager/reports/page.tsx",
    imports: `import type { MonthlyReport } from "@/types/views";\n`,
    replacements: [
      ["const [report, setReport] = useState(null)", "const [report, setReport] = useState<MonthlyReport | null>(null)"],
    ],
  },
  {
    file: "src/app/admin/backup/page.tsx",
    imports: `import type { BackupPreview } from "@/types/views";\n`,
    replacements: [
      ["const [backupPreview, setBackupPreview] = useState(null)", "const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null)"],
    ],
  },
  {
    file: "src/app/admin/attendance/page.tsx",
    imports: `import type { AttendancePickerState, GrantModalState, EditPolicyState } from "@/types/views";\nimport type { AttendanceGridRow } from "@/types/views";\n`,
    replacements: [
      ["const [picker, setPicker] = useState(null)", "const [picker, setPicker] = useState<AttendancePickerState | null>(null)"],
      ["const [grantModal, setGrantModal] = useState(null)", "const [grantModal, setGrantModal] = useState<GrantModalState | null>(null)"],
      ["const [editPolicy, setEditPolicy] = useState(null)", "const [editPolicy, setEditPolicy] = useState<EditPolicyState | null>(null)"],
      ["const [grid, setGrid] = useState([])", "const [grid, setGrid] = useState<AttendanceGridRow[]>([])"],
    ],
  },
  {
    file: "src/app/manager/attendance/page.tsx",
    imports: `import type { AttendancePickerState, GrantModalState, OverwriteModalState, EditPolicyState, AttendanceGridRow } from "@/types/views";\n`,
    replacements: [
      ["const [picker, setPicker] = useState(null)", "const [picker, setPicker] = useState<AttendancePickerState | null>(null)"],
      ["const [grantModal, setGrantModal] = useState(null)", "const [grantModal, setGrantModal] = useState<GrantModalState | null>(null)"],
      ["const [overwriteModal, setOverwriteModal] = useState(null)", "const [overwriteModal, setOverwriteModal] = useState<OverwriteModalState | null>(null)"],
      ["const [editPolicy, setEditPolicy] = useState(null)", "const [editPolicy, setEditPolicy] = useState<EditPolicyState | null>(null)"],
      ["const [grid, setGrid] = useState([])", "const [grid, setGrid] = useState<AttendanceGridRow[]>([])"],
    ],
  },
  {
    file: "src/app/manager/employees/[id]/page.tsx",
    imports: `import type { EmployeeDetailData } from "@/types/views";\nimport type { Employee } from "@/types/domain";\n`,
    replacements: [
      ["const [employee, setEmployee] = useState(null)", "const [employee, setEmployee] = useState<(Employee & { managerName?: string | null }) | null>(null)"],
      ["const [history, setHistory] = useState(null)", "const [history, setHistory] = useState<EmployeeDetailData['history'] | null>(null)"],
      ["const [assignments, setAssignments] = useState([])", "const [assignments, setAssignments] = useState<NonNullable<EmployeeDetailData['assignments']>>([])"],
    ],
  },
  {
    file: "src/app/admin/settings/page.tsx",
    imports: `import type { SessionProfile } from "@/types/views";\n`,
    replacements: [
      ["const [session, setSession] = useState(null)", "const [session, setSession] = useState<SessionProfile | null>(null)"],
    ],
  },
  {
    file: "src/app/manager/profile/page.tsx",
    imports: `import type { SessionProfile } from "@/types/views";\n`,
    replacements: [
      ["const [session, setSession] = useState(null)", "const [session, setSession] = useState<SessionProfile | null>(null)"],
    ],
  },
  {
    file: "src/features/attendance/hooks/useOptimisticAttendance.ts",
    imports: `import type { AttendanceGridRow } from "@/types/views";\n`,
    replacements: [
      ["const [grid, setGrid] = useState([])", "const [grid, setGrid] = useState<AttendanceGridRow[]>([])"],
    ],
  },
];

for (const { file, imports, replacements } of stateFixes) {
  const full = path.join(root, file);
  let content = readFileSync(full, "utf8");
  let changed = false;

  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
    }
  }

  if (changed && imports && !content.includes(imports.trim().split("\n")[0])) {
    if (content.startsWith('"use client";')) {
      content = content.replace('"use client";\n', `"use client";\n\n${imports}`);
    } else {
      content = imports + content;
    }
  }

  if (changed) {
    writeFileSync(full, content, "utf8");
    console.log("patched", file);
  }
}

console.log("done");
