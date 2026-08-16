// Test Data Agent — deterministic mock test data generation (Phase 1).
// Preserved for reference/testing. The production agent (test-data-agent.ts)
// now uses the real LLM; there is NO silent fallback to this mock.

import { makeId } from "@/lib/utils/traceability";
import type { TestCase, TestData, TestDataField } from "@/types/qa";

const EMAILS = ["alice.smith", "bob.jones", "carol.white", "dave.miller"];
const PASSWORD = "Str0ng!Passw0rd";
const ROLES = ["admin", "editor", "viewer", "qa-lead"];

function seededChoice<T>(seed: number, arr: T[]): T {
  return arr[seed % arr.length];
}

function baseFields(seed: number): TestDataField[] {
  return [
    {
      name: "username",
      value: seededChoice(seed, EMAILS).split(".").join("_"),
      type: "string",
      sensitive: false,
    },
    {
      name: "email",
      value: seededChoice(seed, EMAILS) + "@example.com",
      type: "email",
      sensitive: false,
    },
    {
      name: "password",
      value: PASSWORD,
      type: "password",
      sensitive: true,
    },
    {
      name: "role",
      value: seededChoice(seed, ROLES),
      type: "role",
      sensitive: false,
    },
  ];
}

function fieldForType(type: TestCase["type"]): TestDataField[] {
  switch (type) {
    case "positive":
      return [
        { name: "amount", value: "125.00", type: "number", sensitive: false },
        { name: "notes", value: "Standard happy-path submission", type: "string", sensitive: false },
      ];
    case "negative":
      return [
        { name: "amount", value: "-1", type: "number", sensitive: false },
        { name: "notes", value: "Clearly invalid negative value", type: "string", sensitive: false },
        { name: "expectedError", value: "Amount must be a positive number", type: "string", sensitive: false },
      ];
    case "boundary":
      return [
        { name: "minValue", value: "0.01", type: "number", sensitive: false },
        { name: "maxValue", value: "9999.99", type: "number", sensitive: false },
        { name: "notes", value: "Edge-of-range boundary values", type: "string", sensitive: false },
      ];
    case "validation":
      return [
        { name: "invalidEmail", value: "not-an-email", type: "email", sensitive: false },
        { name: "notes", value: "Malformed format used for validation checks", type: "string", sensitive: false },
      ];
    case "security":
      return [
        { name: "username", value: "unauthorized_user", type: "string", sensitive: false },
        { name: "password", value: PASSWORD, type: "password", sensitive: true },
        { name: "role", value: "viewer", type: "role", sensitive: false },
        { name: "expectedStatus", value: "403", type: "string", sensitive: false },
      ];
    case "regression":
      return [
        { name: "environment", value: "staging", type: "string", sensitive: false },
        { name: "build", value: "v1.4.2", type: "string", sensitive: false },
      ];
  }
}

export function generateTestDataMock(testCase: TestCase): TestData {
  const seed = testCase.id.length + testCase.type.length;
  const fields: TestDataField[] = [
    ...baseFields(seed),
    ...fieldForType(testCase.type),
  ];
  return {
    id: makeId("TD"),
    testCaseId: testCase.id,
    fields,
  };
}
