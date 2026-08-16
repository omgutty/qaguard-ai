import type { ReactNode } from "react";
import { cx } from "@/components/ui/primitives";

export function StatCard({
  label,
  value,
  sub,
  tone = "zinc",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "zinc" | "emerald" | "amber" | "red" | "indigo" | "sky";
  className?: string;
}) {
  const tones: Record<string, string> = {
    zinc: "text-text-primary",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
    indigo: "text-indigo-300",
    sky: "text-sky-300",
  };
  return (
    <div
      className={cx(
        "rounded-xl border border-border bg-surface p-4",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cx("mt-1.5 font-mono text-2xl font-bold tabular-nums", tones[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
