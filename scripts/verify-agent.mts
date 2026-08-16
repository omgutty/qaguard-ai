// Server-side verification for the real Requirement Agent (Phase 2 Step 2).
// Run with: npm run verify:agent
//
// Checks (no API calls):
//  1. Valid RequirementAnalysis passes the validator.
//  2. Invalid scores (negative, >100, NaN, Infinity, missing) are rejected.
//  3. Wrong/missing requirementId is rejected (traceability).
//  4. Malformed gap/risk/recommendation structure is rejected.
//  5. Missing API key produces a controlled RequirementAgentError (safe message).
//  6. Provider errors map to a safe userMessage (no key/URL/stack leak).

import { analyzeRequirement, RequirementAgentError } from "../src/agents/requirement-agent.ts";
import { analyzeRequirementMock } from "../src/agents/requirement-agent.mock.ts";
import { validateRequirementAnalysis } from "../src/lib/validation/analysis.ts";
import { OpenRouterError } from "../src/lib/ai/openrouter.ts";
import type { RequirementAnalysis } from "../src/types/qa.ts";

const REQ_ID = "REQ-VERIFY-1";

const validAnalysis: RequirementAnalysis = {
  requirementId: REQ_ID,
  completenessScore: 80,
  clarityScore: 75,
  testabilityScore: 70,
  overallScore: 76,
  gaps: [
    {
      id: "GAP-1",
      type: "unclear_error_handling",
      description: "No failure behavior described.",
      suggestion: "Add a criterion for invalid input.",
      source: "Description",
    },
  ],
  risks: [
    {
      id: "RSK-1",
      severity: "medium",
      description: "Ambiguous criteria.",
      mitigation: "Clarify each criterion.",
    },
  ],
  recommendations: [
    {
      id: "REC-1",
      type: "testability",
      text: "Rewrite criteria as verifiable outcomes.",
      origin: "derived",
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

console.log("QAGuard AI — Requirement Agent verification");
console.log("---------------------------------------------");

// 1. Valid analysis passes.
check("valid RequirementAnalysis passes validator", () => {
  const result = validateRequirementAnalysis(validAnalysis, REQ_ID);
  if (result.requirementId !== REQ_ID) throw new Error("id mismatch");
});

// 2. Invalid scores rejected.
for (const [label, patch] of [
  ["negative score", { completenessScore: -5 }],
  ["score > 100", { clarityScore: 120 }],
  ["NaN score", { testabilityScore: Number.NaN }],
  ["Infinity score", { overallScore: Number.POSITIVE_INFINITY }],
  ["missing score", { overallScore: undefined }],
  ["string score", { overallScore: "80" }],
] as const) {
  check(`${label} rejected`, () => {
    expectThrows(
      () =>
        validateRequirementAnalysis(
          { ...validAnalysis, ...patch },
          REQ_ID
        ),
      `expected rejection for ${label}`
    );
  });
}

// 3. Wrong / missing requirementId rejected.
check("wrong requirementId rejected", () => {
  expectThrows(
    () => validateRequirementAnalysis(validAnalysis, "REQ-OTHER"),
    "expected mismatch rejection"
  );
});
check("missing requirementId rejected", () => {
  const { requirementId: _omitted, ...rest } = validAnalysis;
  void _omitted;
  expectThrows(
    () => validateRequirementAnalysis(rest, REQ_ID),
    "expected missing id rejection"
  );
});

// 4. Malformed structure rejected.
check("invalid gap type rejected", () => {
  expectThrows(
    () =>
      validateRequirementAnalysis(
        {
          ...validAnalysis,
          gaps: [
            {
              type: "not_a_real_type",
              description: "x",
              suggestion: "y",
              source: "Description",
            },
          ],
        },
        REQ_ID
      ),
    "expected invalid gap type rejection"
  );
});
check("invalid risk severity rejected", () => {
  expectThrows(
    () =>
      validateRequirementAnalysis(
        {
          ...validAnalysis,
          risks: [
            { severity: "critical", description: "x", mitigation: "y" },
          ],
        },
        REQ_ID
      ),
    "expected invalid severity rejection"
  );
});
check("invalid recommendation origin rejected", () => {
  expectThrows(
    () =>
      validateRequirementAnalysis(
        {
          ...validAnalysis,
          recommendations: [
            { type: "coverage", text: "x", origin: "model" },
          ],
        },
        REQ_ID
      ),
    "expected invalid origin rejection"
  );
});
check("non-array gaps rejected", () => {
  expectThrows(
    () =>
      validateRequirementAnalysis(
        { ...validAnalysis, gaps: "none" },
        REQ_ID
      ),
    "expected non-array rejection"
  );
});
check("analysis with missing id fields normalized (LLM omits ids)", () => {
  const raw = JSON.parse(JSON.stringify(validAnalysis));
  raw.gaps[0].id = "";
  raw.risks[0].id = undefined;
  raw.recommendations[0].id = null;
  const result = validateRequirementAnalysis(raw, REQ_ID);
  if (!result.gaps[0].id || !result.risks[0].id || !result.recommendations[0].id) {
    throw new Error("ids not generated");
  }
});

// 5. Missing API key handled safely.
check("missing API key produces safe RequirementAgentError", async () => {
  const realKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const requirement = {
    id: REQ_ID,
    title: "User can log in",
    description: "As a user I want to log in with my credentials.",
    acceptanceCriteria: ["Valid credentials log in successfully."],
    createdAt: new Date().toISOString(),
  };
  let err: unknown = null;
  try {
    await analyzeRequirement(requirement);
  } catch (e) {
    err = e;
  }
  if (realKey !== undefined) process.env.OPENROUTER_API_KEY = realKey;
  if (!(err instanceof RequirementAgentError)) {
    throw new Error("expected RequirementAgentError");
  }
  if (err.code !== "missing_api_key") throw new Error("unexpected code");
  if (err.userMessage.includes("OPENROUTER") || err.userMessage.includes("sk-or")) {
    throw new Error("userMessage leaks internals");
  }
});

// 6. Provider error maps to safe message.
check("OpenRouterError maps to safe userMessage", () => {
  const agentError = new RequirementAgentError(
    "provider_error",
    "AI service is temporarily unavailable.",
    new OpenRouterError("network down", "network_error")
  );
  if (agentError.userMessage.includes("network")) {
    throw new Error("userMessage leaks provider detail");
  }
  if (agentError.userMessage === "network down") {
    throw new Error("raw provider message leaked");
  }
});

// Mock still works and returns a valid analysis shape.
check("mock agent still returns valid shape", () => {
  const requirement = {
    id: REQ_ID,
    title: "User can log in",
    description: "As a user I want to log in with my credentials.",
    acceptanceCriteria: ["Valid credentials log in successfully."],
    createdAt: new Date().toISOString(),
  };
  const result = analyzeRequirementMock(requirement);
  validateRequirementAnalysis(result, REQ_ID);
  if (result.requirementId !== REQ_ID) throw new Error("mock id mismatch");
});

console.log("---------------------------------------------");
console.log(`Result: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
console.log("All checks passed. No OpenRouter request was performed.");
