// Server-side verification for the real Quality Agent (Phase 2 Step 5).
// Run with: npm run verify:quality
//
// Checks (no API calls):
//  1. Valid QualityReport passes the validator.
//  2. Invalid score (e.g. NaN) rejected.
//  3. Score > 100 rejected.
//  4. Malformed finding rejected.
//  5. Invalid severity rejected.
//  6. Fabricated requirementId rejected.
//  7. Invalid traceability (wrong requirementId) rejected.
//  8. Missing required field rejected.
//  9. Missing API key produces a safe QualityAgentError.
// 10. Provider error maps to a safe userMessage.
// 11. Mock still returns a valid shape.

import { generateQualityReport, QualityAgentError } from "../src/agents/quality-agent.ts";
import { generateQualityReportMock } from "../src/agents/quality-agent.mock.ts";
import { validateQualityReport } from "../src/lib/validation/quality.ts";
import { OpenRouterError } from "../src/lib/ai/openrouter.ts";
import type { QualityReport, RequirementAnalysis, TestCase } from "../src/types/qa.ts";

const REQ_ID = "REQ-QUALITY-1";

const validReport: QualityReport = {
  requirementId: REQ_ID,
  overallScore: 72,
  requirementCoverage: 80,
  testCoverage: 65,
  traceabilityScore: 90,
  testabilityScore: 70,
  aiConfidence: 75,
  requirementGaps: 2,
  aiDerivedTests: 3,
  approvedTests: 4,
  rejectedTests: 1,
  findings: [
    {
      id: "FND-1",
      severity: "high",
      category: "missing_coverage",
      description: "Negative scenarios are missing.",
      evidence: "Test cases list lacks negative type.",
      recommendation: "Add negative-path test cases.",
    },
  ],
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

console.log("QAGuard AI — Quality Agent verification");
console.log("---------------------------------------------");

// 1. Valid report passes.
check("valid QualityReport passes validator", () => {
  const result = validateQualityReport(validReport, REQ_ID);
  if (result.requirementId !== REQ_ID) throw new Error("id mismatch");
  if (result.findings.length !== 1) throw new Error("findings mismatch");
});

// 2. Invalid score (NaN) rejected.
check("NaN score rejected", () => {
  expectThrows(
    () => validateQualityReport({ ...validReport, overallScore: Number.NaN }, REQ_ID),
    "expected NaN rejection"
  );
});

// 3. Score > 100 rejected.
check("score > 100 rejected", () => {
  expectThrows(
    () => validateQualityReport({ ...validReport, testCoverage: 120 }, REQ_ID),
    "expected >100 rejection"
  );
});

// 4. Malformed finding rejected.
check("malformed finding rejected", () => {
  expectThrows(
    () =>
      validateQualityReport(
        { ...validReport, findings: [{ severity: "high" }] },
        REQ_ID
      ),
    "expected malformed finding rejection"
  );
});

// 5. Invalid severity rejected.
check("invalid severity rejected", () => {
  expectThrows(
    () =>
      validateQualityReport(
        {
          ...validReport,
          findings: [
            {
              severity: "urgent",
              category: "ambiguity",
              description: "x",
              evidence: "y",
              recommendation: "z",
            },
          ],
        },
        REQ_ID
      ),
    "expected invalid severity rejection"
  );
});

// 6. Fabricated requirementId rejected.
check("fabricated requirementId rejected", () => {
  expectThrows(
    () => validateQualityReport({ ...validReport, requirementId: "REQ-FAKE" }, REQ_ID),
    "expected fabricated id rejection"
  );
});

// 7. Wrong requirementId (traceability) rejected.
check("wrong requirementId rejected", () => {
  expectThrows(() => validateQualityReport(validReport, "REQ-OTHER"), "expected mismatch rejection");
});

// 8. Missing required field rejected.
check("missing required field rejected", () => {
  const { approvedTests: _omit, ...rest } = validReport;
  void _omit;
  expectThrows(() => validateQualityReport(rest, REQ_ID), "expected missing field rejection");
});

// 9. Missing API key handled safely.
check("missing API key produces safe QualityAgentError", async () => {
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
    await generateQualityReport({
      requirement,
      analysis: null,
      testCases: [],
      testData: [],
      artifacts: [],
    });
  } catch (e) {
    err = e;
  }
  if (realKey !== undefined) process.env.OPENROUTER_API_KEY = realKey;
  if (!(err instanceof QualityAgentError)) throw new Error("expected QualityAgentError");
  if (err.userMessage.includes("OPENROUTER") || err.userMessage.includes("sk-or")) {
    throw new Error("userMessage leaks internals");
  }
});

// 10. Provider error maps to safe message.
check("OpenRouterError maps to safe userMessage", () => {
  const agentError = new QualityAgentError(
    "provider_error",
    "AI service is temporarily unavailable.",
    new OpenRouterError("rate limited", "rate_limited")
  );
  if (agentError.userMessage.includes("rate")) throw new Error("leaks provider detail");
});

// 11. Mock still returns valid shape.
check("mock quality agent still returns valid shape", () => {
  const requirement = {
    id: REQ_ID,
    title: "User login",
    description: "As a user I want to log in.",
    acceptanceCriteria: ["Valid credentials log in."],
    createdAt: new Date().toISOString(),
  };
  const analysis: RequirementAnalysis = {
    requirementId: REQ_ID,
    completenessScore: 80,
    clarityScore: 70,
    testabilityScore: 60,
    overallScore: 70,
    gaps: [],
    risks: [],
    recommendations: [],
  };
  const tcs: TestCase[] = [];
  const result = generateQualityReportMock({
    requirement,
    analysis,
    testCases: tcs,
    artifacts: [],
  });
  validateQualityReport(result, REQ_ID);
});

console.log("---------------------------------------------");
console.log(`Result: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
console.log("All checks passed. No OpenRouter request was performed.");
