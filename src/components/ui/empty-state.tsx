import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center " +
        (className ?? "")
      }
    >
      {icon && <div className="mb-3 text-text-muted">{icon}</div>}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
