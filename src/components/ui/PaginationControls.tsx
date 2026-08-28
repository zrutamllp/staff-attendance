interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  if (totalItems <= pageSize) return null;

  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-stone-100 pt-3 text-xs text-muted">
      <span>
        {start}–{end} of {totalItems}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="rounded-xl border border-stone-200 px-3 py-1.5 font-medium transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-xl border border-stone-200 px-3 py-1.5 font-medium transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
