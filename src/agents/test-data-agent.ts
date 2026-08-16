// Test Data Agent — real LLM implementation (Phase 2 Step 4).
// Calls the existing OpenRouter provider (src/lib/ai) from the server only.
// The deterministic mock is preserved in test-data-agent.mock.ts.

import {
  generateStructuredResponse,
  getResponseText,
  OpenRouterError,
  parseJsonResponse,
  type OpenRouterChatMessage,
} from "@/lib/ai";
import { validateTestData } from "@/lib/validation/test-data";
import type {
  Requirement,
  RequirementAnalysis,
  TestCase,
  TestData,
} from "@/types/qa";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const TEST_DATA_PROMPT_VERSION = "1.0";

function buildSystemPrompt(): string {
  return [
    "You are a senior QA test data engineer.",
    "",
    "Your job is to generate structured, useful, safe, traceable test data for a set of generated test cases, grounded in a Requirement and its RequirementAnalysis.",
    "",
    "GROUNDING RULES (most important):",
    "- Use ONLY information from the supplied Requirement, RequirementAnalysis, and Test Cases.",
    "- Do NOT invent business rules, users, permissions, API endpoints, database records, validation rules, integrations, or application behavior.",
    "- If required information is missing, do NOT fabricate realistic-looking business data and present it as a requirement-derived fact.",
    "- Clearly distinguish: requirement-derived data, generated synthetic data, and placeholder data.",
    "",
    "DATA QUALITY:",
    "- Generate useful test data for the supplied test cases (e.g. username, email, password, URL, phone, date, amount, identifier, search value, invalid value, boundary value, required/empty value).",
    "- Only include fields relevant to the test case. Do NOT blindly create every field type for every test.",
    "- Where supported, generate valid / invalid / boundary / empty / special-character / duplicate data — only when relevant.",
    "",
    "SECURITY / PRIVACY (extremely important):",
    "- NEVER generate real secrets: no real API keys, passwords, auth tokens, access tokens, credit card numbers, production credentials, personal information, or customer data.",
    "- Use clearly synthetic placeholders for sensitive values, e.g. password: \"<VALID_PASSWORD>\", API token: \"<TOKEN>\", email: \"qa.user@example.com\".",
    "- Sensitive fields MUST set sensitive: true so the UI masks them.",
    "",
    "TRACEABILITY:",
    "- Every test-data item must reference the exact test case id it supports (testCaseId).",
    "- Do NOT fabricate test case ids — only use the ids supplied.",
    "",
    "OUTPUT FORMAT (STRICT — use exactly these values):",
    "Return ONLY a JSON object conforming EXACTLY to this shape:",
    `{
      "testData": [
        {
          "id": "TD-XXXX",
          "testCaseId": "<one of the supplied test case ids>",
          "fields": [
            { "name": "username", "value": "qa.user@example.com", "type": "email", "sensitive": false },
            { "name": "password", "value": "<VALID_PASSWORD>", "type": "password", "sensitive": true }
          ]
        }
      ]
    }`,
    "ALLOWED VALUES (STRICT ENUMS):",
    "- type: exactly one of [string, email, password, number, url, boolean, date, uuid, role, phone]",
    "- sensitive: true or false (true for passwords, tokens, and any value that should be masked)",
    "- fields: non-empty array; each field has name (string), value (string), type (enum above), sensitive (boolean)",
    "- testCaseId: MUST be one of the test case ids supplied in the request. Never invent one.",
    "",
    "VALIDATION REMINDER:",
    "- Every field value must be a plain string (numbers/dates as strings).",
    "- Never output real-looking credentials — use angle-bracket placeholders for secrets.",
    "- Do not include fields outside this shape.",
  ].join("\n");
}

function buildUserMessage(
  requirement: Requirement,
  analysis: RequirementAnalysis,
  testCases: TestCase[]
): string {
  return [
    "Generate test data for the following requirement and its test cases.",
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
    "REQUIREMENT ANALYSIS:",
    JSON.stringify(
      {
        overallScore: analysis.overallScore,
        testabilityScore: analysis.testabilityScore,
        gaps: analysis.gaps.map((g) => ({
          type: g.type,
          description: g.description,
        })),
      },
      null,
      2
    ),
    "",
    "TEST CASES (supply test data for these — use ONLY these ids):",
    JSON.stringify(
      testCases.map((tc) => ({
        id: tc.id,
        title: tc.title,
        type: tc.type,
        description: tc.description,
        steps: tc.steps.map((s) => ({
          action: s.action,
          testData: s.testData,
        })),
      })),
      null,
      2
    ),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type TestDataAgentErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "invalid_response"
  | "empty_response";

/** Controlled, user-safe error. Never serialize `cause` to the client. */
export class TestDataAgentError extends Error {
  code: TestDataAgentErrorCode;
  userMessage: string;
  cause?: Error;

  constructor(
    code: TestDataAgentErrorCode,
    userMessage: string,
    cause?: Error
  ) {
    super(userMessage);
    this.name = "TestDataAgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function toAgentError(err: unknown): TestDataAgentError {
  if (err instanceof TestDataAgentError) return err;
  if (err instanceof OpenRouterError) {
    switch (err.code) {
      case "missing_api_key":
      case "invalid_api_key":
        return new TestDataAgentError(
          "missing_api_key",
          "AI service is temporarily unavailable.",
          err
        );
      case "rate_limited":
        return new TestDataAgentError(
          "provider_error",
          "AI service is busy. Please try again.",
          err
        );
      case "invalid_json":
      case "empty_response":
        return new TestDataAgentError(
          "invalid_response",
          "AI returned an unexpected response. Please try again.",
          err
        );
      default:
        return new TestDataAgentError(
          "provider_error",
          "AI service is temporarily unavailable.",
          err
        );
    }
  }
  return new TestDataAgentError(
    "provider_error",
    "Unable to generate test data. Please try again.",
    err instanceof Error ? err : undefined
  );
}

// ---------------------------------------------------------------------------
// Public API (server-side)
// ---------------------------------------------------------------------------

/**
 * Generate test data via the real LLM (OpenRouter).
 * Server-side only — never import into client components.
 * Throws TestDataAgentError with a safe userMessage on failure.
 */
export async function generateTestData(
  requirement: Requirement,
  analysis: RequirementAnalysis,
  testCases: TestCase[]
): Promise<TestData[]> {
  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: buildUserMessage(requirement, analysis, testCases),
    },
  ];

  try {
    const response = await generateStructuredResponse(messages, {
      json: true,
      temperature: 0.2,
      maxTokens: 4096,
    });

    const text = getResponseText(response);
    if (!text || !text.trim()) {
      throw new OpenRouterError(
        "OpenRouter returned an empty response.",
        "empty_response"
      );
    }

    const raw = parseJsonResponse<unknown>(response);
    const testCaseIds = testCases.map((tc) => tc.id);
    return validateTestData(raw, testCaseIds);
  } catch (err) {
    throw toAgentError(err);
  }
}
