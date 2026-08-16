// Server-side validation for AutomationArtifact returned by the LLM
// Automation Agent. Also enforces the governance rule: only approved test
// cases may be automated.

import type { AutomationArtifact, ReviewStatus } from "@/types/qa";

export class AutomationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationValidationError";
  }
}

const CREDENTIAL_PATTERNS: RegExp[] = [
  /sk-or-v1-[a-zA-Z0-9]+/i,
  /sk-[a-zA-Z0-9]{20,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /Bearer [a-zA-Z0-9._~+/=-]{20,}/i,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{30,}/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/i,
];

function looksLikeCredential(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((re) => re.test(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(message: string): never {
  throw new AutomationValidationError(message);
}

/** Governance gate: only approved test cases may be automated. */
export function assertApprovedForAutomation(
  reviewStatus: ReviewStatus | undefined
): void {
  if (reviewStatus !== "approved") {
    fail(
      "test case is not approved — only approved test cases can be automated"
    );
  }
}

/**
 * Validate and normalize raw LLM JSON into an AutomationArtifact.
 * Throws AutomationValidationError on malformed output.
 */
export function validateAutomationArtifact(
  raw: unknown,
  expected: { testCaseId: string; requirementId: string }
): AutomationArtifact {
  if (!isRecord(raw)) fail("artifact is not an object");

  // Traceability: no fabricated ids.
  if (raw.testCaseId !== expected.testCaseId) {
    fail(
      `testCaseId mismatch: expected ${expected.testCaseId}, got ${String(raw.testCaseId)}`
    );
  }
  if (raw.requirementId !== expected.requirementId) {
    fail(
      `requirementId mismatch: expected ${expected.requirementId}, got ${String(raw.requirementId)}`
    );
  }
  if (raw.framework !== "playwright") {
    fail(`framework must be "playwright", got ${String(raw.framework)}`);
  }
  if (raw.language !== "typescript") {
    fail(`language must be "typescript", got ${String(raw.language)}`);
  }
  if (!isNonEmptyString(raw.fileName)) {
    fail("fileName must be a non-empty string");
  }
  if (!isNonEmptyString(raw.code)) {
    fail("code must be a non-empty string");
  }
  if (looksLikeCredential(raw.code)) {
    fail("generated code appears to contain a real credential");
  }
  if (typeof raw.generatedAt !== "string" || raw.generatedAt.length === 0) {
    fail("generatedAt must be a non-empty string");
  }

  return {
    testCaseId: expected.testCaseId,
    requirementId: expected.requirementId,
    framework: "playwright",
    language: "typescript",
    fileName: (raw.fileName as string).trim(),
    code: raw.code as string,
    generatedAt: raw.generatedAt as string,
  };
}
