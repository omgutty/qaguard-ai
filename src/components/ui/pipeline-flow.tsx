import type { WorkflowStage } from "@/types/qa";
import { cx } from "@/components/ui/primitives";

const STAGE_META: Record<string, { key: string; color: string }> = {
  requirement: { key: "REQ", color: "text-indigo-300 border-indigo-400/30" },
  "test-cases": { key: "TC", color: "text-sky-300 border-sky-400/30" },
  "test-data": { key: "TD", color: "text-emerald-300 border-emerald-400/30" },
  review: { key: "RV", color: "text-amber-300 border-amber-400/30" },
  automation: { key: "AU", color: "text-fuchsia-300 border-fuchsia-400/30" },
  quality: { key: "QL", color: "text-emerald-300 border-emerald-400/30" },
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
                    ? "border-white/10 bg-zinc-900/70"
                    : "border-white/[0.05] bg-zinc-900/40"
                )}
              >
                <span
                  className={cx(
                    "font-mono text-[10px] font-bold uppercase tracking-widest",
                    stage.complete ? meta.color : "text-zinc-600"
                  )}
                >
                  {meta.key}
                </span>
                <span className="mt-1 text-sm font-semibold text-zinc-200">
                  {stage.label}
                </span>
                <span className="mt-2 font-mono text-lg font-bold tabular-nums text-zinc-100">
                  {stage.count}
                </span>
                <span className="mt-auto text-[11px] text-zinc-500">
                  {stage.complete ? "Complete" : "Pending"}
                </span>
              </div>
              {!isLast && (
                <div className="flex items-center px-1.5">
                  <span className="text-zinc-600">→</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
