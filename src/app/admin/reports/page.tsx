"use client";

import { useEffect, useState } from "react";
import MonthSelector from "@/features/attendance/components/MonthSelector";
import { Download } from "lucide-react";
import LoadingSpinner, { ErrorState } from "@/components/ui/UIStates";
import type { MonthlyReport } from "@/types/views";
import { getErrorMessage } from "@/lib/errors";

const REPORT_TYPES = [
  { id: "monthly", label: "Monthly Summary" },
  { id: "manager-comparison", label: "Manager Comparison" },
  { id: "yearly", label: "Yearly Trend" },
];

export default function AdminReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [reportType, setReportType] = useState("monthly");
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: reportType,
        year: String(year),
      });
      if (reportType !== "yearly") params.set("month", String(month));

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to load report");
      setReport(await res.json());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [reportType, year, month]);

  return (
    <div className="admin-page">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Reports</h1>
        <p className="text-sm text-muted">Organization-wide reports and exports</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {REPORT_TYPES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setReportType(id)}
            className={`rounded-full px-4 py-2 text-xs font-medium ${
              reportType === id ? "bg-charcoal text-white" : "bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="font-semibold">Period</h2>
          {reportType !== "yearly" ? (
            <MonthSelector
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          ) : (
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="input-field"
            />
          )}
          <a
            href={`/api/export/csv?year=${year}&month=${month}`}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Export CSV (attendance + change log)
          </a>
        </div>

        <div className="card">
          {loading ? (
            <LoadingSpinner message="Loading report..." />
          ) : error ? (
            <ErrorState message={error} onRetry={loadReport} />
          ) : reportType === "monthly" && report ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total employees</dt>
                <dd>{report.totalEmployees}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Working days marked</dt>
                <dd>{report.marked}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Present</dt>
                <dd>{report.P}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Absent</dt>
                <dd>{report.A}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Leave</dt>
                <dd>{report.L}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Half-day</dt>
                <dd>{report.H}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Average attendance</dt>
                <dd>{report.percentage}%</dd>
              </div>
            </dl>
          ) : reportType === "manager-comparison" && report?.managers ? (
            <div className="table-scroll">
              <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-muted">
                  <th className="py-2">Manager</th>
                  <th className="py-2">Employees</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {report.managers.map((m) => (
                  <tr key={m.id} className="border-b border-stone-100">
                    <td className="py-2">{m.name}</td>
                    <td className="py-2">{m.employeeCount}</td>
                    <td className="py-2 font-semibold">{m.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : reportType === "yearly" && report?.months ? (
            <div className="table-scroll">
              <table className="w-full min-w-[280px] text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-muted">
                  <th className="py-2">Month</th>
                  <th className="py-2">P</th>
                  <th className="py-2">A</th>
                  <th className="py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {report.months.map((m) => (
                  <tr key={m.month} className="border-b border-stone-100">
                    <td className="py-2">{m.month}</td>
                    <td className="py-2">{m.P}</td>
                    <td className="py-2">{m.A}</td>
                    <td className="py-2 font-semibold">{m.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
