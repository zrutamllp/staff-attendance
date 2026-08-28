"use client";

import { formatStoredStatus } from "@/lib/attendance";
import { storedFromPickerCode } from "@/features/attendance/lib/attendance-client";

export default function AttendanceOverwriteModal({
  employee,
  date,
  pendingCode,
  lastChangedByName,
  currentStoredStatus,
  onCancel,
  onConfirm,
}) {
  const newStored = storedFromPickerCode(pendingCode);

  return (
    <div className="modal-overlay">
      <div className="modal-panel">
        <h2 className="text-lg font-semibold">Another manager changed this</h2>
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium">{lastChangedByName}</span> previously updated
          attendance for <span className="font-medium">{employee.name}</span> on{" "}
          <span className="font-medium">{date}</span>.
        </p>
        <p className="mt-3 text-sm">
          Current status:{" "}
          <span className="font-medium">{formatStoredStatus(currentStoredStatus)}</span>
          <br />
          Change to:{" "}
          <span className="font-medium">{formatStoredStatus(newStored)}</span>?
        </p>
        <p className="mt-2 text-xs text-muted">
          This change will be recorded in the attendance log.
        </p>

        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            No
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1">
            Yes, change it
          </button>
        </div>
      </div>
    </div>
  );
}
