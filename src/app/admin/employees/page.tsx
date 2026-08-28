"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp, Search } from "lucide-react";
import LoadingSpinner, { ErrorState } from "@/components/ui/UIStates";
import AddEmployeeForm from "@/features/employees/components/AddEmployeeForm";
import RestoreEmployeeModal from "@/features/employees/components/RestoreEmployeeModal";
import { formatTenure } from "@/lib/attendance";
import type { Employee } from "@/types/domain";
import { getErrorMessage } from "@/lib/errors";

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("active");
  const [showAdd, setShowAdd] = useState(false);
  const [dbOpen, setDbOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [restoreEmp, setRestoreEmp] = useState<Employee | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "employees", status: filter });
      const empRes = await fetch(`/api/admin?${params}`);
      if (!empRes.ok) throw new Error("Failed to load data");
      setEmployees(await empRes.json());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

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
    load();
  }

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">All Employees</h1>
          <p className="text-sm text-muted">
            {filter === "exited"
              ? "Exited staff — restore employees with a new join date"
              : "Organization-wide employee database — all managers share the same roster"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {["active", "exited", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-medium capitalize ${
              filter === f ? "bg-charcoal text-white" : "bg-surface text-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <button
          onClick={() => setDbOpen(!dbOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="font-semibold">Employee Database</h2>
          {dbOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {dbOpen && (
          <div className="mt-4">
            <div className="relative max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="search-field"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="card">
          <p className="table-scroll-hint">Swipe horizontally to see all columns</p>
          <div className="table-scroll">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-muted">
                <th className="py-3 pr-4">Name</th>
                <th className="px-4 py-3">Joined</th>
                {(filter === "exited" || filter === "all") && (
                  <th className="px-4 py-3">Exit Date</th>
                )}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tenure</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4 font-medium">
                    <Link
                      href={`/manager/employees/${emp.id}`}
                      className="hover:underline"
                    >
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{emp.joiningDate}</td>
                  {(filter === "exited" || filter === "all") && (
                    <td className="px-4 py-3">{emp.exitDate ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 capitalize">{emp.status}</td>
                  <td className="px-4 py-3">
                    {formatTenure(emp.joiningDate, emp.exitDate)}
                  </td>
                  <td className="px-4 py-3">
                    {emp.status === "exited" && (
                      <button
                        onClick={() => setRestoreEmp(emp)}
                        className="text-xs font-medium text-present hover:underline"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg">
            <AddEmployeeForm
              onCancel={() => setShowAdd(false)}
              onSuccess={() => {
                setShowAdd(false);
                load();
              }}
            />
          </div>
        </div>
      )}

      {restoreEmp && (
        <RestoreEmployeeModal
          employee={restoreEmp}
          onCancel={() => setRestoreEmp(null)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}
