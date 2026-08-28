import type { ReactNode } from "react";

export interface FlashMessage {
  message: string;
  type?: "success" | "error" | "warning";
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export interface ToastProps extends FlashMessage {
  onClose?: () => void;
}

export interface LoadingSpinnerProps {
  message?: string;
}
