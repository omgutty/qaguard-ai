// Server-side validation for QualityReport returned by the LLM Quality Agent.
// The LLM output is untrusted external data — validate every field before it
// reaches the application. No schema library; hand-written like the others.

import { makeId } from "@/lib/utils/traceability";
import type {
  QualityFinding,
  QualityFindingCategory,
  QualityFindingSeverity,
  QualityReport,
} from "@/types/qa";

export class QualityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QualityValidationError";
  }
}

const SEVERITIES: QualityFindingSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

const CATEGORIES: QualityFindingCategory[] = [
  "missing_coverage",
  "negative_coverage",
  "boundary_coverage",
  "ambiguity",
  "risk_without_test",
  "missing_test_data",
  "traceability_gap",
  "unreviewed_test",
  "weak_test",
  "duplicate_test",
];

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
  throw new QualityValidationError(message);
}

function normalizeFinding(raw: unknown, index: number): QualityFinding {
  if (!isRecord(raw)) fail(`findings[${index}] is not an object`);
  const severity = raw.severity;
  if (!SEVERITIES.includes(severity as QualityFindingSeverity)) {
    fail(`findings[${index}].severity is invalid: ${String(severity)}`);
  }
  const category = raw.category;
  if (!CATEGORIES.includes(category as QualityFindingCategory)) {
    fail(`findings[${index}].category is invalid: ${String(category)}`);
  }
  if (!isNonEmptyString(raw.description)) {
    fail(`findings[${index}].description must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.evidence)) {
    fail(`findings[${index}].evidence must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.recommendation)) {
    fail(`findings[${index}].recommendation must be a non-empty string`);
  }
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : makeId("FND"),
    severity: severity as QualityFindingSeverity,
    category: category as QualityFindingCategory,
    description: (raw.description as string).trim(),
    evidence: (raw.evidence as string).trim(),
    recommendation: (raw.recommendation as string).trim(),
  };
}

/**
 * Validate and normalize raw LLM JSON into a QualityReport.
 * Throws QualityValidationError on malformed output — never silently clamps.
 */
export function validateQualityReport(
  raw: unknown,
  expectedRequirementId: string
): QualityReport {
  if (!isRecord(raw)) fail("report is not an object");

  // Traceability: the report must be tied to the original requirement.
  if (raw.requirementId !== expectedRequirementId) {
    fail(
      `requirementId mismatch: expected ${expectedRequirementId}, got ${String(raw.requirementId)}`
    );
  }

  for (const key of [
    "overallScore",
    "requirementCoverage",
    "testCoverage",
    "traceabilityScore",
    "testabilityScore",
    "aiConfidence",
  ] as const) {
    if (!isFiniteScore(raw[key])) {
      fail(`${key} must be a finite number between 0 and 100`);
    }
  }
  for (const key of [
    "requirementGaps",
    "aiDerivedTests",
    "approvedTests",
    "rejectedTests",
  ] as const) {
    if (typeof raw[key] !== "number" || !Number.isFinite(raw[key]) || raw[key] < 0) {
      fail(`${key} must be a non-negative finite number`);
    }
  }
  if (!Array.isArray(raw.findings)) fail("findings must be an array");

  return {
    requirementId: raw.requirementId as string,
    overallScore: raw.overallScore as number,
    requirementCoverage: raw.requirementCoverage as number,
    testCoverage: raw.testCoverage as number,
    traceabilityScore: raw.traceabilityScore as number,
    testabilityScore: raw.testabilityScore as number,
    aiConfidence: raw.aiConfidence as number,
    requirementGaps: raw.requirementGaps as number,
    aiDerivedTests: raw.aiDerivedTests as number,
    approvedTests: raw.approvedTests as number,
    rejectedTests: raw.rejectedTests as number,
    findings: raw.findings.map((f, i) => normalizeFinding(f, i)),
  };
}
