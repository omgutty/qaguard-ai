import { connection, NextResponse } from "next/server";
import {
  generateTestCases,
  TestEngineAgentError,
} from "@/agents/test-engine-agent";
import { generateTestDataMock } from "@/agents/test-data-agent.mock";
import { generateQualityReport } from "@/agents/quality-agent";
import type { Requirement, RequirementAnalysis } from "@/types/qa";

export const runtime = "nodejs";

interface GenerateBody {
  requirement?: unknown;
  analysis?: unknown;
}

/**
 * POST /api/test-cases/generate
 * Browser → this route (server) → Test Engine Agent → OpenRouter → validated JSON.
 * Runs the mock test-data + quality agents so the downstream pages stay usable;
 * the real Test Data Agent runs in /api/test-data/generate as a separate step.
 */
export async function POST(request: Request) {
  // Next.js 16: await connection() so process.env is read at runtime.
  await connection();

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requirement = body.requirement;
  const analysis = body.analysis;
  if (
    !requirement ||
    typeof requirement !== "object" ||
    !analysis ||
    typeof analysis !== "object"
  ) {
    return NextResponse.json(
      { error: "Requirement and analysis are required." },
      { status: 400 }
    );
  }

  const req = requirement as Requirement;
  const ana = analysis as RequirementAnalysis;
  if (!req.id || !req.title) {
    return NextResponse.json(
      { error: "Requirement is malformed." },
      { status: 400 }
    );
  }
  if (ana.requirementId !== req.id) {
    return NextResponse.json(
      { error: "Analysis does not match the requirement." },
      { status: 400 }
    );
  }

  try {
    const testCases = await generateTestCases(req, ana);

    // Mock test data so the test-data page is not empty while the real agent
    // runs in a separate step. Quality stays mock (Phase 2 Step 5 later).
    const testData = testCases.map((tc) => generateTestDataMock(tc));
    const qualityReport = generateQualityReport({
      requirement: req,
      analysis: ana,
      testCases,
      testData,
      artifacts: [],
    });

    return NextResponse.json({
      testCases,
      testData,
      qualityReport,
    });
  } catch (err) {
    if (err instanceof TestEngineAgentError) {
      // validation_error → 422 (contract not met, retryable); provider issues → 503.
      if (err.code === "validation_error") {
        return NextResponse.json(
          { error: err.userMessage },
          { status: 422 }
        );
      }
      const status =
        err.code === "missing_api_key" || err.code === "provider_error"
          ? 503
          : 502;
      return NextResponse.json({ error: err.userMessage }, { status });
    }
    return NextResponse.json(
      { error: "Unable to generate test cases. Please try again." },
      { status: 500 }
    );
  }
}
