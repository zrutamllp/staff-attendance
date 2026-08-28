"use client";

import { useCallback, useState } from "react";
import MonthSelector from "@/features/attendance/components/MonthSelector";
import { Download } from "lucide-react";
import ViewportPage from "@/components/layout/ViewportPage";
import { ErrorState } from "@/components/ui/UIStates";
import type { MonthlyReport } from "@/types/views";
import { useCachedFetch } from "@/hooks/useCachedFetch";

interface ReportsPageClientProps {
  initialYear: number;
  initialMonth: number;
  initialReport: MonthlyReport;
}

export default function ReportsPageClient({
  initialYear,
  initialMonth,
  initialReport,
}: ReportsPageClientProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const cacheKey = `report:${year}:${month}`;
  const fetchReport = useCallback(async () => {
    const res = await fetch(`/api/reports?type=monthly&year=${year}&month=${month}`);
    if (!res.ok) throw new Error("Failed to load report");
    return res.json() as Promise<MonthlyReport>;
  }, [year, month]);

  const useInitial =
    year === initialYear && month === initialMonth ? initialReport : undefined;

  const { data: report, error, isRefreshing, refresh } = useCachedFetch(
    cacheKey,
    fetchReport,
    { initialData: useInitial }
  );

  return (
    <ViewportPage
      header={
        <header>
          <h1 className="text-xl font-semibold text-charcoal md:text-2xl">Reports</h1>
          <p className="text-sm text-muted">Monthly attendance summary</p>
        </header>
      }
    >
      <div
        className={`card flex min-h-0 flex-1 flex-col space-y-3 !p-3 transition-opacity md:!p-4 ${isRefreshing ? "opacity-70" : ""}`}
      >
        <MonthSelector
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />

        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : report ? (
          <dl className="grid grid-cols-2 gap-2 text-sm md:gap-3">
            <div>
              <dt className="text-muted">Employees</dt>
              <dd className="text-lg font-semibold">{report.totalEmployees}</dd>
            </div>
            <div>
              <dt className="text-muted">Marked days</dt>
              <dd className="text-lg font-semibold">{report.marked}</dd>
            </div>
            <div>
              <dt className="text-muted">Present</dt>
              <dd className="text-lg font-semibold text-present">{report.P}</dd>
            </div>
            <div>
              <dt className="text-muted">Absent</dt>
              <dd className="text-lg font-semibold text-absent">{report.A}</dd>
            </div>
            <div>
              <dt className="text-muted">Leave</dt>
              <dd className="text-lg font-semibold">{report.L}</dd>
            </div>
            <div>
              <dt className="text-muted">Half-day</dt>
              <dd className="text-lg font-semibold">{report.H}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted">Average attendance</dt>
              <dd className="text-xl font-semibold md:text-2xl">{report.percentage}%</dd>
            </div>
          </dl>
        ) : null}

        <button
          onClick={() =>
            window.open(`/api/export/csv?year=${year}&month=${month}`, "_blank")
          }
          className="btn-primary mt-auto flex w-full shrink-0 items-center justify-center gap-2 !py-2.5"
        >
          <Download size={18} />
          Export CSV (attendance + change log)
        </button>
      </div>
    </ViewportPage>
  );
}
