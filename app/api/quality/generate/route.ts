import { connection, NextResponse } from "next/server";
import {
  generateQualityReport,
  QualityAgentError,
} from "@/agents/quality-agent";
import type {
  AutomationArtifact,
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
  TestData,
} from "@/types/qa";

export const runtime = "nodejs";

interface QualityBody {
  requirement?: unknown;
  analysis?: unknown;
  testCases?: unknown;
  testData?: unknown;
  artifacts?: unknown;
}

/**
 * POST /api/quality/generate
 * Browser → this route (server) → Quality Agent → OpenRouter → validated JSON.
 */
export async function POST(request: Request) {
  // Next.js 16: await connection() so process.env is read at runtime.
  await connection();

  let body: QualityBody;
  try {
    body = (await request.json()) as QualityBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requirement = body.requirement as Requirement | null;
  const analysis = body.analysis as RequirementAnalysis | null;
  const testCases = Array.isArray(body.testCases) ? (body.testCases as TestCase[]) : [];
  const testData = Array.isArray(body.testData) ? (body.testData as TestData[]) : [];
  const artifacts = Array.isArray(body.artifacts)
    ? (body.artifacts as AutomationArtifact[])
    : [];

  if (!requirement || typeof requirement !== "object" || !requirement.id) {
    return NextResponse.json(
      { error: "A valid requirement is required." },
      { status: 400 }
    );
  }
  if (!analysis || typeof analysis !== "object" || analysis.requirementId !== requirement.id) {
    return NextResponse.json(
      { error: "A matching analysis is required." },
      { status: 400 }
    );
  }
  if (testCases.some((tc) => tc.requirementId !== requirement.id)) {
    return NextResponse.json(
      { error: "Test cases do not match the requirement." },
      { status: 400 }
    );
  }

  try {
    const report: QualityReport = await generateQualityReport({
      requirement,
      analysis,
      testCases,
      testData,
      artifacts,
    });

    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof QualityAgentError) {
      const status =
        err.code === "missing_api_key" || err.code === "provider_error"
          ? 503
          : 502;
      return NextResponse.json({ error: err.userMessage }, { status });
    }
    return NextResponse.json(
      { error: "Unable to generate the quality report. Please try again." },
      { status: 500 }
    );
  }
}
