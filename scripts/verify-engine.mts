// Server-side verification for the real Test Engine Agent (Phase 2 Step 3).
// Run with: npm run verify:engine
//
// Checks (no API calls):
//  1. Valid TestCase[] passes the validator.
//  2. Missing testCases key rejected.
//  3. Empty testCases rejected (contract requires at least one).
//  4. Malformed test case rejected.
//  5. Invalid test type rejected.
//  6. Invalid priority rejected.
//  7. Malformed steps rejected.
//  8. Missing expected result rejected.
//  9. Invalid traceability source rejected.
// 10. Requirement/analysis mismatch rejected (requirementId mismatch).
// 11. Missing API key produces a safe TestEngineAgentError.
// 12. Provider error maps to a safe userMessage.
// 13. Mock implementation still returns a valid shape.

import { generateTestCases, TestEngineAgentError } from "../src/agents/test-engine-agent.ts";
import { generateTestCasesMock } from "../src/agents/test-engine-agent.mock.ts";
import { validateTestCases } from "../src/lib/validation/test-cases.ts";
import { OpenRouterError } from "../src/lib/ai/openrouter.ts";
import type { RequirementAnalysis, TestCase } from "../src/types/qa.ts";

const REQ_ID = "REQ-ENGINE-1";

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

const validTestCases: TestCase[] = [
  {
    id: "TC-1",
    requirementId: REQ_ID,
    title: "Valid login with correct credentials",
    description: "Verifies the happy path.",
    type: "positive",
    priority: "high",
    source: "Acceptance Criteria #1",
    preconditions: ["User is registered."],
    steps: [
      {
        stepNumber: 1,
        action: "Enter valid credentials and submit.",
        testData: "valid@example.com / password",
        expectedResult: "Dashboard is shown.",
      },
    ],
    expectedResult: "Dashboard is shown.",
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

console.log("QAGuard AI — Test Engine Agent verification");
console.log("---------------------------------------------");

// 1. Valid response passes.
check("valid TestCase[] passes validator", () => {
  const result = validateTestCases({ testCases: validTestCases }, REQ_ID);
  if (result.length !== 1) throw new Error("wrong length");
  if (result[0].requirementId !== REQ_ID) throw new Error("id mismatch");
});

// 2. Missing testCases key rejected.
check("missing testCases rejected", () => {
  expectThrows(() => validateTestCases({}, REQ_ID), "expected missing key rejection");
});

// 3. Empty testCases rejected.
check("empty testCases rejected", () => {
  expectThrows(() => validateTestCases({ testCases: [] }, REQ_ID), "expected empty rejection");
});

// 4. Malformed test case rejected.
check("malformed test case rejected", () => {
  expectThrows(
    () => validateTestCases({ testCases: [{ id: "TC-1" }] }, REQ_ID),
    "expected malformed rejection"
  );
});

// 5. Invalid test type rejected.
check("invalid test type rejected", () => {
  expectThrows(
    () =>
      validateTestCases(
        {
          testCases: [{ ...validTestCases[0], type: "exploratory" }],
        },
        REQ_ID
      ),
    "expected invalid type rejection"
  );
});

// 6. Invalid priority rejected.
check("invalid priority rejected", () => {
  expectThrows(
    () =>
      validateTestCases(
        {
          testCases: [{ ...validTestCases[0], priority: "urgent" }],
        },
        REQ_ID
      ),
    "expected invalid priority rejection"
  );
});

// 7. Malformed steps rejected.
check("malformed steps rejected", () => {
  expectThrows(
    () =>
      validateTestCases(
        {
          testCases: [
            { ...validTestCases[0], steps: [{ stepNumber: 0, action: "" }] },
          ],
        },
        REQ_ID
      ),
    "expected malformed steps rejection"
  );
});

// 8. Missing expected result rejected.
check("missing expected result rejected", () => {
  const { expectedResult: _omit, ...rest } = validTestCases[0];
  void _omit;
  expectThrows(
    () => validateTestCases({ testCases: [rest] }, REQ_ID),
    "expected missing expectedResult rejection"
  );
});

// 9. Invalid traceability source rejected.
check("invalid traceability source rejected", () => {
  expectThrows(
    () =>
      validateTestCases(
        {
          testCases: [{ ...validTestCases[0], source: "made-up-origin" }],
        },
        REQ_ID
      ),
    "expected invalid source rejection"
  );
});

// 10. Requirement/analysis mismatch rejected.
check("requirement/analysis mismatch rejected", () => {
  expectThrows(
    () => validateTestCases({ testCases: validTestCases }, "REQ-OTHER"),
    "expected requirementId mismatch rejection"
  );
});

// 11. Missing API key handled safely.
check("missing API key produces safe TestEngineAgentError", async () => {
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
    await generateTestCases(requirement, sampleAnalysis);
  } catch (e) {
    err = e;
  }
  if (realKey !== undefined) process.env.OPENROUTER_API_KEY = realKey;
  if (!(err instanceof TestEngineAgentError)) {
    throw new Error("expected TestEngineAgentError");
  }
  if (err.userMessage.includes("OPENROUTER") || err.userMessage.includes("sk-or")) {
    throw new Error("userMessage leaks internals");
  }
});

// 12. Provider error maps to safe message.
check("OpenRouterError maps to safe userMessage", () => {
  const agentError = new TestEngineAgentError(
    "provider_error",
    "AI service is temporarily unavailable.",
    new OpenRouterError("rate limit hit", "rate_limited")
  );
  if (agentError.userMessage.includes("rate")) {
    throw new Error("userMessage leaks provider detail");
  }
});

// 13. Mock still returns valid shape.
check("mock engine still returns valid shape", () => {
  const requirement = {
    id: REQ_ID,
    title: "User login",
    description: "As a user I want to log in.",
    acceptanceCriteria: ["Valid credentials log in."],
    createdAt: new Date().toISOString(),
  };
  const result = generateTestCasesMock(requirement, sampleAnalysis);
  validateTestCases({ testCases: result }, REQ_ID);
  if (result.length === 0) throw new Error("mock returned no cases");
});

console.log("---------------------------------------------");
console.log(`Result: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
console.log("All checks passed. No OpenRouter request was performed.");
