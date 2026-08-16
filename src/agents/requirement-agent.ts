// Requirement Agent — deterministic mock analysis (Phase 1).
// Phase 2: swap internals for an LLM call, keep analyzeRequirement() signature.

import {
  claritySignal,
  completenessSignal,
  overallFromAnalysis,
  testabilitySignal,
  wordCount,
} from "@/lib/utils/scoring";
import { clampScore, makeId } from "@/lib/utils/traceability";
import type {
  Recommendation,
  Requirement,
  RequirementAnalysis,
  RequirementGap,
  RequirementGapType,
  RequirementRisk,
} from "@/types/qa";

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

function detectGaps(requirement: Requirement): RequirementGap[] {
  const gaps: RequirementGap[] = [];
  const seen = new Set<string>();

  const pushGap = (
    type: RequirementGapType,
    description: string,
    suggestion: string,
    source: RequirementGap["source"]
  ) => {
    const key = `${type}-${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push({
      id: makeId("GAP"),
      type,
      description,
      suggestion,
      source,
    });
  };

  if (requirement.acceptanceCriteria.length < 3) {
    pushGap(
      "missing_acceptance_criteria",
      `Only ${requirement.acceptanceCriteria.length} acceptance criterion/criteria provided. Core behaviors may be untested.`,
      "Add acceptance criteria covering happy path, edge cases, and failure behavior.",
      "Acceptance Criteria"
    );
  }

  const lower = (
    `${requirement.title} ${requirement.description}` +
    requirement.acceptanceCriteria.join(" ")
  ).toLowerCase();
  if (vagueTerms.some((t) => lower.includes(t))) {
    pushGap(
      "ambiguous",
      "Requirement uses vague terms (e.g. 'should', 'probably', 'etc.') that are not testable as written.",
      "Replace vague terms with concrete, measurable expectations.",
      "Description"
    );
  }

  if (!/(error|invalid|fail|reject|not allowed|unauthorized)/i.test(lower)) {
    pushGap(
      "unclear_error_handling",
      "No failure/error scenarios are described. Negative-path testing cannot be derived.",
      "Describe expected behavior when inputs are invalid or a system error occurs.",
      "Description"
    );
  }

  if (
    !/(must|shall|will|returns?|shows?|displays?|fails?|blocks?)/i.test(
      requirement.acceptanceCriteria.join(" ")
    )
  ) {
    pushGap(
      "unverifiable",
      "Acceptance criteria are not phrased as verifiable outcomes, making them hard to assert in tests.",
      "Rewrite each criterion as an observable, assertable outcome.",
      "Acceptance Criteria"
    );
  }

  return gaps;
}

function detectRisks(requirement: Requirement): RequirementRisk[] {
  const risks: RequirementRisk[] = [];
  const lower = (
    `${requirement.title} ${requirement.description}` +
    requirement.acceptanceCriteria.join(" ")
  ).toLowerCase();

  if (!/(password|auth|login|session|permission|role|ssn|card|secret)/i.test(lower)) {
    risks.push({
      id: makeId("RSK"),
      severity: "medium",
      description:
        "No authentication, authorization, or sensitive-data handling is described.",
      mitigation:
        "Confirm whether the feature handles credentials or PII and add security-focused criteria.",
    });
  }

  if (wordCount(requirement.description) < 25) {
    risks.push({
      id: makeId("RSK"),
      severity: "medium",
      description:
        "Description is brief; important context may be missing for implementation.",
      mitigation:
        "Expand the description with user context, business rules, and constraints.",
    });
  }

  if (requirement.acceptanceCriteria.some((c) => c.length > 200)) {
    risks.push({
      id: makeId("RSK"),
      severity: "low",
      description:
        "One or more acceptance criteria are very long and may combine multiple behaviors.",
      mitigation:
        "Split combined criteria into single, focused, testable statements.",
    });
  }

  return risks;
}

function buildRecommendations(
  requirement: Requirement,
  analysis: RequirementAnalysis
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const push = (
    type: Recommendation["type"],
    text: string,
    origin: Recommendation["origin"]
  ) => {
    recommendations.push({ id: makeId("REC"), type, text, origin });
  };

  if (analysis.clarityScore < 70) {
    push(
      "clarity",
      "Rewrite ambiguous phrasing to remove 'should/probably/etc.' so outcomes are measurable.",
      "derived"
    );
  }
  if (analysis.testabilityScore < 60) {
    push(
      "testability",
      "Phrase each acceptance criterion as a verifiable outcome (must/shall/returns).",
      "derived"
    );
  }
  if (analysis.completenessScore < 60) {
    push(
      "coverage",
      "Add acceptance criteria for edge cases and negative scenarios to raise completeness.",
      "ai"
    );
  }

  const lower = (
    `${requirement.title} ${requirement.description}` +
    requirement.acceptanceCriteria.join(" ")
  ).toLowerCase();
  if (!/(error|invalid|fail)/i.test(lower)) {
    push(
      "coverage",
      "Consider a dedicated error-handling criterion (e.g. 'shows a clear message when input is invalid').",
      "ai"
    );
  }
  if (/(password|login|auth)/i.test(lower)) {
    push(
      "security",
      "Security-sensitive criteria (auth, passwords) should be covered by explicit negative and boundary tests.",
      "ai"
    );
  }

  return recommendations;
}

export function analyzeRequirement(
  requirement: Requirement
): RequirementAnalysis {
  const completenessScore = completenessSignal(requirement);
  const clarityScore = claritySignal(requirement);
  const testabilityScore = testabilitySignal(requirement);
  const overallScore = overallFromAnalysis(
    completenessScore,
    clarityScore,
    testabilityScore
  );

  const gaps = detectGaps(requirement);
  const risks = detectRisks(requirement);

  const analysis: RequirementAnalysis = {
    requirementId: requirement.id,
    completenessScore: clampScore(completenessScore),
    clarityScore: clampScore(clarityScore),
    testabilityScore: clampScore(testabilityScore),
    overallScore: clampScore(overallScore),
    gaps,
    risks,
    recommendations: [],
  };
  analysis.recommendations = buildRecommendations(requirement, analysis);
  return analysis;
}
