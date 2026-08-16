// Quality Agent — real LLM implementation (Phase 2 Step 5).
// Calls the existing OpenRouter provider (src/lib/ai) from the server only.
// The deterministic mock is preserved in quality-agent.mock.ts.

import {
  generateStructuredResponse,
  getResponseText,
  OpenRouterError,
  parseJsonResponse,
  type OpenRouterChatMessage,
} from "@/lib/ai";
import { validateQualityReport } from "@/lib/validation/quality";
import type {
  AutomationArtifact,
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
  TestData,
} from "@/types/qa";

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export const QUALITY_PROMPT_VERSION = "1.0";

function buildSystemPrompt(): string {
  return [
    "You are a senior QA quality architect.",
    "",
    "Your job is to evaluate the ACTUAL QA artifacts produced by the pipeline — requirement, requirement analysis, test cases, test data, traceability, and human review status — and produce a rigorous QualityReport.",
    "",
    "GROUNDING RULES (most important):",
    "- Evaluate ONLY the evidence supplied. Do NOT invent requirements, business rules, test cases, risks, application behavior, APIs, or UI behavior.",
    "- Scores must be based on available evidence. Explicitly identify missing information instead of assuming it exists.",
    "",
    "QUALITY DIMENSIONS (score 0-100, justified by evidence):",
    "- requirementCoverage: how well the test cases cover the requirement and its acceptance criteria.",
    "- testCoverage: breadth of test types present (positive, negative, boundary, validation, security, regression) vs. what the requirement justifies.",
    "- traceabilityScore: how well test cases and test data link back to the requirement.",
    "- testabilityScore: from the requirement analysis.",
    "- aiConfidence: how confident the generated artifacts are, based on review status and completeness.",
    "- overallScore: balanced assessment of the above.",
    "",
    "FINDINGS:",
    "- Generate useful findings such as: missing test coverage, insufficient negative scenarios, missing boundary scenarios, requirement ambiguity, high-risk areas without tests, test cases without appropriate data, missing traceability, rejected/unreviewed tests, duplicate or weak test scenarios.",
    "- Each finding: severity (critical|high|medium|low|info), category (one of the allowed values), description, evidence/source (from the supplied artifacts), recommendation.",
    "- Only report findings that are genuinely supported by the evidence. Do NOT pad with generic QA concerns.",
    "",
    "OUTPUT FORMAT (STRICT):",
    "Return ONLY a JSON object conforming EXACTLY to this shape:",
    `{
      "requirementId": "<the exact requirement id supplied>",
      "overallScore": <0-100>,
      "requirementCoverage": <0-100>,
      "testCoverage": <0-100>,
      "traceabilityScore": <0-100>,
      "testabilityScore": <0-100>,
      "aiConfidence": <0-100>,
      "requirementGaps": <integer count from the analysis>,
      "aiDerivedTests": <integer count of AI-Derived test cases>,
      "approvedTests": <integer count of approved test cases>,
      "rejectedTests": <integer count of rejected test cases>,
      "findings": [
        {
          "severity": "high",
          "category": "missing_coverage",
          "description": "...",
          "evidence": "...",
          "recommendation": "..."
        }
      ]
    }`,
    "ALLOWED VALUES (STRICT ENUMS):",
    "- severity: exactly one of [critical, high, medium, low, info]",
    "- category: exactly one of [missing_coverage, negative_coverage, boundary_coverage, ambiguity, risk_without_test, missing_test_data, traceability_gap, unreviewed_test, weak_test, duplicate_test]",
    "- All scores are integers 0-100. All counts are non-negative integers.",
    "- findings may be an empty array if nothing is genuinely wrong.",
    "",
    "Do not include fields outside this shape.",
  ].join("\n");
}

function buildUserMessage(args: {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  testData: TestData[];
  artifacts: AutomationArtifact[];
}): string {
  const { requirement, analysis, testCases, testData, artifacts } = args;
  return [
    "Evaluate the quality of the following QA artifacts.",
    "",
    "REQUIREMENT:",
    requirement
      ? JSON.stringify(
          {
            id: requirement.id,
            title: requirement.title,
            description: requirement.description,
            acceptanceCriteria: requirement.acceptanceCriteria,
          },
          null,
          2
        )
      : "null",
    "",
    "REQUIREMENT ANALYSIS:",
    analysis
      ? JSON.stringify(
          {
            requirementId: analysis.requirementId,
            overallScore: analysis.overallScore,
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
        )
      : "null",
    "",
    "TEST CASES:",
    JSON.stringify(
      testCases.map((tc) => ({
        id: tc.id,
        requirementId: tc.requirementId,
        title: tc.title,
        type: tc.type,
        priority: tc.priority,
        source: tc.source,
        reviewStatus: tc.reviewStatus,
        hasSteps: tc.steps.length,
        expectedResult: tc.expectedResult,
      })),
      null,
      2
    ),
    "",
    "TEST DATA (summarized):",
    JSON.stringify(
      testData.map((td) => ({
        id: td.id,
        testCaseId: td.testCaseId,
        fieldNames: td.fields.map((f) => f.name),
        fieldCount: td.fields.length,
      })),
      null,
      2
    ),
    "",
    "AUTOMATION ARTIFACTS:",
    JSON.stringify(
      artifacts.map((a) => ({
        testCaseId: a.testCaseId,
        requirementId: a.requirementId,
        fileName: a.fileName,
      })),
      null,
      2
    ),
    "",
    `Set requirementId exactly to: ${requirement?.id ?? ""}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type QualityAgentErrorCode =
  | "missing_api_key"
  | "provider_error"
  | "invalid_response"
  | "empty_response";

/** Controlled, user-safe error. Never serialize `cause` to the client. */
export class QualityAgentError extends Error {
  code: QualityAgentErrorCode;
  userMessage: string;
  cause?: Error;

  constructor(
    code: QualityAgentErrorCode,
    userMessage: string,
    cause?: Error
  ) {
    super(userMessage);
    this.name = "QualityAgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

function toAgentError(err: unknown): QualityAgentError {
  if (err instanceof QualityAgentError) return err;
  if (err instanceof OpenRouterError) {
    switch (err.code) {
      case "missing_api_key":
      case "invalid_api_key":
        return new QualityAgentError(
          "missing_api_key",
          "AI service is temporarily unavailable.",
          err
        );
      case "rate_limited":
        return new QualityAgentError(
          "provider_error",
          "AI service is busy. Please try again.",
          err
        );
      case "invalid_json":
      case "empty_response":
        return new QualityAgentError(
          "invalid_response",
          "AI returned an unexpected response. Please try again.",
          err
        );
      default:
        return new QualityAgentError(
          "provider_error",
          "AI service is temporarily unavailable.",
          err
        );
    }
  }
  return new QualityAgentError(
    "provider_error",
    "Unable to generate the quality report. Please try again.",
    err instanceof Error ? err : undefined
  );
}

// ---------------------------------------------------------------------------
// Public API (server-side)
// ---------------------------------------------------------------------------

/**
 * Generate a QualityReport via the real LLM (OpenRouter).
 * Server-side only — never import into client components.
 * Throws QualityAgentError with a safe userMessage on failure.
 */
export async function generateQualityReport(args: {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  testData: TestData[];
  artifacts: AutomationArtifact[];
}): Promise<QualityReport> {
  const { requirement } = args;

  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserMessage(args) },
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
    return validateQualityReport(raw, requirement?.id ?? "");
  } catch (err) {
    throw toAgentError(err);
  }
}
