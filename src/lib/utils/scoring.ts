// Scoring helpers shared by agents and the quality dashboard.
// All scores are deterministic and derived from real input.

import { clampScore } from "@/lib/utils/traceability";
import type {
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
  AutomationArtifact,
} from "@/types/qa";

/** Word count of a string. */
export function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/** Confidence of a "requirement completeness" signal from text length/detail. */
export function completenessSignal(requirement: Requirement): number {
  const descriptionWords = wordCount(requirement.description);
  const criteriaCount = requirement.acceptanceCriteria.length;
  const title = requirement.title.trim().length > 0 ? 1 : 0;
  const score =
    title * 10 +
    Math.min(40, descriptionWords * 1.2) +
    Math.min(50, criteriaCount * 12);
  return clampScore(score);
}

/** Clarity heuristic: penalizes vague phrases, rewards specificity. */
export function claritySignal(requirement: Requirement): number {
  const text = `${requirement.title} ${requirement.description} ${requirement.acceptanceCriteria.join(
    " "
  )}`.toLowerCase();
  const vagueTerms = [
    "etc",
    "and so on",
    "should",
    "probably",
    "maybe",
    "somehow",
    "as soon as possible",
    "fast",
  ];
  const found = vagueTerms.filter((t) => text.includes(t)).length;
  const base = 85;
  return clampScore(base - found * 8 - (wordCount(text) < 20 ? 10 : 0));
}

/** Testability heuristic: rewards criteria phrased as verifiable statements. */
export function testabilitySignal(requirement: Requirement): number {
  const criteria = requirement.acceptanceCriteria;
  if (criteria.length === 0) return 20;
  const verifiable = criteria.filter((c) =>
    /(must|should|shall|will|is|are|returns?|shows?|displays?|fails?|blocks?|allowed|required|invalid|valid)/i.test(
      c
    )
  ).length;
  return clampScore((verifiable / criteria.length) * 100);
}

/**
 * Weighted overall score of an analysis. Matches the dashboard's "Overall".
 */
export function overallFromAnalysis(
  completeness: number,
  clarity: number,
  testability: number
): number {
  return clampScore(completeness * 0.4 + clarity * 0.3 + testability * 0.3);
}

export function overallFromQuality(report: QualityReport): number {
  return clampScore(
    report.requirementCoverage * 0.25 +
      report.testCoverage * 0.25 +
      report.traceabilityScore * 0.2 +
      report.testabilityScore * 0.15 +
      report.aiConfidence * 0.15
  );
}

/** Build the deterministic QualityReport from real pipeline state. */
export function computeQualityReport(args: {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  artifacts: AutomationArtifact[];
}): QualityReport {
  const { requirement, analysis, testCases, artifacts } = args;

  const approved = testCases.filter((tc) => tc.reviewStatus === "approved").length;
  const rejected = testCases.filter((tc) => tc.reviewStatus === "rejected").length;
  const aiDerived = testCases.filter((tc) => tc.source === "AI-Derived").length;

  const testCoverage =
    testCases.length > 0
      ? clampScore((approved / testCases.length) * 100)
      : 0;
  const requirementCoverage =
    testCases.length > 0 && requirement
      ? clampScore(
          (testCases.filter((tc) => tc.requirementId === requirement.id).length /
            testCases.length) *
            100
        )
      : 0;
  const traceabilityScore =
    testCases.length > 0
      ? clampScore(
          ((testCases.filter((tc) => tc.source !== "AI-Derived").length +
            artifacts.length) /
            (testCases.length + artifacts.length + 1)) *
            100
        )
      : 0;
  const testabilityScore = analysis?.testabilityScore ?? 0;
  const aiConfidence =
    testCases.length > 0 ? clampScore((approved / testCases.length) * 100) : 0;
  const requirementGaps = analysis?.gaps.length ?? 0;

  const report: QualityReport = {
    requirementCoverage,
    testCoverage,
    traceabilityScore,
    testabilityScore,
    aiConfidence,
    requirementGaps,
    aiDerivedTests: aiDerived,
    approvedTests: approved,
    rejectedTests: rejected,
    overallScore: 0,
  };
  report.overallScore = overallFromQuality(report);
  return report;
}
