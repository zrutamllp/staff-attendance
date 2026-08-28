"use client";

import StatusStamp from "@/features/attendance/components/StatusStamp";
import { PICKER_STATUSES } from "@/features/attendance/lib/attendance-client";
import { effectiveStatus } from "@/lib/attendance";

export default function AttendanceStatusPicker({
  employee,
  date,
  storedStatus,
  onSelect,
  onClose,
}) {
  if (!employee || !date) return null;

  const currentEffective = effectiveStatus(storedStatus, date);

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <h2 className="text-lg font-semibold text-charcoal">{employee.name}</h2>
        <p className="mt-1 text-sm text-muted">Mark attendance for {date}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PICKER_STATUSES.map(({ code, label }) => {
            const isActive = currentEffective === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition ${
                  isActive
                    ? "border-charcoal bg-surface"
                    : "border-stone-200 hover:border-stone-300 hover:bg-surface/60"
                }`}
              >
                <StatusStamp status={code} date={date} size="md" />
                <span className="text-xs font-medium text-charcoal">{label}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={onClose} className="btn-secondary mt-5 w-full">
          Cancel
        </button>
      </div>
    </div>
  );
}
