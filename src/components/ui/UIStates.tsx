import type {
  EmptyStateProps,
  ErrorStateProps,
  LoadingSpinnerProps,
  ToastProps,
} from "@/types/ui";

export default function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-charcoal" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="card flex flex-col items-center py-12 text-center">
      <h3 className="text-lg font-semibold text-absent">Something went wrong</h3>
      <p className="mt-2 text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-6">
          Try Again
        </button>
      )}
    </div>
  );
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  const bg =
    type === "error"
      ? "bg-absent text-white"
      : type === "warning"
        ? "bg-leave text-white"
        : "bg-present text-white";

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-6 py-3 text-sm font-medium shadow-lg ${bg} md:bottom-8`}
    >
      <div className="flex items-center gap-3">
        {message}
        {onClose && (
          <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
