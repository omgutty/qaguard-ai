import type { WorkflowStage } from "@/types/qa";
import { cx } from "@/components/ui/primitives";

const STAGE_META: Record<string, { key: string; color: string }> = {
  requirement: { key: "REQ", color: "text-indigo-400 border-indigo-400/30" },
  "test-cases": { key: "TC", color: "text-sky-400 border-sky-400/30" },
  "test-data": { key: "TD", color: "text-emerald-400 border-emerald-400/30" },
  review: { key: "RV", color: "text-amber-400 border-amber-400/30" },
  automation: { key: "AU", color: "text-fuchsia-400 border-fuchsia-400/30" },
  quality: { key: "QL", color: "text-emerald-400 border-emerald-400/30" },
};

export function PipelineFlow({ stages }: { stages: WorkflowStage[] }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-stretch gap-2">
        {stages.map((stage, i) => {
          const meta = STAGE_META[stage.key] ?? STAGE_META.requirement;
          const isLast = i === stages.length - 1;
          return (
            <li key={stage.key} className="flex items-stretch">
              <div
                className={cx(
                  "flex w-36 flex-col rounded-lg border p-3 transition-colors",
                  stage.complete
                    ? "border-border bg-surface"
                    : "border-border/60 bg-surface-elevated/60"
                )}
              >
                <span
                  className={cx(
                    "font-mono text-[10px] font-bold uppercase tracking-widest",
                    stage.complete ? meta.color : "text-text-muted"
                  )}
                >
                  {meta.key}
                </span>
                <span className="mt-1 text-sm font-semibold text-text-primary">
                  {stage.label}
                </span>
                <span className="mt-2 font-mono text-lg font-bold tabular-nums text-text-primary">
                  {stage.count}
                </span>
                <span className="mt-auto text-[11px] text-text-muted">
                  {stage.complete ? "Complete" : "Pending"}
                </span>
              </div>
              {!isLast && (
                <div className="flex items-center px-1.5">
                  <span className="text-text-muted">→</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
