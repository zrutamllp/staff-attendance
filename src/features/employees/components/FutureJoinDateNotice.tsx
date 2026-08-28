"use client";

import { getLocalDateString } from "@/lib/auto-present";

function formatJoinDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface FutureJoinDateNoticeProps {
  joiningDate: string;
}

export default function FutureJoinDateNotice({
  joiningDate,
}: FutureJoinDateNoticeProps) {
  const today = getLocalDateString();
  if (!joiningDate || joiningDate <= today) return null;

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-medium">Joining date is in the future</p>
      <p className="mt-1 text-xs text-amber-900/80">
        This employee will not appear on the attendance roster until{" "}
        {formatJoinDate(joiningDate)}. You can still add them now.
      </p>
    </div>
  );
}
