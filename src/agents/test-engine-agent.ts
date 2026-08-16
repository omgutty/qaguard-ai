// Test Engine Agent — real LLM implementation (Phase 2 Step 3).
// Calls the existing OpenRouter provider (src/lib/ai) from the server only.
// The deterministic mock is preserved in test-engine-agent.mock.ts.

import {
  generateStructuredResponse,
  getResponseText,
  OpenRouterError,
  parseJsonResponse,
  type OpenRouterChatMessage,
} from "@/lib/ai";
import { validateTestCases } from "@/lib/validation/test-cases";
import type { Requirement, RequirementAnalysis, TestCase } from "@/types/qa";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const TEST_ENGINE_PROMPT_VERSION = "1.0";

function buildSystemPrompt(): string {
  return [
    "You are a senior QA test engineer specializing in test case design.",
    "",
    "Your job is to generate high-quality, executable test cases from a supplied Requirement and its RequirementAnalysis.",
    "",
    "GROUNDING RULES (most important):",
    "- Use ONLY information contained in the supplied Requirement and RequirementAnalysis.",
    "- Do not invent business rules, UI elements, API endpoints, database behavior, validation rules, or integrations.",
    "- Do not fabricate expected results.",
    "- If information is missing, you may create an appropriate coverage/gap test ONLY when justified by the RequirementAnalysis.",
    "",
    "TEST COVERAGE:",
    "- Generate meaningful QA test cases covering applicable categories: positive/happy path, negative scenarios, boundary conditions, validation, authorization/security (only when supported by the requirement), error handling, relevant edge cases, regression coverage where justified.",
    "- Do NOT blindly generate every category if it is not applicable to the supplied requirement.",
    "",
    "QUALITY:",
    "- Avoid duplicate test cases and trivial variations.",
    "- Each test case must have a clear objective.",
    "- Preconditions must be explicit where required.",
    "- Test steps must be executable and unambiguous.",
    "- Expected results must be observable and testable.",
    "",
    "TRACEABILITY:",
    "- Every test case must identify what requirement or analysis item caused it to be generated.",
    "- Use the `source` field: \"Acceptance Criteria #N\" (when grounded in a specific criterion) or \"AI-Derived\" (when inferred from the analysis).",
    "- Set `requirementId` exactly to the requirement id supplied.",
    "",
    "OUTPUT FORMAT (STRICT — you MUST use exactly these values, nothing else):",
    "Return ONLY a JSON object conforming EXACTLY to this shape:",
    `{
      "testCases": [
        {
          "id": "TC-XXXX",
          "requirementId": "<the exact requirement id supplied>",
          "title": "Clear test case title",
          "description": "Objective of the test case",
          "type": "positive",
          "priority": "high",
          "source": "Acceptance Criteria #1",
          "preconditions": ["Explicit precondition"],
          "steps": [
            { "stepNumber": 1, "action": "Executable action", "testData": "input used", "expectedResult": "observable outcome" }
          ],
          "expectedResult": "Overall observable expected outcome",
          "reviewStatus": "pending"
        }
      ]
    }`,
    "ALLOWED VALUES (STRICT ENUMS — do not use any other values):",
    "- type: exactly one of [positive, negative, boundary, validation, security, regression]",
    "- priority: exactly one of [low, medium, high, critical]",
    "- reviewStatus: exactly one of [pending, approved, rejected, modified] — always start with \"pending\"",
    "- source: either \"Acceptance Criteria #N\" (N = the criterion number from the requirement, e.g. #1, #2, #3) or \"AI-Derived\"",
    "- steps: non-empty array; each step has stepNumber (integer >= 1), action (string), testData (string), expectedResult (string)",
    "",
    "VALIDATION REMINDER:",
    "- type MUST be one of the six enum values above. Never use \"functional\", \"smoke\", \"e2e\", \"usability\", or any other word.",
    "- reviewStatus MUST be one of the four enum values above. Never use \"draft\", \"new\", \"open\", or any other word.",
    "- Every test case MUST have a non-empty title, description, expectedResult, and at least one step.",
    "- CONCISENESS: keep step actions and expected results short and precise. Do not pad steps with trivial detail.",
    "- Do not include fields outside this shape.",
  ].join("\n");
}

function buildUserMessage(
  requirement: Requirement,
  analysis: RequirementAnalysis
): string {
  return [
    "Generate test cases for the following requirement.",
    "",
    "REQUIREMENT:",
    JSON.stringify(
      {
        id: requirement.id,
        title: requirement.title,
        description: requirement.description,
        acceptanceCriteria: requirement.acceptanceCriteria,
      },
      null,
      2
    ),
    "",
    "REQUIREMENT ANALYSIS (use as grounding context, do not reinterpret the requirement independently):",
    JSON.stringify(
      {
        overallScore: analysis.overallScore,
        completenessScore: analysis.completenessScore,
        clarityScore: analysis.clarityScore,
        testabilityScore: analysis.testabilityScore,
        gaps: analysis.gaps.map((g) => ({
          type: g.type,
          description: g.description,
          source: g.source,
        })),
        risks: analysis.risks.map((r) => ({
          severity: r.severity,
          description: r.description,
        })),
      },
      null,
      2
    ),
    "",
    `Set requirementId on every test case exactly to: ${requirement.id}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type TestEngineAgentErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "invalid_response"
  | "empty_response"
  | "validation_error";

/** Controlled, user-safe error. Never serialize `cause` to the client. */
export class TestEngineAgentError extends Error {
  code: TestEngineAgentErrorCode;
  userMessage: string;
  cause?: Error;

  constructor(
    code: TestEngineAgentErrorCode,
    userMessage: string,
    cause?: Error
  ) {
    super(userMessage);
    this.name = "TestEngineAgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function toAgentError(err: unknown): TestEngineAgentError {
  if (err instanceof TestEngineAgentError) return err;
  if (err instanceof OpenRouterError) {
    switch (err.code) {
      case "missing_api_key":
      case "invalid_api_key":
        return new TestEngineAgentError(
          "missing_api_key",
          "AI service is temporarily unavailable.",
          err
        );
      case "rate_limited":
        return new TestEngineAgentError(
          "provider_error",
          "AI service is busy. Please try again.",
          err
        );
      case "invalid_json":
      case "empty_response":
        return new TestEngineAgentError(
          "invalid_response",
          "AI returned an unexpected response. Please try again.",
          err
        );
      default:
        return new TestEngineAgentError(
          "provider_error",
          "AI service is temporarily unavailable.",
          err
        );
    }
  }
  // TestCasesValidationError (or any other local validation failure) is
  // distinguishable from provider/network failures.
  if (
    err instanceof Error &&
    (err.name === "TestCasesValidationError" || err.name === "QualityValidationError")
  ) {
    return new TestEngineAgentError(
      "validation_error",
      "AI output did not meet the required contract. Please try again.",
      err
    );
  }
  return new TestEngineAgentError(
    "provider_error",
    "Unable to generate test cases. Please try again.",
    err instanceof Error ? err : undefined
  );
}

// ---------------------------------------------------------------------------
// Public API (server-side)
// ---------------------------------------------------------------------------

/**
 * Generate test cases via the real LLM (OpenRouter).
 * Server-side only — never import into client components.
 *
 * Strategy:
 * 1. Call the LLM with the full prompt.
 * 2. Validate the response (validator is the final gate — never weakened).
 * 3. If the FIRST response fails validation or JSON parsing, do ONE retry
 *    with a stricter correction prompt that tells the model exactly what to fix.
 * 4. If the retry also fails, throw a controlled TestEngineAgentError.
 *
 * Throws TestEngineAgentError with a safe userMessage on failure.
 */
export async function generateTestCases(
  requirement: Requirement,
  analysis: RequirementAnalysis
): Promise<TestCase[]> {
  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserMessage(requirement, analysis) },
  ];

  try {
    // First attempt.
    const response = await generateStructuredResponse(messages, {
      json: true,
      temperature: 0.2,
      maxTokens: 8192,
    });

    const text = getResponseText(response);
    if (!text || !text.trim()) {
      throw new OpenRouterError(
        "OpenRouter returned an empty response.",
        "empty_response"
      );
    }

    try {
      // Parse + validate the first attempt. If the JSON is truncated or the
      // structure is invalid, fall through to the single retry below.
      const raw = parseJsonResponse<unknown>(response);
      return validateTestCases(raw, requirement.id);
    } catch (firstErr) {
      // Single controlled retry with a stricter correction prompt. This
      // catches BOTH invalid JSON (e.g. truncated output) and validation
      // failures. The validator remains the final gate — never weakened.
      const retryReason =
        firstErr instanceof OpenRouterError && firstErr.code === "invalid_json"
          ? "The response was not valid JSON (it may have been truncated). Return complete, valid JSON."
          : String(firstErr instanceof Error ? firstErr.message : "validation failed");

      const correction: OpenRouterChatMessage[] = [
        ...messages,
        {
          role: "assistant",
          content: text,
        },
        {
          role: "user",
          content: [
            "Your previous response did not satisfy the required contract.",
            "Fix ALL of the following issues and return ONLY a corrected JSON object with the EXACT same top-level shape ({\"testCases\": [...]}):",
            retryReason,
            "",
            "STRICT RULES (do not deviate):",
            "- type MUST be one of: positive, negative, boundary, validation, security, regression.",
            "- priority MUST be one of: low, medium, high, critical.",
            "- reviewStatus MUST be one of: pending, approved, rejected, modified.",
            "- source MUST be \"Acceptance Criteria #N\" or \"AI-Derived\".",
            "- Every test case MUST have a non-empty id, title, description, expectedResult, preconditions (array), and steps (non-empty array).",
            "- Every step MUST have integer stepNumber >= 1, action, testData, expectedResult (non-empty strings).",
            "- requirementId MUST equal " + requirement.id + " on every test case.",
            "- Respond with complete, valid JSON. Do not truncate. Do not add text outside the JSON.",
            "- Keep descriptions and step text concise.",
          ].join("\n"),
        },
      ];

      const retry = await generateStructuredResponse(correction, {
        json: true,
        temperature: 0.1,
        maxTokens: 8192,
      });

      const retryText = getResponseText(retry);
      if (!retryText || !retryText.trim()) {
        throw new OpenRouterError(
          "OpenRouter returned an empty response.",
          "empty_response"
        );
      }

      const retryRaw = parseJsonResponse<unknown>(retry);
      return validateTestCases(retryRaw, requirement.id);
    }
  } catch (err) {
    throw toAgentError(err);
  }
}
