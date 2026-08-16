import { STATUS_COLORS, TYPE_LABELS, PRIORITY_LABELS, cx } from "@/components/ui/primitives";
import type { ReviewStatus, TestCaseType, TestPriority } from "@/types/qa";

type Tone = "emerald" | "amber" | "red" | "sky" | "indigo" | "zinc";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-400/20",
  red: "bg-red-500/10 text-red-300 border-red-400/20",
  sky: "bg-sky-500/10 text-sky-300 border-sky-400/20",
  indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-400/20",
  zinc: "bg-text-muted/10 text-text-secondary border-border",
};

export function Badge({
  tone = "zinc",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const tone = STATUS_COLORS[status] as Tone;
  const label =
    status === "approved"
      ? "APPROVED"
      : status === "rejected"
        ? "REJECTED"
        : status === "modified"
          ? "MODIFIED"
          : "PENDING";
  return <Badge tone={tone}>{label}</Badge>;
}

export function TypeBadge({ type }: { type: TestCaseType }) {
  return <Badge tone="zinc">{TYPE_LABELS[type]?.toUpperCase() ?? type}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TestPriority }) {
  const tone: Tone =
    priority === "critical"
      ? "red"
      : priority === "high"
        ? "amber"
        : priority === "medium"
          ? "sky"
          : "zinc";
  return <Badge tone={tone}>{PRIORITY_LABELS[priority]?.toUpperCase() ?? priority}</Badge>;
}

export function SourceBadge({ source }: { source: string }) {
  const isAi = source === "AI-Derived";
  return (
    <Badge tone={isAi ? "indigo" : "emerald"}>
      {isAi ? "AI-DERIVED" : source.toUpperCase().replace(/\s+/g, " ")}
    </Badge>
  );
}

export function SensitiveBadge() {
  return <Badge tone="red">SENSITIVE</Badge>;
}
