// Server-side validation for TestData[] returned by the LLM Test Data Agent.
// The LLM output is untrusted external data — validate every field, and guard
// against obvious credential leakage, before it reaches the application.

import type { TestData, TestDataField, TestDataFieldType } from "@/types/qa";

export class TestDataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestDataValidationError";
  }
}

const FIELD_TYPES: TestDataFieldType[] = [
  "string",
  "email",
  "password",
  "number",
  "url",
  "boolean",
  "date",
  "uuid",
  "role",
  "phone",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(message: string): never {
  throw new TestDataValidationError(message);
}

// ---------------------------------------------------------------------------
// Credential / secret guard
// ---------------------------------------------------------------------------

const CREDENTIAL_PATTERNS: RegExp[] = [
  /sk-or-v1-[a-zA-Z0-9]+/i, // OpenRouter-style keys
  /sk-[a-zA-Z0-9]{20,}/i, // generic secret keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // private keys
  /Bearer [a-zA-Z0-9._~+/=-]{20,}/i, // bearer tokens
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWT-like
  /AKIA[0-9A-Z]{16}/, // AWS-style access keys
  /ghp_[a-zA-Z0-9]{30,}/, // GitHub PATs
  /xox[baprs]-[a-zA-Z0-9-]{10,}/i, // Slack tokens
];

function looksLikeCredential(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((re) => re.test(value));
}

// ---------------------------------------------------------------------------
// Field + item normalization
// ---------------------------------------------------------------------------

function normalizeField(raw: unknown, index: number): TestDataField {
  if (!isRecord(raw)) fail(`fields[${index}] is not an object`);
  if (!isNonEmptyString(raw.name)) {
    fail(`fields[${index}].name must be a non-empty string`);
  }
  if (typeof raw.value !== "string") {
    fail(`fields[${index}].value must be a string`);
  }
  const type = raw.type;
  if (!FIELD_TYPES.includes(type as TestDataFieldType)) {
    fail(`fields[${index}].type is invalid: ${String(type)}`);
  }
  if (typeof raw.sensitive !== "boolean") {
    fail(`fields[${index}].sensitive must be a boolean`);
  }
  // Safety guard: reject obvious credentials in generated data.
  if (looksLikeCredential(raw.value)) {
    fail(
      `fields[${index}].value appears to contain a real credential; synthetic placeholders are required`
    );
  }
  return {
    name: (raw.name as string).trim(),
    value: raw.value as string,
    type: type as TestDataFieldType,
    sensitive: raw.sensitive as boolean,
  };
}

function normalizeTestDataItem(
  raw: unknown,
  index: number,
  expectedTestCaseIds: Set<string>
): TestData {
  if (!isRecord(raw)) fail(`testData[${index}] is not an object`);
  if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
    fail(`testData[${index}].id must be a non-empty string`);
  }
  // Traceability: test data must reference a real, known test case.
  if (typeof raw.testCaseId !== "string" || !expectedTestCaseIds.has(raw.testCaseId)) {
    fail(
      `testData[${index}].testCaseId is invalid or fabricated: ${String(raw.testCaseId)}`
    );
  }
  if (!Array.isArray(raw.fields) || raw.fields.length === 0) {
    fail(`testData[${index}].fields must be a non-empty array`);
  }
  return {
    id: (raw.id as string).trim(),
    testCaseId: raw.testCaseId as string,
    fields: raw.fields.map((f, i) => normalizeField(f, i)),
  };
}

/**
 * Validate and normalize raw LLM JSON into TestData[].
 * Throws TestDataValidationError on malformed output or credential-like values.
 */
export function validateTestData(
  raw: unknown,
  expectedTestCaseIds: string[]
): TestData[] {
  if (!isRecord(raw)) fail("response is not an object");
  if (!Array.isArray(raw.testData)) fail("testData must be an array");
  if (raw.testData.length === 0) fail("testData must not be empty");

  const knownIds = new Set(expectedTestCaseIds);
  if (knownIds.size === 0) fail("no valid test case ids provided for traceability");

  return raw.testData.map((item, i) => normalizeTestDataItem(item, i, knownIds));
}
