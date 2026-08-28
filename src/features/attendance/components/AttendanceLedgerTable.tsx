"use client";

import StatusStamp from "@/features/attendance/components/StatusStamp";

export default function AttendanceLedgerTable({ grid, year, month }) {
  const today = new Date();

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const todayDay = isCurrentMonth ? today.getDate() : null;

  const daysInMonth = grid[0]?.days?.length ?? 0;

  return (
    <div className="card">
      <p className="table-scroll-hint">Swipe horizontally to view the full month grid</p>
      <div className="table-scroll">
        <table className="w-full min-w-[900px] text-left text-xs">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="sticky left-0 z-10 bg-surface-elevated py-3 pr-4 pl-2">
              Employee
            </th>

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;

              const isToday = day === todayDay;

              return (
                <th
                  key={day}

                  className={`px-0.5 py-3 text-center font-mono ${
                    isToday ? "ring-1 ring-charcoal ring-inset" : ""
                  }`}
                >
                  {day}
                </th>
              );
            })}

            <th className="px-2 py-3">P</th>

            <th className="px-2 py-3">A</th>

            <th className="px-2 py-3">L</th>

            <th className="px-2 py-3">SL</th>

            <th className="px-2 py-3">H</th>

            <th className="px-2 py-3">%</th>
          </tr>
        </thead>

        <tbody>
          {grid.map(({ employee, days, totals }) => (
            <tr key={employee.id} className="border-b border-stone-100">
              <td className="sticky left-0 z-10 bg-surface-elevated py-2 pr-4 pl-2 font-medium">
                {employee.name}
              </td>

              {days.map((d) => (
                <td key={d.date} className="px-0.5 py-2 text-center">
                  <StatusStamp
                    status={d.status}

                    date={d.date}

                    employed={d.employed}

                    size="sm"
                  />
                </td>
              ))}

              <td className="px-2 py-2">{totals.P}</td>

              <td className="px-2 py-2">{totals.A}</td>

              <td className="px-2 py-2">{totals.L}</td>

              <td className="px-2 py-2">{totals.SL ?? 0}</td>

              <td className="px-2 py-2">{totals.H}</td>

              <td className="px-2 py-2 font-semibold">{totals.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
