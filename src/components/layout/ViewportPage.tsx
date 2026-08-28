import type { ReactNode } from "react";

interface ViewportPageProps {
  header?: ReactNode;
  children: ReactNode;
}

export default function ViewportPage({ header, children }: ViewportPageProps) {
  return (
    <div className="page-container">
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
        {children}
      </div>
    </div>
  );
}
