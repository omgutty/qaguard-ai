"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  buildWorkflowStages,
  countApproved,
  countRejected,
  countPending,
} from "@/lib/utils/traceability";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { PipelineFlow } from "@/components/ui/pipeline-flow";
import { StatCard } from "@/components/ui/stat-card";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/primitives";

export default function DashboardPage() {
  const { state } = useWorkflow();
  const { requirement, testCases, testData, automationArtifacts, qualityReport } =
    state;

  const stages = buildWorkflowStages(requirement, testCases, testData, automationArtifacts);
  const approved = countApproved(testCases);
  const rejected = countRejected(testCases);
  const pending = countPending(testCases);
  const total = testCases.length;
  const reviewComplete = total > 0 && approved === total;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Workflow Overview
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {requirement
                ? `Analyzing: ${requirement.title}`
                : "No requirement analyzed yet."}
            </p>
          </div>
          <Link
            href="/requirements"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
          >
            {requirement ? "New Analysis" : "Start New Analysis"}
          </Link>
        </div>

        {/* Hero: pipeline flow */}
        <div className="mt-6">
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Pipeline Status
            </p>
            <PipelineFlow stages={stages} />
          </Card>
        </div>

        {/* Key numbers */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Requirement Analysis" value={requirement ? "✓" : "—"} tone={requirement ? "emerald" : "zinc"} sub={requirement ? requirement.id : "Not started"} />
          <StatCard label="Test Generation" value={total} sub={`${approved} approved`} />
          <StatCard label="Test Data" value={testData.length} sub="datasets" />
          <StatCard label="Human Review" value={`${approved} / ${total}`} sub={reviewComplete ? "Complete" : `${pending} pending`} tone={reviewComplete ? "emerald" : "amber"} />
          <StatCard label="Automation" value={automationArtifacts.length} sub="generated" tone={automationArtifacts.length ? "indigo" : "zinc"} />
        </div>

        {/* Quality score + review status */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Quality Score
            </p>
            {qualityReport ? (
              <div className="flex items-center gap-6">
                <ScoreRing value={qualityReport.overallScore} size={120} sublabel="overall" />
                <div className="space-y-2">
                  <p className="text-sm text-zinc-300">
                    Requirement Coverage{" "}
                    <span className="font-mono text-zinc-100">{qualityReport.requirementCoverage}%</span>
                  </p>
                  <p className="text-sm text-zinc-300">
                    Test Coverage{" "}
                    <span className="font-mono text-zinc-100">{qualityReport.testCoverage}%</span>
                  </p>
                  <p className="text-sm text-zinc-300">
                    AI Confidence{" "}
                    <span className="font-mono text-zinc-100">{qualityReport.aiConfidence}%</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Complete the pipeline to compute a quality score.
              </p>
            )}
          </Card>
          <Card className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Review Status
            </p>
            {total > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-3">
                  <p className="font-mono text-xl font-bold text-emerald-300">{approved}</p>
                  <p className="text-xs text-zinc-500">Approved</p>
                </div>
                <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-3">
                  <p className="font-mono text-xl font-bold text-amber-300">{pending}</p>
                  <p className="text-xs text-zinc-500">Pending</p>
                </div>
                <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                  <p className="font-mono text-xl font-bold text-red-300">{rejected}</p>
                  <p className="text-xs text-zinc-500">Rejected</p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No test cases yet"
                description="Run a requirement analysis to generate test cases."
              />
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
