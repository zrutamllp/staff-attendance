"use client";

import dynamic from "next/dynamic";
import type { OrgAnalytics } from "@/types/analytics";

const AdminOverviewCharts = dynamic(
  () => import("@/features/admin/components/AdminOverviewCharts"),
  {
    loading: () => (
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card h-72 animate-pulse bg-surface" />
        ))}
      </div>
    ),
    ssr: false,
  }
);

export default function AdminOverviewClient({
  analytics,
}: {
  analytics: OrgAnalytics;
}) {
  const kpis = [
    { label: "Total Managers", value: analytics.totalManagers },
    { label: "Active Managers", value: analytics.activeManagers },
    { label: "Total Employees", value: analytics.totalEmployees },
    { label: "Active Employees", value: analytics.activeEmployees },
    { label: "Exited Employees", value: analytics.exitedEmployees },
    {
      label: "This Month Attendance",
      value: `${analytics.monthTotals.percentage}%`,
    },
  ];

  return (
    <div className="admin-page">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-charcoal sm:text-3xl">
          Organization Overview
        </h1>
        <p className="text-sm text-muted">
          Organization-wide attendance and team metrics
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {kpis.map(({ label, value }) => (
          <div key={label} className="card">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold sm:text-3xl">{value}</p>
          </div>
        ))}
      </div>

      <AdminOverviewCharts analytics={analytics} />

      <div className="card mt-6 sm:mt-8">
        <h2 className="mb-2 text-sm font-semibold sm:mb-4">Manager Breakdown</h2>
        <p className="table-scroll-hint">Swipe horizontally to see all columns</p>
        <div className="table-scroll">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-muted">
                <th className="py-3 pr-4">Manager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {analytics.managerStats.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4 font-medium">{m.name}</td>
                  <td className="px-4 py-3 capitalize">{m.status}</td>
                  <td className="px-4 py-3">{m.employeeCount}</td>
                  <td className="px-4 py-3 font-semibold">{m.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
