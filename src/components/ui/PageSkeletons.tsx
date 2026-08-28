export function PageHeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-7 w-40 rounded-lg bg-surface" />
      <div className="h-4 w-56 rounded-lg bg-surface" />
    </div>
  );
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card animate-pulse !p-3 md:!p-4">
      <div className="h-3 w-24 rounded bg-surface" />
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`rounded bg-surface ${i === 0 ? "mt-3 h-8 w-16" : "mt-2 h-4 w-full"}`}
        />
      ))}
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="page-container">
      <PageHeaderSkeleton />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 md:gap-4">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={3} />
          <div className="md:col-span-2">
            <CardSkeleton lines={2} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse !p-3 md:!p-4">
      <div className="mb-3 h-4 w-32 rounded bg-surface" />
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-8 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}

export function AttendancePageSkeleton() {
  return (
    <div className="page-container">
      <PageHeaderSkeleton />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
        <div className="shrink-0 space-y-2">
          <div className="h-10 animate-pulse rounded-2xl bg-surface" />
          <div className="flex gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-9 w-9 animate-pulse rounded-full bg-surface" />
            ))}
          </div>
        </div>
        <div className="h-10 animate-pulse rounded-2xl bg-surface" />
        <div className="min-h-0 flex-1 space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card h-14 animate-pulse !p-3" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmployeesPageSkeleton() {
  return (
    <div className="page-container">
      <PageHeaderSkeleton />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
        <div className="h-10 animate-pulse rounded-2xl bg-surface" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-surface" />
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="page-container">
      <PageHeaderSkeleton />
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <CardSkeleton lines={6} />
      </div>
    </div>
  );
}
