// Server-side validation for RequirementAnalysis returned by the LLM.
// The LLM output is untrusted external data — validate every field before it
// reaches the application. No external schema library; lightweight by design.

import { makeId } from "@/lib/utils/traceability";
import type {
  Recommendation,
  RecommendationType,
  RequirementAnalysis,
  RequirementGap,
  RequirementGapType,
  RequirementRisk,
} from "@/types/qa";

export class AnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

const GAP_TYPES: RequirementGapType[] = [
  "missing_acceptance_criteria",
  "ambiguous",
  "unverifiable",
  "unclear_error_handling",
];

const RISK_SEVERITIES = ["low", "medium", "high"] as const;

const RECOMMENDATION_TYPES: RecommendationType[] = [
  "clarity",
  "testability",
  "coverage",
  "security",
];

const RECOMMENDATION_ORIGINS = ["derived", "ai"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function fail(message: string): never {
  throw new AnalysisValidationError(message);
}

function normalizeGap(raw: unknown, index: number): RequirementGap {
  if (!isRecord(raw)) fail(`gaps[${index}] is not an object`);
  const type = raw.type;
  if (!GAP_TYPES.includes(type as RequirementGapType)) {
    fail(`gaps[${index}].type is invalid: ${String(type)}`);
  }
  if (!isNonEmptyString(raw.description)) {
    fail(`gaps[${index}].description must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.suggestion)) {
    fail(`gaps[${index}].suggestion must be a non-empty string`);
  }
  // Source classification: allow requirement/acceptance_criteria/ai_derived
  // style values from the model, normalized into the contract.
  let source: RequirementGap["source"] = "Description";
  const rawSource = typeof raw.source === "string" ? raw.source.toLowerCase() : "";
  if (rawSource.includes("acceptance")) {
    source = "Acceptance Criteria";
  }
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : makeId("GAP"),
    type: type as RequirementGapType,
    description: (raw.description as string).trim(),
    suggestion: (raw.suggestion as string).trim(),
    source,
  };
}

function normalizeRisk(raw: unknown, index: number): RequirementRisk {
  if (!isRecord(raw)) fail(`risks[${index}] is not an object`);
  const severity = raw.severity;
  if (!RISK_SEVERITIES.includes(severity as (typeof RISK_SEVERITIES)[number])) {
    fail(`risks[${index}].severity is invalid: ${String(severity)}`);
  }
  if (!isNonEmptyString(raw.description)) {
    fail(`risks[${index}].description must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.mitigation)) {
    fail(`risks[${index}].mitigation must be a non-empty string`);
  }
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : makeId("RSK"),
    severity: severity as RequirementRisk["severity"],
    description: (raw.description as string).trim(),
    mitigation: (raw.mitigation as string).trim(),
  };
}

function normalizeRecommendation(raw: unknown, index: number): Recommendation {
  if (!isRecord(raw)) fail(`recommendations[${index}] is not an object`);
  const type = raw.type;
  if (!RECOMMENDATION_TYPES.includes(type as RecommendationType)) {
    fail(`recommendations[${index}].type is invalid: ${String(type)}`);
  }
  const origin = raw.origin;
  if (!RECOMMENDATION_ORIGINS.includes(origin as (typeof RECOMMENDATION_ORIGINS)[number])) {
    fail(`recommendations[${index}].origin is invalid: ${String(origin)}`);
  }
  if (!isNonEmptyString(raw.text)) {
    fail(`recommendations[${index}].text must be a non-empty string`);
  }
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : makeId("REC"),
    type: type as RecommendationType,
    text: (raw.text as string).trim(),
    origin: origin as Recommendation["origin"],
  };
}

/**
 * Validate and normalize raw LLM JSON into a RequirementAnalysis.
 * Throws AnalysisValidationError on malformed output — never silently clamps.
 */
export function validateRequirementAnalysis(
  raw: unknown,
  expectedRequirementId: string
): RequirementAnalysis {
  if (!isRecord(raw)) fail("analysis is not an object");

  // Traceability: the analysis must stay tied to the original requirement.
  if (raw.requirementId !== expectedRequirementId) {
    fail(
      `requirementId mismatch: expected ${expectedRequirementId}, got ${String(raw.requirementId)}`
    );
  }

  for (const key of [
    "completenessScore",
    "clarityScore",
    "testabilityScore",
    "overallScore",
  ] as const) {
    if (!isFiniteScore(raw[key])) {
      fail(`${key} must be a finite number between 0 and 100`);
    }
  }

  if (!Array.isArray(raw.gaps)) fail("gaps must be an array");
  if (!Array.isArray(raw.risks)) fail("risks must be an array");
  if (!Array.isArray(raw.recommendations)) fail("recommendations must be an array");

  return {
    requirementId: raw.requirementId as string,
    completenessScore: raw.completenessScore as number,
    clarityScore: raw.clarityScore as number,
    testabilityScore: raw.testabilityScore as number,
    overallScore: raw.overallScore as number,
    gaps: raw.gaps.map((g, i) => normalizeGap(g, i)),
    risks: raw.risks.map((r, i) => normalizeRisk(r, i)),
    recommendations: raw.recommendations.map((r, i) => normalizeRecommendation(r, i)),
  };
}
