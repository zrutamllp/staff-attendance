"use client";

import type { BackupPreview } from "@/types/views";
import type { FlashMessage } from "@/types/ui";
import { getErrorMessage } from "@/lib/errors";
import {
  backupDownloadName,
  formatBackupLabel,
  getBackupDateRange,
  type BackupPeriod,
} from "@/lib/backup-range";
import { getLocalDateString } from "@/lib/auto-present";
import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Toast } from "@/components/ui/UIStates";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PERIOD_OPTIONS: { id: BackupPeriod; label: string; description: string }[] = [
  {
    id: "weekly",
    label: "Weekly",
    description: "Mon–Sun week containing the selected date",
  },
  {
    id: "monthly",
    label: "Monthly",
    description: "All attendance for one calendar month",
  },
  {
    id: "yearly",
    label: "Yearly",
    description: "Full year attendance snapshot",
  },
];

export default function AdminBackupPage() {
  const now = new Date();
  const [period, setPeriod] = useState<BackupPeriod>("yearly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [weekDate, setWeekDate] = useState(getLocalDateString());
  const [toast, setToast] = useState<FlashMessage | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [restoreMode, setRestoreMode] = useState("merge");
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportRange = useMemo(
    () =>
      getBackupDateRange({
        period,
        year,
        month: period === "monthly" ? month : undefined,
        weekDate: period === "weekly" ? weekDate : undefined,
      }),
    [period, year, month, weekDate]
  );

  async function exportBackup() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        period,
        year: String(year),
      });
      if (period === "monthly") params.set("month", String(month));
      if (period === "weekly") params.set("weekDate", weekDate);

      const res = await fetch(`/api/admin?${params}`, { method: "PUT" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Export failed");
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backupDownloadName(exportRange);
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "Backup exported", type: "success" });
    } catch (err) {
      setToast({ message: getErrorMessage(err, "Export failed"), type: "error" });
    } finally {
      setExporting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.year || !Array.isArray(data.employees)) {
        setToast({
          message: "This backup file is invalid or corrupted.",
          type: "error",
        });
        return;
      }

      const range = getBackupDateRange({
        period: data.period || "yearly",
        year: data.year,
        month: data.month,
        weekDate: data.weekStart || data.startDate,
      });

      setBackupPreview({
        period: data.period || "yearly",
        year: data.year,
        month: data.month,
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        startDate: data.startDate || range.startDate,
        endDate: data.endDate || range.endDate,
        label: formatBackupLabel({
          ...range,
          period: data.period || "yearly",
          year: data.year,
          month: data.month,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          startDate: data.startDate || range.startDate,
          endDate: data.endDate || range.endDate,
        }),
        employees: data.employees.length,
        managers: data.managers?.length ?? 0,
        attendance: data.attendance?.length ?? 0,
        data,
      });
    } catch {
      setToast({
        message: "This backup file is invalid or corrupted.",
        type: "error",
      });
    }

    e.target.value = "";
  }

  async function handleRestore() {
    if (!backupPreview?.data) return;
    const rangeLabel =
      backupPreview.label ||
      formatBackupLabel(
        getBackupDateRange({
          period: backupPreview.period || "yearly",
          year: backupPreview.year,
          month: backupPreview.month,
          weekDate: backupPreview.weekStart,
        })
      );

    if (
      !confirm(
        `Restore ${backupPreview.period || "yearly"} backup (${rangeLabel}) using ${restoreMode} mode?\n\nThis will modify your organization data.`
      )
    ) {
      return;
    }

    setRestoring(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          backup: backupPreview.data,
          mode: restoreMode,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Restore failed");
      setToast({
        message: `Restore complete — ${result.employeesUpserted} employees, ${result.attendanceUpserted} attendance records`,
        type: "success",
      });
      setBackupPreview(null);
    } catch (err) {
      setToast({ message: getErrorMessage(err), type: "error" });
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Backup & Restore</h1>
        <p className="text-sm text-muted">
          Export and restore organization data by week, month, or year
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Export Backup</h2>

          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                  period === id
                    ? "bg-charcoal text-white"
                    : "bg-surface text-muted hover:text-charcoal"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted">
            {PERIOD_OPTIONS.find((option) => option.id === period)?.description}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
                className="input-field"
                min={2020}
                max={2035}
              />
            </div>

            {period === "monthly" && (
              <div>
                <label className="mb-1.5 block text-xs text-muted">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  className="input-field"
                >
                  {MONTHS.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {period === "weekly" && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs text-muted">Week containing date</label>
                <input
                  type="date"
                  value={weekDate}
                  onChange={(e) => setWeekDate(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface px-4 py-3 text-sm">
            <p className="text-xs text-muted">Export range</p>
            <p className="mt-1 font-medium text-charcoal">{formatBackupLabel(exportRange)}</p>
            <p className="mt-1 text-xs text-muted">
              {exportRange.startDate} → {exportRange.endDate}
            </p>
          </div>

          <button
            onClick={exportBackup}
            disabled={exporting}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={18} />
            {exporting ? "Exporting..." : "Export JSON"}
          </button>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Restore Backup</h2>
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-stone-300 bg-surface px-6 py-10 text-center">
            <Upload size={32} className="text-muted" />
            <span className="mt-3 text-sm font-medium">Upload backup JSON</span>
            <span className="mt-1 text-xs text-muted">
              Weekly, monthly, and yearly files supported
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {backupPreview && (
            <div className="rounded-2xl bg-surface p-4 text-sm">
              <p className="font-medium">Backup contains:</p>
              <ul className="mt-2 space-y-1 text-muted">
                <li className="capitalize">Period: {backupPreview.period || "yearly"}</li>
                <li>Range: {backupPreview.label || backupPreview.year}</li>
                {backupPreview.startDate && backupPreview.endDate && (
                  <li>
                    Dates: {backupPreview.startDate} → {backupPreview.endDate}
                  </li>
                )}
                <li>Employees: {backupPreview.employees}</li>
                <li>Managers: {backupPreview.managers}</li>
                <li>Attendance records: {backupPreview.attendance}</li>
              </ul>
              <div className="mt-4 flex gap-2">
                {["merge", "overwrite"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRestoreMode(mode)}
                    className={`rounded-full px-3 py-1 text-xs capitalize ${
                      restoreMode === mode
                        ? "bg-charcoal text-white"
                        : "bg-surface-elevated text-muted"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {restoring ? "Restoring..." : "Confirm Restore"}
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
