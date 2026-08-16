"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { buildWorkflowStages } from "@/lib/utils/traceability";
import { PipelineFlow } from "@/components/ui/pipeline-flow";
import { ScoreRing } from "@/components/ui/score-ring";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, SectionTitle } from "@/components/ui/primitives";
import type { QualityReport } from "@/types/qa";

function MetricBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "bg-emerald-400" : value >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="font-mono text-sm text-text-primary">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
        <div className={"h-full rounded-full " + tone} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function QualityPage() {
  const { state, setQualityReport } = useWorkflow();
  const { requirement, analysis, testCases, testData, automationArtifacts, qualityReport } =
    state;

  const stages = buildWorkflowStages(requirement, testCases, testData, automationArtifacts);
  const pendingCount = qualityReport
    ? testCases.length - qualityReport.approvedTests - qualityReport.rejectedTests
    : 0;

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!requirement || !analysis) {
      setError("Run a requirement analysis first.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/quality/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement,
          analysis,
          testCases,
          testData,
          artifacts: automationArtifacts,
        }),
      });
      const data = (await res.json()) as { report?: QualityReport; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to generate the quality report.");
        return;
      }
      if (data.report) setQualityReport(data.report);
    } catch {
      setError("AI service is temporarily unavailable.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Quality &amp; Traceability</h2>
            <p className="mt-1 text-sm text-text-secondary">
              AI-powered quality assessment of the actual pipeline artifacts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {generating && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? "Generating quality report..." : "Generate Quality Report"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {!qualityReport ? (
          <div className="mt-6">
            <EmptyState
              title="No quality report yet"
              description="Generate a quality report to see an AI assessment of coverage, traceability, and risks."
            />
          </div>
        ) : (
          <>
            {/* Hero: pipeline flow */}
            <div className="mt-6">
              <Card className="p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Pipeline Flow
                </p>
                <PipelineFlow stages={stages} />
              </Card>
            </div>

            {/* Overall + metric bars */}
            <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
              <Card className="p-6">
                <div className="flex flex-col items-center">
                  <ScoreRing value={qualityReport.overallScore} size={140} sublabel="overall" />
                  <p className="mt-3 text-sm font-medium text-text-secondary">Overall Quality</p>
                </div>
              </Card>
              <Card className="p-6">
                <SectionTitle>Quality Metrics</SectionTitle>
                <div className="mt-4 space-y-4">
                  <MetricBar label="Requirement Coverage" value={qualityReport.requirementCoverage} />
                  <MetricBar label="Test Coverage" value={qualityReport.testCoverage} />
                  <MetricBar label="Traceability" value={qualityReport.traceabilityScore} />
                  <MetricBar label="Testability" value={qualityReport.testabilityScore} />
                  <MetricBar label="AI Confidence" value={qualityReport.aiConfidence} />
                </div>
              </Card>
            </div>

            {/* Counts */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Requirement Gaps" value={qualityReport.requirementGaps} tone={qualityReport.requirementGaps > 0 ? "amber" : "emerald"} />
              <StatCard label="AI-Derived Tests" value={qualityReport.aiDerivedTests} tone="indigo" />
              <StatCard label="Approved" value={qualityReport.approvedTests} tone="emerald" />
              <StatCard label="Rejected" value={qualityReport.rejectedTests} tone="red" />
              <StatCard label="Pending" value={pendingCount} tone="amber" />
              <StatCard label="Automation Files" value={automationArtifacts.length} tone="sky" />
            </div>

            {/* Traceability table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Traceability Matrix
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-xs uppercase tracking-wider text-text-muted">
                      <th className="px-4 py-3 font-medium">Requirement</th>
                      <th className="px-4 py-3 font-medium">Test Case</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Review</th>
                      <th className="px-4 py-3 font-medium">Automation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.map((tc) => (
                      <tr key={tc.id} className="border-b border-border/60 bg-bg/40">
                        <td className="px-4 py-3 font-mono text-xs text-text-muted">{requirement?.id ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{tc.title}</div>
                          <div className="font-mono text-[11px] text-text-muted">{tc.id}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{tc.source}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "rounded-md border px-2 py-0.5 font-mono text-[11px] " +
                              (tc.reviewStatus === "approved"
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
                                : tc.reviewStatus === "rejected"
                                  ? "border-red-400/20 bg-red-500/10 text-red-400"
                                  : tc.reviewStatus === "modified"
                                    ? "border-sky-400/20 bg-sky-500/10 text-sky-400"
                                    : "border-amber-400/20 bg-amber-500/10 text-amber-400")
                            }
                          >
                            {tc.reviewStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {automationArtifacts.some((a) => a.testCaseId === tc.id) ? (
                            <span className="text-emerald-400">✓ generated</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Findings */}
            {Array.isArray(qualityReport.findings) && qualityReport.findings.length > 0 && (
              <div className="mt-6">
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <SectionTitle>AI Findings</SectionTitle>
                    <span className="rounded-full border border-ai/30 bg-ai/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-ai">
                      AI
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {qualityReport.findings.map((finding) => (
                      <div
                        key={finding.id}
                        className="rounded-lg border border-border bg-bg p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              finding.severity === "critical" || finding.severity === "high"
                                ? "red"
                                : finding.severity === "medium"
                                  ? "amber"
                                  : finding.severity === "low"
                                    ? "sky"
                                    : "zinc"
                            }
                          >
                            {finding.severity.toUpperCase()}
                          </Badge>
                          <Badge tone="indigo">
                            {finding.category.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          <span className="font-mono text-[11px] text-text-muted">
                            {finding.id}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">{finding.description}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          <span className="font-medium text-text-secondary">Evidence:</span> {finding.evidence}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          <span className="font-medium text-text-secondary">Recommendation:</span> {finding.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
