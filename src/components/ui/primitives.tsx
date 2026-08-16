import type { ReactNode } from "react";

// Lightweight design tokens used across the app. Kept in TS so they stay in
// sync with Tailwind classes without a plugin.

export const ACCENT = "indigo-500";

export const STATUS_COLORS = {
  approved: "emerald",
  pending: "amber",
  rejected: "red",
  modified: "sky",
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

export const STATUS_LABELS: Record<StatusKey, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  modified: "Modified",
};

export const TYPE_LABELS: Record<string, string> = {
  positive: "Positive",
  negative: "Negative",
  boundary: "Boundary",
  validation: "Validation",
  security: "Security",
  regression: "Regression",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_ORDER: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

export const TYPE_ORDER: Record<string, number> = {
  positive: 0,
  negative: 1,
  boundary: 2,
  validation: 3,
  security: 4,
  regression: 5,
};

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cx("text-sm font-semibold tracking-tight text-zinc-100", className)}>
      {children}
    </h3>
  );
}

export function MutedText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cx("text-sm text-zinc-400", className)}>{children}</p>;
}
