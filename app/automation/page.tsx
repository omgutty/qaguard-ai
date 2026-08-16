"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { generateAutomationBatch } from "@/agents/automation-agent";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/primitives";
import { CodeBlock } from "@/components/ui/code-block";
import { ReviewBadge, TypeBadge } from "@/components/ui/badge";
import type { AutomationArtifact } from "@/types/qa";

export default function AutomationPage() {
  const { state, setAutomationArtifacts } = useWorkflow();
  const { testCases, testData, automationArtifacts } = state;
  const [selected, setSelected] = useState<AutomationArtifact | null>(null);
  const [generating, setGenerating] = useState(false);

  const approvedCases = testCases.filter((tc) => tc.reviewStatus === "approved");
  const alreadyGenerated = new Set(automationArtifacts.map((a) => a.testCaseId));
  const candidates = approvedCases.filter((tc) => !alreadyGenerated.has(tc.id));

  const handleGenerate = async () => {
    setGenerating(true);
    // Deterministic generation, brief async to feel intentional.
    await new Promise((r) => setTimeout(r, 400));
    const newArtifacts = generateAutomationBatch(candidates, testData);
    const combined = [...automationArtifacts, ...newArtifacts];
    setAutomationArtifacts(combined);
    if (newArtifacts.length > 0) setSelected(newArtifacts[0]);
    setGenerating(false);
  };

  const download = (artifact: AutomationArtifact) => {
    const blob = new Blob([artifact.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Automation</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Playwright TypeScript generated only for approved test cases.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={candidates.length === 0 || generating}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? "Generating..." : `Generate Playwright (${candidates.length})`}
          </button>
        </div>

        {/* Governance note */}
        <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <strong className="font-semibold">Governance gate:</strong>{" "}
          {approvedCases.length} of {testCases.length} test cases approved. Unapproved cases
          cannot be automated — approve them in{" "}
          <a href="/review" className="underline hover:text-amber-100">
            Human Review
          </a>
          .
        </div>

        {testCases.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No test cases to automate"
              description="Run a requirement analysis, then approve test cases in Human Review."
              action={
                <a
                  href="/requirements"
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  Go to Requirements
                </a>
              }
            />
          </div>
        ) : approvedCases.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No approved test cases"
              description="Automation requires human approval. Review and approve test cases to unlock Playwright generation."
              action={
                <a
                  href="/review"
                  className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                >
                  Go to Review
                </a>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            {/* Artifact list */}
            <div className="space-y-3">
              {automationArtifacts.length === 0 && (
                <Card className="p-4 text-sm text-zinc-400">
                  No artifacts yet — click &quot;Generate Playwright&quot; to create them.
                </Card>
              )}
              {automationArtifacts.map((artifact) => {
                const tc = testCases.find((t) => t.id === artifact.testCaseId);
                return (
                  <button
                    key={artifact.testCaseId}
                    type="button"
                    onClick={() => setSelected(artifact)}
                    className={
                      "w-full rounded-lg border p-3 text-left transition-colors " +
                      (selected?.testCaseId === artifact.testCaseId
                        ? "border-indigo-400/40 bg-indigo-500/5"
                        : "border-white/[0.06] bg-zinc-900/50 hover:border-white/15")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-zinc-500">{artifact.fileName}</span>
                      <ReviewBadge status={tc?.reviewStatus ?? "pending"} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-100">{tc?.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {tc && <TypeBadge type={tc.type} />}
                      <span className="font-mono text-[10px] text-zinc-600">
                        {artifact.framework} · {artifact.language}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Code viewer */}
            <div>
              {selected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500">
                      {selected.testCaseId} · generated {new Date(selected.generatedAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => download(selected)}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
                    >
                      Download .ts
                    </button>
                  </div>
                  <CodeBlock code={selected.code} fileName={selected.fileName} />
                </div>
              ) : (
                <EmptyState
                  title="Select an artifact"
                  description="Generate Playwright code, then select an artifact to view it."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
