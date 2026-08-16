// Server-side validation for TestCase[] returned by the LLM Test Engine.
// The LLM output is untrusted external data — validate every field before it
// reaches the application. Same philosophy as analysis.ts; no schema library.

import type {
  TestCase,
  TestCaseType,
  TestDataSource,
  TestPriority,
  TestStep,
} from "@/types/qa";

export class TestCasesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestCasesValidationError";
  }
}

const TEST_CASE_TYPES: TestCaseType[] = [
  "positive",
  "negative",
  "boundary",
  "validation",
  "security",
  "regression",
];

const TEST_PRIORITIES: TestPriority[] = ["low", "medium", "high", "critical"];

const REVIEW_STATUSES = ["pending", "approved", "rejected", "modified"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(message: string): never {
  throw new TestCasesValidationError(message);
}

/**
 * Normalize a model-provided source into the TestDataSource contract.
 * The model may return labels like "Acceptance Criteria #1", "AI-Derived",
 * "derived from AC #2", or "requirement". Only accept known shapes; anything
 * unrecognized is rejected (no silent fabrication of traceability).
 */
function normalizeSource(raw: unknown): TestDataSource {
  if (typeof raw !== "string") fail("source must be a string");
  const s = raw.trim();

  if (s === "AI-Derived" || s.toLowerCase() === "ai derived" || s.toLowerCase() === "ai") {
    return "AI-Derived";
  }
  const acMatch = s.match(/acceptance\s*criteri[ao]n?\s*#?(\d+)/i);
  if (acMatch) {
    const n = Number(acMatch[1]);
    if (n >= 1 && n <= 5) {
      return `Acceptance Criteria #${n}` as TestDataSource;
    }
  }
  // Bare "Acceptance Criteria" with no number → default to #1.
  if (/acceptance\s*criteri/i.test(s)) {
    return "Acceptance Criteria #1";
  }
  fail(`source is not a recognized traceability value: ${s}`);
}

function normalizeStep(raw: unknown, index: number): TestStep {
  if (!isRecord(raw)) fail(`steps[${index}] is not an object`);
  const stepNumber = raw.stepNumber;
  if (
    typeof stepNumber !== "number" ||
    !Number.isInteger(stepNumber) ||
    stepNumber < 1
  ) {
    fail(`steps[${index}].stepNumber must be a positive integer`);
  }
  if (!isNonEmptyString(raw.action)) {
    fail(`steps[${index}].action must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.expectedResult)) {
    fail(`steps[${index}].expectedResult must be a non-empty string`);
  }
  return {
    stepNumber,
    action: (raw.action as string).trim(),
    testData: typeof raw.testData === "string" ? raw.testData.trim() : "",
    expectedResult: (raw.expectedResult as string).trim(),
  };
}

function normalizeTestCase(raw: unknown, index: number, expectedRequirementId: string): TestCase {
  if (!isRecord(raw)) fail(`testCases[${index}] is not an object`);

  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    fail(`testCases[${index}].id must be a non-empty string`);
  }
  // Traceability: test case must reference the original requirement.
  if (raw.requirementId !== expectedRequirementId) {
    fail(
      `testCases[${index}].requirementId mismatch: expected ${expectedRequirementId}, got ${String(raw.requirementId)}`
    );
  }
  if (!isNonEmptyString(raw.title)) {
    fail(`testCases[${index}].title must be a non-empty string`);
  }
  if (!isNonEmptyString(raw.description)) {
    fail(`testCases[${index}].description must be a non-empty string`);
  }
  const type = raw.type;
  if (!TEST_CASE_TYPES.includes(type as TestCaseType)) {
    fail(`testCases[${index}].type is invalid: ${String(type)}`);
  }
  const priority = raw.priority;
  if (!TEST_PRIORITIES.includes(priority as TestPriority)) {
    fail(`testCases[${index}].priority is invalid: ${String(priority)}`);
  }
  const reviewStatus = raw.reviewStatus ?? "pending";
  if (!REVIEW_STATUSES.includes(reviewStatus as (typeof REVIEW_STATUSES)[number])) {
    fail(`testCases[${index}].reviewStatus is invalid: ${String(reviewStatus)}`);
  }
  if (!Array.isArray(raw.preconditions)) {
    fail(`testCases[${index}].preconditions must be an array`);
  }
  for (const [pi, p] of raw.preconditions.entries()) {
    if (typeof p !== "string") {
      fail(`testCases[${index}].preconditions[${pi}] must be a string`);
    }
  }
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    fail(`testCases[${index}].steps must be a non-empty array`);
  }
  if (!isNonEmptyString(raw.expectedResult)) {
    fail(`testCases[${index}].expectedResult must be a non-empty string`);
  }

  return {
    id: (raw.id as string).trim(),
    requirementId: expectedRequirementId,
    title: (raw.title as string).trim(),
    description: (raw.description as string).trim(),
    type: type as TestCaseType,
    priority: priority as TestPriority,
    source: normalizeSource(raw.source),
    preconditions: raw.preconditions.map((p) => (p as string).trim()),
    steps: raw.steps.map((s, i) => normalizeStep(s, i)),
    expectedResult: (raw.expectedResult as string).trim(),
    reviewStatus: reviewStatus as TestCase["reviewStatus"],
  };
}

/**
 * Validate and normalize raw LLM JSON into TestCase[].
 * Throws TestCasesValidationError on malformed output — never silently repairs.
 */
export function validateTestCases(
  raw: unknown,
  expectedRequirementId: string
): TestCase[] {
  if (!isRecord(raw)) fail("response is not an object");
  if (!Array.isArray(raw.testCases)) fail("testCases must be an array");
  if (raw.testCases.length === 0) fail("testCases must not be empty");

  return raw.testCases.map((tc, i) =>
    normalizeTestCase(tc, i, expectedRequirementId)
  );
}
