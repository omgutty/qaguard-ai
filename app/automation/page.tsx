"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/primitives";
import { CodeBlock } from "@/components/ui/code-block";
import { ReviewBadge, TypeBadge } from "@/components/ui/badge";
import type { AutomationArtifact } from "@/types/qa";

export default function AutomationPage() {
  const { state, setAutomationArtifacts } = useWorkflow();
  const { requirement, testCases, testData, automationArtifacts } = state;
  const [selected, setSelected] = useState<AutomationArtifact | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approvedCases = testCases.filter((tc) => tc.reviewStatus === "approved");
  const alreadyGenerated = new Set(automationArtifacts.map((a) => a.testCaseId));
  const candidates = approvedCases.filter((tc) => !alreadyGenerated.has(tc.id));

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const newArtifacts: AutomationArtifact[] = [];
    try {
      for (const tc of candidates) {
        const data = testData.find((td) => td.testCaseId === tc.id);
        if (!data) continue;
        const res = await fetch("/api/automation/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testCase: tc,
            testData: data,
            requirement,
          }),
        });
        const body = (await res.json()) as { artifact?: AutomationArtifact; error?: string };
        if (!res.ok) {
          setError(body.error ?? "Unable to generate automation.");
          break;
        }
        if (body.artifact) newArtifacts.push(body.artifact);
      }
      const combined = [...automationArtifacts, ...newArtifacts];
      setAutomationArtifacts(combined);
      if (newArtifacts.length > 0) setSelected(newArtifacts[0]);
    } catch {
      setError("AI service is temporarily unavailable.");
    } finally {
      setGenerating(false);
    }
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
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Automation</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Playwright TypeScript generated only for approved test cases.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={candidates.length === 0 || generating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
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

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {testCases.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No test cases to automate"
              description="Run a requirement analysis, then approve test cases in Human Review."
              action={
                <a
                  href="/requirements"
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
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
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
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
                <Card className="p-4 text-sm text-text-secondary">
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
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-surface hover:border-text-muted")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-text-muted">{artifact.fileName}</span>
                      <ReviewBadge status={tc?.reviewStatus ?? "pending"} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-text-primary">{tc?.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {tc && <TypeBadge type={tc.type} />}
                      <span className="font-mono text-[10px] text-text-muted">
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
                    <span className="font-mono text-xs text-text-muted">
                      {selected.testCaseId} · generated {new Date(selected.generatedAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => download(selected)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
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
