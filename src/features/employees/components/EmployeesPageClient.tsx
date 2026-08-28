"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import ViewportPage from "@/components/layout/ViewportPage";
import PaginationControls from "@/components/ui/PaginationControls";
import { EmptyState, ErrorState } from "@/components/ui/UIStates";
import RestoreEmployeeModal from "@/features/employees/components/RestoreEmployeeModal";
import { useViewportPagination } from "@/hooks/useViewportPagination";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import { formatTenure } from "@/lib/attendance";
import type { Employee } from "@/types/domain";
import { getErrorMessage } from "@/lib/errors";

interface EmployeesPageClientProps {
  initialEmployees: Employee[];
  initialFilter?: string;
}

export default function EmployeesPageClient({
  initialEmployees,
  initialFilter = "active",
}: EmployeesPageClientProps) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("filter") || initialFilter);
  const [search, setSearch] = useState("");
  const [restoreEmp, setRestoreEmp] = useState<Employee | null>(null);

  const cacheKey = `employees:${filter}`;
  const fetchEmployees = useCallback(async () => {
    const status = filter === "all" ? "" : filter;
    const res = await fetch(`/api/employees${status ? `?status=${status}` : ""}`);
    if (!res.ok) throw new Error("Failed to load employees");
    return res.json() as Promise<Employee[]>;
  }, [filter]);

  const useInitial = filter === initialFilter ? initialEmployees : undefined;
  const { data: employees = [], error, isRefreshing, refresh } = useCachedFetch(
    cacheKey,
    fetchEmployees,
    { initialData: useInitial }
  );

  async function handleRestore({ joiningDate }: { joiningDate: string }) {
    if (!restoreEmp) return;
    const res = await fetch(`/api/employees/${restoreEmp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reactivate", joiningDate }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to restore employee");
    }
    setRestoreEmp(null);
    setFilter("active");
    await refresh();
  }

  const filtered = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [employees, search]
  );

  const pagination = useViewportPagination(filtered);
  const hasEverHadEmployees = filter !== "exited" && employees.length === 0;

  return (
    <ViewportPage
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-charcoal md:text-2xl">
              {filter === "exited" ? "Exited Staff" : "Employees"}
            </h1>
            <p className="text-sm text-muted">
              {filter === "exited"
                ? "Restore exited employees with a new join date"
                : "Organization roster — all managers share the same employees"}
            </p>
          </div>
          {filter !== "exited" && (
            <Link
              href="/manager/employees/add"
              className="btn-primary flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm"
            >
              <Plus size={18} />
              Add employee
            </Link>
          )}
        </div>
      }
    >
      <div className="relative shrink-0">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-field !py-2.5"
        />
      </div>

      <div className="flex shrink-0 gap-2">
        {["active", "exited", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
              filter === f
                ? "bg-charcoal text-white"
                : "bg-surface text-muted hover:text-charcoal"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity ${isRefreshing ? "opacity-70" : ""}`}
      >
        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filtered.length === 0 ? (
          hasEverHadEmployees ? (
            <EmptyState
              title="No employees yet"
              description="Add your first employee to start tracking attendance."
              action={
                <Link href="/manager/employees/add" className="btn-primary">
                  Add Employee
                </Link>
              }
            />
          ) : filter === "active" ? (
            <EmptyState
              title="All employees are currently exited"
              description="View exited staff or reactivate an employee."
              action={
                <button onClick={() => setFilter("exited")} className="btn-secondary">
                  View Exited Staff
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No employees found"
              description="Try adjusting your search or filter."
            />
          )
        ) : (
          <div className="card flex min-h-0 flex-1 flex-col !p-3 md:!p-4">
            <h2 className="mb-2 shrink-0 text-sm font-semibold">
              {filter === "exited" ? "Exited Staff" : "Employee Database"}
            </h2>

            <div className="min-h-0 flex-1 overflow-hidden">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-muted">
                    <th className="py-1.5 pr-4">Name</th>
                    <th className="px-2 py-1.5">Joined</th>
                    {(filter === "exited" || filter === "all") && (
                      <th className="px-2 py-1.5">Exit Date</th>
                    )}
                    <th className="px-2 py-1.5">Status</th>
                    <th className="px-2 py-1.5">Tenure</th>
                    {filter === "exited" && <th className="px-2 py-1.5">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((emp) => (
                    <tr key={emp.id} className="border-b border-stone-100">
                      <td className="py-1.5 pr-4">
                        <Link
                          href={`/manager/employees/${emp.id}`}
                          className="font-medium hover:underline"
                        >
                          {emp.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">{emp.joiningDate}</td>
                      {(filter === "exited" || filter === "all") && (
                        <td className="px-2 py-1.5">{emp.exitDate ?? "—"}</td>
                      )}
                      <td className="px-2 py-1.5 capitalize">{emp.status}</td>
                      <td className="px-2 py-1.5">
                        {formatTenure(emp.joiningDate, emp.exitDate)}
                      </td>
                      {filter === "exited" && (
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => setRestoreEmp(emp)}
                            className="text-xs font-medium text-present hover:underline"
                          >
                            Restore
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.prev}
              onNext={pagination.next}
            />
          </div>
        )}
      </div>

      {restoreEmp && (
        <RestoreEmployeeModal
          employee={restoreEmp}
          onCancel={() => setRestoreEmp(null)}
          onRestore={handleRestore}
        />
      )}
    </ViewportPage>
  );
}
