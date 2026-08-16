"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { validateRequirementInput } from "@/lib/validation/requirement";
import type {
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
  TestData,
} from "@/types/qa";
import { ScoreRing } from "@/components/ui/score-ring";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";

interface AnalyzeResponse {
  requirement: Requirement;
  analysis: RequirementAnalysis;
}

interface GenerateResponse {
  testCases: TestCase[];
  testData: TestData[];
  qualityReport: QualityReport;
}

export default function RequirementsPage() {
  const { state, setRequirement, setAnalysis, setTestCases, setTestData, setQualityReport } =
    useWorkflow();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { analysis } = state;

  const updateCriterion = (idx: number, value: string) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? value : c)));
  };
  const addCriterion = () => setCriteria((prev) => [...prev, ""]);
  const removeCriterion = (idx: number) => {
    setCriteria((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleAnalyze = async () => {
    const nonEmptyCriteria = criteria.filter((c) => c.trim());
    const validation = validateRequirementInput({
      title,
      description,
      acceptanceCriteria: nonEmptyCriteria,
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setApiError(null);
    setRunning(true);

    try {
      // Step 1: Requirement Analysis (real LLM via server route).
      const res = await fetch("/api/requirements/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          acceptanceCriteria: nonEmptyCriteria.map((c) => c.trim()),
        }),
      });

      const data = (await res.json()) as Partial<AnalyzeResponse> & {
        error?: string;
      };

      if (!res.ok) {
        setApiError(
          data.error ?? "Unable to analyze the requirement. Please try again."
        );
        setRunning(false);
        return;
      }

      setRequirement(data.requirement ?? null);
      setAnalysis(data.analysis ?? null);
      setRunning(false);

      // Step 2: Test Case Generation (real LLM via server route).
      if (data.requirement && data.analysis) {
        await handleGenerateTestCases(data.requirement, data.analysis);
      }
    } catch {
      setApiError("AI service is temporarily unavailable.");
      setRunning(false);
    }
  };

  const handleGenerateTestCases = async (
    requirement: Requirement,
    analysis: RequirementAnalysis
  ) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/test-cases/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, analysis }),
      });

      const data = (await res.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!res.ok) {
        setApiError(
          data.error ?? "Unable to generate test cases. Please try again."
        );
        setGenerating(false);
        return;
      }

      setTestCases(data.testCases ?? []);
      setTestData(data.testData ?? []);
      setQualityReport(data.qualityReport ?? null);
    } catch {
      setApiError("AI service is temporarily unavailable.");
    } finally {
      setGenerating(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Requirement Analysis
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Paste a user story or requirement. The Requirement Agent derives
          scores, gaps, and risks from the actual text.
        </p>

        {/* Input card */}
        <Card className="mt-6 p-6">
          <div className="grid gap-4">
            <div>
              <label htmlFor="req-title" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Title
              </label>
              <input
                id="req-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. User can reset their password"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="req-desc" className="mb-1.5 block text-sm font-medium text-text-secondary">
                User story / description
              </label>
              <textarea
                id="req-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="As a user, I want to..."
                className={inputCls + " resize-y"}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Acceptance criteria
              </label>
              <div className="space-y-2">
                {criteria.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-2.5 font-mono text-xs text-text-muted">AC-{i + 1}</span>
                    <input
                      value={c}
                      onChange={(e) => updateCriterion(i, e.target.value)}
                      placeholder="e.g. User receives a reset email within 30 seconds"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(i)}
                      className="rounded-md px-2 text-text-muted hover:text-error"
                      aria-label="Remove criterion"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCriterion}
                className="mt-2 text-sm font-medium text-accent hover:text-accent/80"
              >
                + Add criterion
              </button>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-error/20 bg-error/5 p-3">
                {errors.map((e) => (
                  <p key={e} className="text-sm text-error">
                    {e}
                  </p>
                ))}
              </div>
            )}

            {apiError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 p-3"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-error"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-error">{apiError}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={running || generating}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running
                  ? "Analyzing requirement..."
                  : generating
                    ? "Generating test cases..."
                    : "Analyze Requirement"}
              </button>
              <span className="text-xs text-text-muted">
                Powered by OpenRouter · DeepSeek
              </span>
            </div>
          </div>
        </Card>

        {/* Analysis results */}
        {analysis && (
          <div className="mt-6 space-y-6">
            <Card className="p-6">
              <SectionTitle>Analysis Scores</SectionTitle>
              <div className="mt-4 flex flex-wrap gap-8">
                <ScoreRing value={analysis.overallScore} label="Overall" sublabel="score" size={110} />
                <ScoreRing value={analysis.completenessScore} label="Completeness" sublabel="score" size={96} />
                <ScoreRing value={analysis.clarityScore} label="Clarity" sublabel="score" size={96} />
                <ScoreRing value={analysis.testabilityScore} label="Testability" sublabel="score" size={96} />
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <SectionTitle>Requirement Gaps</SectionTitle>
                {analysis.gaps.length === 0 ? (
                  <p className="mt-2 text-sm text-text-secondary">No gaps detected.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {analysis.gaps.map((gap) => (
                      <li key={gap.id} className="rounded-lg border border-border bg-bg p-3">
                        <div className="flex items-center gap-2">
                          <Badge tone="amber">{gap.type.replace(/_/g, " ").toUpperCase()}</Badge>
                          <span className="font-mono text-[11px] text-text-muted">{gap.source}</span>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">{gap.description}</p>
                        <p className="mt-1 text-xs text-text-muted">→ {gap.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-6">
                <SectionTitle>Risks</SectionTitle>
                {analysis.risks.length === 0 ? (
                  <p className="mt-2 text-sm text-text-secondary">No risks identified.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {analysis.risks.map((risk) => (
                      <li key={risk.id} className="rounded-lg border border-border bg-bg p-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={risk.severity === "high" ? "red" : risk.severity === "medium" ? "amber" : "zinc"}>
                            {risk.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">{risk.description}</p>
                        <p className="mt-1 text-xs text-text-muted">→ {risk.mitigation}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card className="p-6">
              <SectionTitle>Recommendations</SectionTitle>
              <ul className="mt-3 space-y-2">
                {analysis.recommendations.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3">
                    <Badge tone={rec.origin === "derived" ? "emerald" : "indigo"}>
                      {rec.origin === "derived" ? "DERIVED" : "AI-DERIVED"}
                    </Badge>
                    <span className="text-sm text-text-secondary">{rec.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
