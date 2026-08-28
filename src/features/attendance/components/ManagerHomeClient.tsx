"use client";

import Link from "next/link";
import ViewportPage from "@/components/layout/ViewportPage";
import { EmptyState } from "@/components/ui/UIStates";

interface DashboardStats {
  totalEmployees: number;
  todayTotals: { P: number; A: number; L: number; SL: number; H: number };
  exceptionsToday?: number;
  remainingToday?: number;
  monthTotals: { percentage: number };
}

interface ManagerHomeClientProps {
  stats: DashboardStats | null;
  userName: string;
  greeting: string;
  today: string;
}

export default function ManagerHomeClient({
  stats,
  userName,
  greeting,
  today,
}: ManagerHomeClientProps) {
  return (
    <ViewportPage
      header={
        <header>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-xl font-semibold text-charcoal md:text-2xl">{userName}</h1>
          <p className="mt-0.5 text-sm text-muted">{today}</p>
        </header>
      }
    >
      {!stats || stats.totalEmployees === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first employee to start tracking attendance."
          action={
            <Link href="/manager/employees/add" className="btn-primary">
              Add Employee
            </Link>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
          <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card !p-3 md:!p-4">
              <p className="text-xs text-muted">Active Employees</p>
              <p className="mt-0.5 text-2xl font-semibold md:text-3xl">
                {stats.totalEmployees}
              </p>
            </div>
            <div className="card !p-3 md:!p-4">
              <p className="text-xs text-muted">Present Today</p>
              <p className="mt-0.5 text-2xl font-semibold md:text-3xl">
                {stats.todayTotals.P}
              </p>
            </div>
            <div className="card !p-3 md:!p-4">
              <p className="text-xs text-muted">Exceptions Today</p>
              <p className="mt-0.5 text-2xl font-semibold md:text-3xl">
                {stats.exceptionsToday ?? stats.remainingToday}
              </p>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 md:gap-4">
            <div className="card flex flex-col justify-between !p-3 md:!p-4">
              <div>
                <p className="text-xs text-muted">Default: everyone Present</p>
                <p className="text-sm text-muted">Mark only absent, leave, or sick leave</p>
              </div>
              <Link
                href="/manager/attendance"
                className="btn-primary mt-3 shrink-0 text-center !py-2.5"
              >
                Mark Attendance
              </Link>
            </div>

            <div className="card !p-3 md:!p-4">
              <h2 className="text-sm font-semibold text-charcoal">Today&apos;s Summary</h2>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                {[
                  { label: "Present", value: stats.todayTotals.P, color: "text-present" },
                  { label: "Absent", value: stats.todayTotals.A, color: "text-absent" },
                  { label: "Leave", value: stats.todayTotals.L, color: "text-leave" },
                  {
                    label: "Sick",
                    value: stats.todayTotals.SL ?? 0,
                    color: "text-orange-700",
                  },
                  { label: "Half", value: stats.todayTotals.H, color: "text-halfday" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className={`text-lg font-semibold md:text-xl ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card !p-3 md:col-span-2 md:!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">This Month</p>
                  <p className="text-xl font-semibold md:text-2xl">
                    {stats.monthTotals.percentage}%
                  </p>
                  <p className="text-xs text-muted">Average attendance</p>
                </div>
                <Link
                  href="/manager/reports"
                  className="text-sm font-medium text-present hover:underline"
                >
                  View report →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </ViewportPage>
  );
}
