// Requirement Agent — real LLM implementation (Phase 2 Step 2).
// Calls the existing OpenRouter provider (src/lib/ai) from the server only.
// The deterministic mock is preserved in requirement-agent.mock.ts.

import {
  generateStructuredResponse,
  getResponseText,
  OpenRouterError,
  parseJsonResponse,
  type OpenRouterChatMessage,
} from "@/lib/ai";
import { validateRequirementAnalysis } from "@/lib/validation/analysis";
import type { Requirement, RequirementAnalysis } from "@/types/qa";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const REQUIREMENT_ANALYSIS_PROMPT_VERSION = "1.0";

function buildSystemPrompt(): string {
  return [
    "You are a senior QA test architect and requirements analyst.",
    "",
    "Your job is to analyze a supplied software requirement for:",
    "- completeness",
    "- clarity",
    "- testability",
    "- ambiguity",
    "- missing acceptance criteria",
    "- missing business rules",
    "- missing validation behavior",
    "- missing error handling",
    "- missing boundary conditions",
    "- potential testing risks",
    "",
    "GROUNDING RULES (most important):",
    "- Use ONLY the supplied requirement as factual evidence.",
    "- Never invent business rules, expected behavior, UI elements, API behavior, or test data requirements as facts.",
    "- Explicitly identify missing information rather than resolving it silently.",
    "- Distinguish clearly: (1) explicitly stated facts, (2) missing information, (3) risks/inferences, (4) AI recommendations.",
    "- Identify ambiguity rather than assuming an interpretation.",
    "- If a concern is not grounded in the requirement, it belongs in recommendations (AI-derived), not facts.",
    "",
    "SCORING (0-100, must be justified by the supplied requirement):",
    "- completenessScore: Does the requirement contain enough information to understand expected behavior and important acceptance conditions?",
    "- clarityScore: Is the requirement unambiguous and understandable?",
    "- testabilityScore: Can a QA engineer derive objective test scenarios and expected results from the requirement?",
    "- overallScore: A balanced assessment of the three dimensions.",
    "Do not produce random or arbitrary scores.",
    "",
    "OUTPUT FORMAT:",
    "Return ONLY a JSON object conforming EXACTLY to this shape:",
    `{
      "requirementId": "<the exact requirement id supplied>",
      "completenessScore": <0-100 integer>,
      "clarityScore": <0-100 integer>,
      "testabilityScore": <0-100 integer>,
      "overallScore": <0-100 integer>,
      "gaps": [
        { "type": "missing_acceptance_criteria|ambiguous|unverifiable|unclear_error_handling", "description": "...", "suggestion": "...", "source": "Description|Acceptance Criteria" }
      ],
      "risks": [
        { "severity": "low|medium|high", "description": "...", "mitigation": "..." }
      ],
      "recommendations": [
        { "type": "clarity|testability|coverage|security", "text": "...", "origin": "derived|ai" }
      ]
    }`,
    "Guidance:",
    "- gaps: information needed for confident testing but MISSING from the requirement. Only report gaps genuinely relevant to the supplied requirement.",
    "- risks: realistic QA risks arising from the requirement (ambiguity, missing negative/boundary behavior, security-sensitive behavior without defined rules). State that they are risks, not established requirements.",
    "- recommendations: suggestions to improve the requirement or its testability. Use origin \"derived\" when directly grounded in the requirement text, otherwise \"ai\".",
    "- Keep gap/risk/recommendation descriptions concise and actionable.",
    "- Do not include fields outside this shape.",
  ].join("\n");
}

function buildUserMessage(requirement: Requirement): string {
  return [
    "Analyze the following requirement.",
    `Return the requirementId exactly as: ${requirement.id}`,
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
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type RequirementAgentErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "invalid_response"
  | "empty_response";

/** Controlled, user-safe error. Never serialize `cause` to the client. */
export class RequirementAgentError extends Error {
  code: RequirementAgentErrorCode;
  userMessage: string;
  cause?: Error;

  constructor(
    code: RequirementAgentErrorCode,
    userMessage: string,
    cause?: Error
  ) {
    super(userMessage);
    this.name = "RequirementAgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function toAgentError(err: unknown): RequirementAgentError {
  if (err instanceof RequirementAgentError) return err;
  if (err instanceof OpenRouterError) {
    switch (err.code) {
      case "missing_api_key":
      case "invalid_api_key":
        return new RequirementAgentError(
          "missing_api_key",
          "AI service is temporarily unavailable.",
          err
        );
      case "rate_limited":
        return new RequirementAgentError(
          "provider_error",
          "AI service is busy. Please try again.",
          err
        );
      case "invalid_json":
      case "empty_response":
        return new RequirementAgentError(
          "invalid_response",
          "AI returned an unexpected response. Please try again.",
          err
        );
      default:
        return new RequirementAgentError(
          "provider_error",
          "AI service is temporarily unavailable.",
          err
        );
    }
  }
  return new RequirementAgentError(
    "provider_error",
    "Unable to analyze the requirement. Please try again.",
    err instanceof Error ? err : undefined
  );
}

// ---------------------------------------------------------------------------
// Public API (server-side)
// ---------------------------------------------------------------------------

/**
 * Analyze a requirement via the real LLM (OpenRouter).
 * Server-side only — never import into client components.
 * Throws RequirementAgentError with a safe userMessage on failure.
 */
export async function analyzeRequirement(
  requirement: Requirement
): Promise<RequirementAnalysis> {
  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserMessage(requirement) },
  ];

  try {
    const response = await generateStructuredResponse(messages, {
      json: true,
      temperature: 0.2,
      maxTokens: 2048,
    });

    const text = getResponseText(response);
    if (!text || !text.trim()) {
      throw new OpenRouterError(
        "OpenRouter returned an empty response.",
        "empty_response"
      );
    }

    const raw = parseJsonResponse<unknown>(response);
    return validateRequirementAnalysis(raw, requirement.id);
  } catch (err) {
    throw toAgentError(err);
  }
}
