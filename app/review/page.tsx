"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { ReviewBadge, TypeBadge, SourceBadge } from "@/components/ui/badge";
import { countApproved, countPending, countRejected } from "@/lib/utils/traceability";
import type { TestCase, ReviewStatus } from "@/types/qa";

export default function ReviewPage() {
  const { state, updateTestCase, setReviews } = useWorkflow();
  const { testCases } = state;
  const [comment, setComment] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<TestCase | null>(null);

  const approved = countApproved(testCases);
  const pending = countPending(testCases);
  const rejected = countRejected(testCases);
  const total = testCases.length;

  const setStatus = (tc: TestCase, status: ReviewStatus, reviewComment?: string) => {
    updateTestCase(tc.id, { reviewStatus: status });
    setReviews((prev) => [
      ...prev.filter((r) => r.testCaseId !== tc.id),
      {
        testCaseId: tc.id,
        decision: status === "approved" ? "approve" : status === "rejected" ? "reject" : "approve",
        comment: reviewComment,
        reviewedAt: new Date().toISOString(),
      },
    ]);
  };

  const saveEdit = () => {
    if (!editing) return;
    updateTestCase(editing.id, {
      title: editing.title,
      description: editing.description,
      expectedResult: editing.expectedResult,
      reviewStatus: "modified",
    });
    setReviews((prev) => [
      ...prev.filter((r) => r.testCaseId !== editing.id),
      {
        testCaseId: editing.id,
        decision: "approve",
        comment: "Edited by reviewer",
        reviewedAt: new Date().toISOString(),
      },
    ]);
    setEditing(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">Human Review</h2>
            <p className="mt-1 text-sm text-text-secondary">
              The governance gate — only approved test cases reach automation.
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs uppercase tracking-wider text-text-muted">Total Generated</p>
            <p className="mt-1 font-mono text-2xl font-bold text-text-primary">{total}</p>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-emerald-400">Approved</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">{approved}</p>
          </div>
          <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-red-400">Rejected</p>
            <p className="mt-1 font-mono text-2xl font-bold text-red-400">{rejected}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
            <p className="text-xs uppercase tracking-wider text-amber-400">Pending</p>
            <p className="mt-1 font-mono text-2xl font-bold text-amber-400">{pending}</p>
          </div>
        </div>

        {total === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Nothing to review"
              description="Generate test cases first, then approve or reject each one here."
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
        ) : (
          <div className="mt-6 space-y-4">
            {testCases.map((tc) => (
              <ReviewRow
                key={tc.id}
                tc={tc}
                comment={comment[tc.id] ?? ""}
                onComment={(v) => setComment((prev) => ({ ...prev, [tc.id]: v }))}
                onApprove={() => setStatus(tc, "approved", comment[tc.id])}
                onReject={() => setStatus(tc, "rejected", comment[tc.id])}
                onEdit={() => setEditing(tc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle>Edit Test Case</SectionTitle>
              <button type="button" onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Title</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Description</label>
                <textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-400/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Expected result</label>
                <textarea
                  rows={2}
                  value={editing.expectedResult}
                  onChange={(e) => setEditing({ ...editing, expectedResult: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-400/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
              >
                Save as Modified
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ReviewRow({
  tc,
  comment,
  onComment,
  onApprove,
  onReject,
  onEdit,
}: {
  tc: TestCase;
  comment: string;
  onComment: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  const decided = tc.reviewStatus !== "pending";
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">{tc.id}</span>
            <TypeBadge type={tc.type} />
            <SourceBadge source={tc.source} />
            <ReviewBadge status={tc.reviewStatus} />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-zinc-100">{tc.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{tc.description}</p>
          {tc.steps.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {tc.steps.map((step) => (
                <div key={step.stepNumber} className="flex gap-2 text-xs">
                  <span className="font-mono text-zinc-600">{step.stepNumber}.</span>
                  <span className="text-zinc-400">{step.action}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-300">{step.expectedResult}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        {!decided && (
          <>
            <input
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              placeholder="Optional review comment..."
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={onApprove}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
        >
          Edit
        </button>
      </div>
    </Card>
  );
}
