"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/primitives";
import { SensitiveBadge } from "@/components/ui/badge";

export default function TestDataPage() {
  const { state, updateTestDataField } = useWorkflow();
  const { testData, testCases } = state;
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState<Set<string>>(new Set());

  const toggleReveal = (fieldId: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const caseTitle = (testCaseId: string) =>
    testCases.find((tc) => tc.id === testCaseId)?.title ?? "Unknown case";

  const handleEdit = (testDataId: string, fieldIndex: number, value: string) => {
    updateTestDataField(testDataId, fieldIndex, value);
    setEdited((prev) => new Set(prev).add(`${testDataId}:${fieldIndex}`));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Test Data</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Generated per test case. Sensitive values are masked — edit to customize.
        </p>

        {testData.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No test data generated"
              description="Generate test cases first — the Test Data Agent creates realistic datasets per test case."
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
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {testData.map((td) => (
              <Card key={td.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-text-muted">{td.id}</p>
                    <p className="text-sm font-medium text-text-primary">{caseTitle(td.testCaseId)}</p>
                  </div>
                  <span className="font-mono text-[11px] text-text-muted">{td.testCaseId}</span>
                </div>
                <div className="space-y-2">
                  {td.fields.map((field, idx) => {
                    const fieldId = `${td.id}:${idx}`;
                    const isSensitive = field.sensitive;
                    const showValue =
                      !isSensitive || revealed.has(fieldId);
                    const displayValue = showValue
                      ? field.value
                      : "••••••••";
                    const isEdited = edited.has(fieldId);
                    return (
                      <div
                        key={fieldId}
                        className="grid grid-cols-[130px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-medium text-text-secondary">{field.name}</p>
                          <p className="font-mono text-[10px] text-text-muted">{field.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={displayValue}
                            onChange={(e) => handleEdit(td.id, idx, e.target.value)}
                            type={isSensitive && !revealed.has(fieldId) ? "password" : "text"}
                            className="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-text-secondary focus:border-accent/50 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isEdited && <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400">edited</span>}
                          {isSensitive ? (
                            <>
                              <SensitiveBadge />
                              <button
                                type="button"
                                onClick={() => toggleReveal(fieldId)}
                                className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                              >
                                {revealed.has(fieldId) ? "hide" : "reveal"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
