import { STATUS_COLORS, effectiveStatus } from "@/lib/attendance";
import type { AttendanceStatus } from "@/types/session";

interface StatusStampProps {
  status: AttendanceStatus | null;
  date?: string;
  onClick?: () => void;
  size?: "sm" | "md";
  employed?: boolean;
  locked?: boolean;
}

export default function StatusStamp({
  status,
  date,
  onClick,
  size = "md",
  employed = true,
  locked = false,
}: StatusStampProps) {
  if (employed === false) {
    const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
    return (
      <span
        className={`inline-flex items-center justify-center ${sizeClass} text-stone-300`}
      >
        —
      </span>
    );
  }

  const displayStatus = date
    ? effectiveStatus(status, date, { employed })
    : (status ?? "P");

  const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  const colorClass = displayStatus
    ? STATUS_COLORS[displayStatus]
    : STATUS_COLORS.unmarked;

  const lockedClass = locked ? "opacity-60 cursor-not-allowed" : "";

  const label = displayStatus ?? "·";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`status-stamp ${sizeClass} ${colorClass}`}
        aria-label={displayStatus ? `Status ${displayStatus}` : "Unmarked"}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={`status-stamp ${sizeClass} ${colorClass} ${lockedClass}`}>
      {label}
    </span>
  );
}
