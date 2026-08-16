"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { analyzeRequirement } from "@/agents/requirement-agent";
import { generateTestCases } from "@/agents/test-engine-agent";
import { generateTestData } from "@/agents/test-data-agent";
import { generateQualityReport } from "@/agents/quality-agent";
import { useWorkflow } from "@/lib/state/workflow-provider";
import { validateRequirementInput } from "@/lib/validation/requirement";
import { makeId } from "@/lib/utils/traceability";
import type { Requirement } from "@/types/qa";
import { ScoreRing } from "@/components/ui/score-ring";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Badge } from "@/components/ui/badge";

export default function RequirementsPage() {
  const { state, setRequirement, setAnalysis, setTestCases, setTestData, setQualityReport } =
    useWorkflow();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

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
    setRunning(true);

    const requirement: Requirement = {
      id: makeId("REQ"),
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: nonEmptyCriteria.map((c) => c.trim()),
      createdAt: new Date().toISOString(),
    };

    // Deterministic mock pipeline — all derived from the actual input.
    const analysisResult = analyzeRequirement(requirement);
    const testCases = generateTestCases(requirement, analysisResult);
    const testData = testCases.map((tc) => generateTestData(tc));
    const qualityReport = generateQualityReport({
      requirement,
      analysis: analysisResult,
      testCases,
      artifacts: [],
    });

    // Simulate a short async "agent run" so the UI feels intentional.
    await new Promise((r) => setTimeout(r, 450));

    setRequirement(requirement);
    setAnalysis(analysisResult);
    setTestCases(testCases);
    setTestData(testData);
    setQualityReport(qualityReport);
    setRunning(false);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Requirement Analysis
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Paste a user story or requirement. The Requirement Agent derives
          scores, gaps, and risks from the actual text.
        </p>

        {/* Input card */}
        <Card className="mt-6 p-6">
          <div className="grid gap-4">
            <div>
              <label htmlFor="req-title" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Title
              </label>
              <input
                id="req-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. User can reset their password"
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
              />
            </div>
            <div>
              <label htmlFor="req-desc" className="mb-1.5 block text-sm font-medium text-zinc-300">
                User story / description
              </label>
              <textarea
                id="req-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="As a user, I want to..."
                className="w-full resize-y rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Acceptance criteria
              </label>
              <div className="space-y-2">
                {criteria.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-2.5 font-mono text-xs text-zinc-600">AC-{i + 1}</span>
                    <input
                      value={c}
                      onChange={(e) => updateCriterion(i, e.target.value)}
                      placeholder={`e.g. User receives a reset email within 30 seconds`}
                      className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(i)}
                      className="rounded-md px-2 text-zinc-600 hover:text-red-400"
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
                className="mt-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                + Add criterion
              </button>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                {errors.map((e) => (
                  <p key={e} className="text-sm text-red-300">
                    {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={running}
                className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? "Analyzing..." : "Analyze Requirement"}
              </button>
              <span className="text-xs text-zinc-600">
                Phase 1 · deterministic mock analysis
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
                  <p className="mt-2 text-sm text-zinc-500">No gaps detected.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {analysis.gaps.map((gap) => (
                      <li key={gap.id} className="rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3">
                        <div className="flex items-center gap-2">
                          <Badge tone="amber">{gap.type.replace(/_/g, " ").toUpperCase()}</Badge>
                          <span className="font-mono text-[11px] text-zinc-600">{gap.source}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">{gap.description}</p>
                        <p className="mt-1 text-xs text-zinc-500">→ {gap.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-6">
                <SectionTitle>Risks</SectionTitle>
                {analysis.risks.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No risks identified.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {analysis.risks.map((risk) => (
                      <li key={risk.id} className="rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={risk.severity === "high" ? "red" : risk.severity === "medium" ? "amber" : "zinc"}>
                            {risk.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300">{risk.description}</p>
                        <p className="mt-1 text-xs text-zinc-500">→ {risk.mitigation}</p>
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
                  <li key={rec.id} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-zinc-950/50 p-3">
                    <Badge tone={rec.origin === "derived" ? "emerald" : "indigo"}>
                      {rec.origin === "derived" ? "DERIVED" : "AI-DERIVED"}
                    </Badge>
                    <span className="text-sm text-zinc-300">{rec.text}</span>
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
