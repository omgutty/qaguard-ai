// Automation Agent — real LLM implementation (Phase 2 Step 6).
// Calls the existing OpenRouter provider (src/lib/ai) from the server only.
// Generates Playwright TypeScript code text; Playwright is NOT installed/executed.
// The deterministic mock is preserved in automation-agent.mock.ts.

import {
  generateStructuredResponse,
  getResponseText,
  OpenRouterError,
  parseJsonResponse,
  type OpenRouterChatMessage,
} from "@/lib/ai";
import { validateAutomationArtifact } from "@/lib/validation/automation";
import type {
  AutomationArtifact,
  Requirement,
  TestCase,
  TestData,
} from "@/types/qa";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const AUTOMATION_PROMPT_VERSION = "1.0";

function buildSystemPrompt(): string {
  return [
    "You are a senior Playwright automation engineer.",
    "",
    "Your job is to generate a single, executable Playwright TypeScript test for a given APPROVED test case, using the associated test data.",
    "",
    "GENERATION RULES:",
    "- Use TypeScript with Playwright.",
    "- Use web-first assertions (expect(...).toBeVisible() / toHaveValue() / etc.).",
    "- Use locator-based interactions (getByRole, getByLabel, getByPlaceholder, getByText).",
    "- Use a readable test name.",
    "- Deterministic structure — no arbitrary sleeps (no waitForTimeout unless genuinely required).",
    "- No hardcoded production credentials. Use the test data values supplied, or clearly marked placeholders like <USER_EMAIL>.",
    "- No fabricated URLs unless the test case or requirement supplies one. If no URL is known, use \"<APP_URL>\" as an obvious placeholder.",
    "- No invented application behavior.",
    "- No invented selectors when selectors are not available — mark them clearly as placeholders, e.g. // TODO: replace with real selector.",
    "",
    "OUTPUT FORMAT (STRICT):",
    "Return ONLY a JSON object conforming EXACTLY to this shape:",
    `{
      "testCaseId": "<the exact test case id supplied>",
      "requirementId": "<the exact requirement id supplied>",
      "framework": "playwright",
      "language": "typescript",
      "fileName": "my-test.spec.ts",
      "code": "import { test, expect } from \\"@playwright/test\\";\\n\\ntest(\\"...\\", async ({ page }) => {\\n  // ...\\n});",
      "generatedAt": "<ISO timestamp>"
    }`,
    "Rules:",
    "- framework MUST be \"playwright\", language MUST be \"typescript\".",
    "- fileName should be kebab-case ending in .spec.ts.",
    "- code must be the complete Playwright TypeScript source as a single string.",
    "- generatedAt must be the current ISO timestamp.",
    "- Do not include fields outside this shape.",
  ].join("\n");
}

function buildUserMessage(
  testCase: TestCase,
  testData: TestData,
  requirement: Requirement | null
): string {
  return [
    "Generate a Playwright TypeScript test for the following APPROVED test case.",
    "",
    "REQUIREMENT (context):",
    requirement
      ? JSON.stringify(
          {
            id: requirement.id,
            title: requirement.title,
            description: requirement.description,
          },
          null,
          2
        )
      : "null",
    "",
    "TEST CASE:",
    JSON.stringify(
      {
        id: testCase.id,
        requirementId: testCase.requirementId,
        title: testCase.title,
        description: testCase.description,
        type: testCase.type,
        preconditions: testCase.preconditions,
        steps: testCase.steps,
        expectedResult: testCase.expectedResult,
      },
      null,
      2
    ),
    "",
    "TEST DATA (use these values; never invent different ones):",
    JSON.stringify(
      testData.fields.map((f) => ({
        name: f.name,
        value: f.value,
        sensitive: f.sensitive,
      })),
      null,
      2
    ),
    "",
    `Set testCaseId exactly to: ${testCase.id}`,
    `Set requirementId exactly to: ${testCase.requirementId}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AutomationAgentErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "invalid_response"
  | "empty_response";

/** Controlled, user-safe error. Never serialize `cause` to the client. */
export class AutomationAgentError extends Error {
  code: AutomationAgentErrorCode;
  userMessage: string;
  cause?: Error;

  constructor(
    code: AutomationAgentErrorCode,
    userMessage: string,
    cause?: Error
  ) {
    super(userMessage);
    this.name = "AutomationAgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function toAgentError(err: unknown): AutomationAgentError {
  if (err instanceof AutomationAgentError) return err;
  if (err instanceof OpenRouterError) {
    switch (err.code) {
      case "missing_api_key":
      case "invalid_api_key":
        return new AutomationAgentError(
          "missing_api_key",
          "AI service is temporarily unavailable.",
          err
        );
      case "rate_limited":
        return new AutomationAgentError(
          "provider_error",
          "AI service is busy. Please try again.",
          err
        );
      case "invalid_json":
      case "empty_response":
        return new AutomationAgentError(
          "invalid_response",
          "AI returned an unexpected response. Please try again.",
          err
        );
      default:
        return new AutomationAgentError(
          "provider_error",
          "AI service is temporarily unavailable.",
          err
        );
    }
  }
  return new AutomationAgentError(
    "provider_error",
    "Unable to generate automation. Please try again.",
    err instanceof Error ? err : undefined
  );
}

// ---------------------------------------------------------------------------
// Public API (server-side)
// ---------------------------------------------------------------------------

/**
 * Generate a Playwright TypeScript artifact via the real LLM (OpenRouter).
 * Server-side only — never import into client components.
 * The caller must verify the test case is approved before calling.
 * Throws AutomationAgentError with a safe userMessage on failure.
 */
export async function generateAutomation(args: {
  testCase: TestCase;
  testData: TestData;
  requirement: Requirement | null;
}): Promise<AutomationArtifact> {
  const { testCase, testData, requirement } = args;

  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: buildUserMessage(testCase, testData, requirement),
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
    return validateAutomationArtifact(raw, {
      testCaseId: testCase.id,
      requirementId: testCase.requirementId,
    });
  } catch (err) {
    throw toAgentError(err);
  }
}

/**
 * Batch helper: generate artifacts for approved test cases.
 * Skips any test case that is not approved (governance gate).
 */
export async function generateAutomationBatch(args: {
  approvedTestCases: TestCase[];
  testData: TestData[];
  requirement: Requirement | null;
}): Promise<AutomationArtifact[]> {
  const { approvedTestCases, testData, requirement } = args;
  const results: AutomationArtifact[] = [];
  for (const tc of approvedTestCases) {
    if (tc.reviewStatus !== "approved") continue;
    const data = testData.find((td) => td.testCaseId === tc.id);
    if (!data) continue;
    results.push(await generateAutomation({ testCase: tc, testData: data, requirement }));
  }
  return results;
}
