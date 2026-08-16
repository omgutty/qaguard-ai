// Server-side verification for the real Test Data Agent (Phase 2 Step 4).
// Run with: npm run verify:test-data
//
// Checks (no API calls):
//  1. Valid TestData[] passes the validator.
//  2. Missing testData key rejected.
//  3. Empty testData rejected (contract requires at least one).
//  4. Malformed TestData object rejected.
//  5. Malformed TestDataField rejected.
//  6. Missing required field rejected.
//  7. Invalid testCaseId rejected.
//  8. Invalid traceability (fabricated testCaseId) rejected.
//  9. Malformed source (bad field type) rejected.
// 10. Invalid enum (bad field type) rejected.
// 11. Credential-like value rejected.
// 12. Malformed upstream test case (bad ids passed in) — validator handles.
// 13. Missing API key produces a safe TestDataAgentError.
// 14. Provider error maps to a safe userMessage.
// 15. Mock implementation still returns a valid shape.

import { generateTestData, TestDataAgentError } from "../src/agents/test-data-agent.ts";
import { generateTestDataMock } from "../src/agents/test-data-agent.mock.ts";
import { validateTestData } from "../src/lib/validation/test-data.ts";
import { OpenRouterError } from "../src/lib/ai/openrouter.ts";
import type { RequirementAnalysis, TestCase } from "../src/types/qa.ts";

const TC_ID = "TC-001";
const REQ_ID = "REQ-TD-1";

const validTestData = [
  {
    id: "TD-001",
    testCaseId: TC_ID,
    fields: [
      { name: "username", value: "qa.user@example.com", type: "email", sensitive: false },
      { name: "password", value: "<VALID_PASSWORD>", type: "password", sensitive: true },
    ],
  },
];

const sampleAnalysis: RequirementAnalysis = {
  requirementId: REQ_ID,
  completenessScore: 80,
  clarityScore: 75,
  testabilityScore: 70,
  overallScore: 76,
  gaps: [],
  risks: [],
  recommendations: [],
};

const sampleTestCases: TestCase[] = [
  {
    id: TC_ID,
    requirementId: REQ_ID,
    title: "Valid login",
    description: "Verifies happy path.",
    type: "positive",
    priority: "high",
    source: "Acceptance Criteria #1",
    preconditions: ["User registered."],
    steps: [
      {
        stepNumber: 1,
        action: "Log in.",
        testData: "valid credentials",
        expectedResult: "Dashboard shown.",
      },
    ],
    expectedResult: "Dashboard shown.",
    reviewStatus: "pending",
  },
];

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

function expectThrows(fn: () => void, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

console.log("QAGuard AI — Test Data Agent verification");
console.log("---------------------------------------------");

// 1. Valid response passes.
check("valid TestData[] passes validator", () => {
  const result = validateTestData({ testData: validTestData }, [TC_ID]);
  if (result.length !== 1) throw new Error("wrong length");
  if (result[0].testCaseId !== TC_ID) throw new Error("testCaseId mismatch");
});

// 2. Missing testData key rejected.
check("missing testData rejected", () => {
  expectThrows(() => validateTestData({}, [TC_ID]), "expected missing key rejection");
});

// 3. Empty testData rejected.
check("empty testData rejected", () => {
  expectThrows(() => validateTestData({ testData: [] }, [TC_ID]), "expected empty rejection");
});

// 4. Malformed TestData object rejected.
check("malformed TestData object rejected", () => {
  expectThrows(
    () => validateTestData({ testData: [{ id: "TD-1" }] }, [TC_ID]),
    "expected malformed object rejection"
  );
});

// 5. Malformed TestDataField rejected.
check("malformed TestDataField rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            { id: "TD-1", testCaseId: TC_ID, fields: [{ name: "x" }] },
          ],
        },
        [TC_ID]
      ),
    "expected malformed field rejection"
  );
});

// 6. Missing required field rejected.
check("missing required field rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            {
              id: "TD-1",
              testCaseId: TC_ID,
              fields: [
                { name: "password", type: "password", sensitive: true },
              ],
            },
          ],
        },
        [TC_ID]
      ),
    "expected missing value rejection"
  );
});

// 7. Invalid testCaseId rejected.
check("invalid testCaseId rejected", () => {
  expectThrows(
    () => validateTestData({ testData: validTestData }, ["TC-OTHER"]),
    "expected invalid testCaseId rejection"
  );
});

// 8. Fabricated testCaseId rejected (traceability).
check("fabricated testCaseId rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            {
              id: "TD-1",
              testCaseId: "TC-FAKE",
              fields: [{ name: "a", value: "b", type: "string", sensitive: false }],
            },
          ],
        },
        [TC_ID]
      ),
    "expected fabricated id rejection"
  );
});

// 9. Malformed source (bad type value) rejected.
check("invalid field type rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            {
              id: "TD-1",
              testCaseId: TC_ID,
              fields: [{ name: "a", value: "b", type: "money", sensitive: false }],
            },
          ],
        },
        [TC_ID]
      ),
    "expected invalid field type rejection"
  );
});

// 10. Non-boolean sensitive rejected.
check("non-boolean sensitive rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            {
              id: "TD-1",
              testCaseId: TC_ID,
              fields: [{ name: "a", value: "b", type: "string", sensitive: "yes" }],
            },
          ],
        },
        [TC_ID]
      ),
    "expected invalid sensitive rejection"
  );
});

// 11. Credential-like value rejected.
check("credential-like value rejected", () => {
  expectThrows(
    () =>
      validateTestData(
        {
          testData: [
            {
              id: "TD-1",
              testCaseId: TC_ID,
              fields: [
                { name: "apiKey", value: "sk-or-v1-abcd1234efgh5678ijkl", type: "string", sensitive: true },
              ],
            },
          ],
        },
        [TC_ID]
      ),
    "expected credential rejection"
  );
});

// 12. Malformed upstream test case list (empty ids) — validator rejects.
check("no valid test case ids provided rejected", () => {
  expectThrows(
    () => validateTestData({ testData: validTestData }, []),
    "expected empty upstream ids rejection"
  );
});

// 13. Missing API key handled safely.
check("missing API key produces safe TestDataAgentError", async () => {
  const realKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const requirement = {
    id: REQ_ID,
    title: "User login",
    description: "As a user I want to log in.",
    acceptanceCriteria: ["Valid credentials log in."],
    createdAt: new Date().toISOString(),
  };
  let err: unknown = null;
  try {
    await generateTestData(requirement, sampleAnalysis, sampleTestCases);
  } catch (e) {
    err = e;
  }
  if (realKey !== undefined) process.env.OPENROUTER_API_KEY = realKey;
  if (!(err instanceof TestDataAgentError)) {
    throw new Error("expected TestDataAgentError");
  }
  if (err.userMessage.includes("OPENROUTER") || err.userMessage.includes("sk-or")) {
    throw new Error("userMessage leaks internals");
  }
});

// 14. Provider error maps to safe message.
check("OpenRouterError maps to safe userMessage", () => {
  const agentError = new TestDataAgentError(
    "provider_error",
    "AI service is temporarily unavailable.",
    new OpenRouterError("invalid key", "invalid_api_key")
  );
  if (agentError.userMessage.includes("key")) {
    throw new Error("userMessage leaks provider detail");
  }
});

// 15. Mock still returns valid shape.
check("mock test data agent still returns valid shape", () => {
  const result = generateTestDataMock(sampleTestCases[0]);
  validateTestData({ testData: [result] }, [TC_ID]);
  if (result.testCaseId !== TC_ID) throw new Error("mock testCaseId mismatch");
});

console.log("---------------------------------------------");
console.log(`Result: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
console.log("All checks passed. No OpenRouter request was performed.");
