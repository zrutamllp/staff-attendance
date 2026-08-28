"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { OrgAnalytics } from "@/types/analytics";

const COLORS = ["#2d6a5a", "#b54a4a", "#c4843a", "#c2410c", "#5a6b7a"];

export default function AdminOverviewCharts({
  analytics,
}: {
  analytics: OrgAnalytics;
}) {
  const distribution = [
    { name: "Present", value: analytics.monthTotals.P },
    { name: "Absent", value: analytics.monthTotals.A },
    { name: "Leave", value: analytics.monthTotals.L },
    { name: "Sick leave", value: analytics.monthTotals.SL ?? 0 },
    { name: "Half-day", value: analytics.monthTotals.H },
  ];

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="mb-4 text-sm font-semibold">Attendance Distribution</h2>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
              >
                {distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 text-sm font-semibold">Manager Performance</h2>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.managerStats} margin={{ bottom: 8 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="percentage" fill="#2d6a5a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
