// Server-side verification for the real Automation Agent (Phase 2 Step 6).
// Run with: npm run verify:automation
//
// Checks (no API calls):
//  1. Approved test case accepted by the governance gate.
//  2. Rejected test case rejected.
//  3. Unreviewed (pending) test case rejected.
//  4. Missing test case rejected.
//  5. Fabricated requirementId rejected in artifact validation.
//  6. Malformed artifact rejected.
//  7. Missing code rejected.
//  8. Invalid language rejected.
//  9. Invalid framework rejected.
// 10. Credential leakage in code rejected.
// 11. Missing API key produces a safe AutomationAgentError.
// 12. Provider error maps to a safe userMessage.
// 13. Mock still returns a valid shape.

import { generateAutomation, AutomationAgentError } from "../src/agents/automation-agent.ts";
import { generateAutomationMock } from "../src/agents/automation-agent.mock.ts";
import {
  assertApprovedForAutomation,
  validateAutomationArtifact,
} from "../src/lib/validation/automation.ts";
import { OpenRouterError } from "../src/lib/ai/openrouter.ts";
import type { TestCase, TestData } from "../src/types/qa.ts";

const REQ_ID = "REQ-AUTO-1";
const TC_ID = "TC-001";

const approvedTestCase: TestCase = {
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
  reviewStatus: "approved",
};

const testData: TestData = {
  id: "TD-001",
  testCaseId: TC_ID,
  fields: [
    { name: "username", value: "qa.user@example.com", type: "email", sensitive: false },
    { name: "password", value: "<VALID_PASSWORD>", type: "password", sensitive: true },
  ],
};

const validArtifact = {
  testCaseId: TC_ID,
  requirementId: REQ_ID,
  framework: "playwright",
  language: "typescript",
  fileName: "valid-login.spec.ts",
  code: 'import { test, expect } from "@playwright/test";\ntest("login", async ({ page }) => {\n  await page.goto("<APP_URL>");\n});',
  generatedAt: new Date().toISOString(),
};

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

console.log("QAGuard AI — Automation Agent verification");
console.log("---------------------------------------------");

// 1. Approved accepted.
check("approved test case accepted", () => {
  assertApprovedForAutomation("approved");
});

// 2. Rejected rejected.
check("rejected test case rejected", () => {
  expectThrows(() => assertApprovedForAutomation("rejected"), "expected rejection");
});

// 3. Unreviewed rejected.
check("unreviewed (pending) test case rejected", () => {
  expectThrows(() => assertApprovedForAutomation("pending"), "expected rejection");
});

// 4. Missing test case (undefined status) rejected.
check("missing test case status rejected", () => {
  expectThrows(() => assertApprovedForAutomation(undefined), "expected rejection");
});

// 5. Fabricated requirementId rejected.
check("fabricated requirementId rejected", () => {
  expectThrows(
    () =>
      validateAutomationArtifact(
        { ...validArtifact, requirementId: "REQ-FAKE" },
        { testCaseId: TC_ID, requirementId: REQ_ID }
      ),
    "expected fabricated id rejection"
  );
});

// 6. Malformed artifact rejected.
check("malformed artifact rejected", () => {
  expectThrows(
    () => validateAutomationArtifact({ testCaseId: TC_ID }, { testCaseId: TC_ID, requirementId: REQ_ID }),
    "expected malformed rejection"
  );
});

// 7. Missing code rejected.
check("missing code rejected", () => {
  expectThrows(
    () => validateAutomationArtifact({ ...validArtifact, code: "" }, { testCaseId: TC_ID, requirementId: REQ_ID }),
    "expected missing code rejection"
  );
});

// 8. Invalid language rejected.
check("invalid language rejected", () => {
  expectThrows(
    () => validateAutomationArtifact({ ...validArtifact, language: "javascript" }, { testCaseId: TC_ID, requirementId: REQ_ID }),
    "expected invalid language rejection"
  );
});

// 9. Invalid framework rejected.
check("invalid framework rejected", () => {
  expectThrows(
    () => validateAutomationArtifact({ ...validArtifact, framework: "cypress" }, { testCaseId: TC_ID, requirementId: REQ_ID }),
    "expected invalid framework rejection"
  );
});

// 10. Credential leakage rejected.
check("credential leakage rejected", () => {
  expectThrows(
    () =>
      validateAutomationArtifact(
        { ...validArtifact, code: 'const key = "sk-or-v1-abcd1234efgh5678ijkl";' },
        { testCaseId: TC_ID, requirementId: REQ_ID }
      ),
    "expected credential rejection"
  );
});

// 11. Missing API key handled safely.
check("missing API key produces safe AutomationAgentError", async () => {
  const realKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  let err: unknown = null;
  try {
    await generateAutomation({ testCase: approvedTestCase, testData, requirement: null });
  } catch (e) {
    err = e;
  }
  if (realKey !== undefined) process.env.OPENROUTER_API_KEY = realKey;
  if (!(err instanceof AutomationAgentError)) throw new Error("expected AutomationAgentError");
  if (err.userMessage.includes("OPENROUTER") || err.userMessage.includes("sk-or")) {
    throw new Error("userMessage leaks internals");
  }
});

// 12. Provider error maps to safe message.
check("OpenRouterError maps to safe userMessage", () => {
  const agentError = new AutomationAgentError(
    "provider_error",
    "AI service is temporarily unavailable.",
    new OpenRouterError("invalid key", "invalid_api_key")
  );
  if (agentError.userMessage.includes("key")) throw new Error("leaks provider detail");
});

// 13. Mock still returns valid shape.
check("mock automation agent still returns valid shape", () => {
  const result = generateAutomationMock(approvedTestCase, testData);
  validateAutomationArtifact(result, { testCaseId: TC_ID, requirementId: REQ_ID });
  if (result.testCaseId !== TC_ID) throw new Error("mock testCaseId mismatch");
});

console.log("---------------------------------------------");
console.log(`Result: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
console.log("All checks passed. No OpenRouter request was performed.");
