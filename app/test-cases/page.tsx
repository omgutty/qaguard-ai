"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewBadge, SourceBadge } from "@/components/ui/badge";
import type { TestCase, TestCaseType, TestPriority } from "@/types/qa";

export default function TestCasesPage() {
  const { state, updateTestCase } = useWorkflow();
  const { testCases, testData } = state;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalSteps = testCases.reduce((acc, tc) => acc + tc.steps.length, 0);

  const changeType = (tc: TestCase, type: TestCaseType) =>
    updateTestCase(tc.id, { type });
  const changePriority = (tc: TestCase, priority: TestPriority) =>
    updateTestCase(tc.id, { priority });
  const deleteCase = (id: string) => {
    updateTestCase(id, { reviewStatus: "rejected" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Test Cases</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {testCases.length} generated · {totalSteps} steps · {testData.length} datasets
            </p>
          </div>
        </div>

        {testCases.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No test cases generated"
              description="Run a requirement analysis first — the Test Engine Agent will derive typed test cases from your acceptance criteria."
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
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <TestCaseRow
                      key={tc.id}
                      tc={tc}
                      expanded={expandedId === tc.id}
                      onToggle={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
                      onChangeType={(t) => changeType(tc, t)}
                      onChangePriority={(p) => changePriority(tc, p)}
                      onDelete={() => deleteCase(tc.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TestCaseRow({
  tc,
  expanded,
  onToggle,
  onChangeType,
  onChangePriority,
  onDelete,
}: {
  tc: TestCase;
  expanded: boolean;
  onToggle: () => void;
  onChangeType: (t: TestCaseType) => void;
  onChangePriority: (p: TestPriority) => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border/60 bg-bg/40 transition-colors hover:bg-surface">
        <td className="px-4 py-3 font-mono text-xs text-text-muted">{tc.id}</td>
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} className="text-left font-medium text-text-primary hover:text-accent">
            {tc.title}
          </button>
        </td>
        <td className="px-4 py-3">
          <select
            value={tc.type}
            onChange={(e) => onChangeType(e.target.value as TestCaseType)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-secondary focus:border-accent/50 focus:outline-none"
          >
            {(["positive", "negative", "boundary", "validation", "security", "regression"] as TestCaseType[]).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <select
            value={tc.priority}
            onChange={(e) => onChangePriority(e.target.value as TestPriority)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-secondary focus:border-accent/50 focus:outline-none"
          >
            {(["low", "medium", "high", "critical"] as TestPriority[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <SourceBadge source={tc.source} />
        </td>
        <td className="px-4 py-3">
          <ReviewBadge status={tc.reviewStatus} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggle} className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary">
              {expanded ? "Hide" : "Steps"}
            </button>
            <button type="button" onClick={onDelete} className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:border-error/40 hover:text-error">
              Reject
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/60 bg-surface">
          <td colSpan={7} className="px-4 py-4">
            <p className="mb-2 text-sm text-text-secondary">{tc.description}</p>
            {tc.preconditions.length > 0 && (
              <p className="mb-2 text-xs text-text-muted">
                Preconditions: {tc.preconditions.join("; ")}
              </p>
            )}
            <div className="space-y-2">
              {tc.steps.map((step) => (
                <div key={step.stepNumber} className="grid grid-cols-[24px_1fr_1fr] gap-3 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-text-muted">{step.stepNumber}</span>
                  <div>
                    <p className="text-xs font-medium text-text-muted">Action</p>
                    <p className="text-text-secondary">{step.action}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted">Expected</p>
                    <p className="text-text-secondary">{step.expectedResult}</p>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
