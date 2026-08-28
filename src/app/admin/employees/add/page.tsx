"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AddEmployeeForm from "@/features/employees/components/AddEmployeeForm";

export default function AdminAddEmployeePage() {
  const router = useRouter();

  return (
    <div className="admin-page">
      <div className="mx-auto max-w-lg space-y-6">
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-2 text-sm text-muted"
        >
          <ArrowLeft size={16} />
          Back to Employees
        </Link>

        <header>
          <h1 className="text-2xl font-semibold text-charcoal">Add Employee</h1>
          <p className="text-sm text-muted">
            Keep under yourself or assign to another manager
          </p>
        </header>

        <AddEmployeeForm
          cancelHref="/admin/employees"
          onSuccess={() => {
            router.push("/admin/employees");
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
