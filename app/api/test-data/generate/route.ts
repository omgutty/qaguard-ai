import { connection, NextResponse } from "next/server";
import {
  generateTestData,
  TestDataAgentError,
} from "@/agents/test-data-agent";
import { generateQualityReport } from "@/agents/quality-agent";
import type {
  Requirement,
  RequirementAnalysis,
  TestCase,
} from "@/types/qa";

export const runtime = "nodejs";

interface GenerateBody {
  requirement?: unknown;
  analysis?: unknown;
  testCases?: unknown;
}

/**
 * POST /api/test-data/generate
 * Browser → this route (server) → Test Data Agent → OpenRouter → validated JSON.
 * Runs the mock quality agent server-side so the dashboard keeps working.
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
  const testCases = body.testCases;

  if (
    !requirement ||
    typeof requirement !== "object" ||
    !analysis ||
    typeof analysis !== "object" ||
    !Array.isArray(testCases) ||
    testCases.length === 0
  ) {
    return NextResponse.json(
      { error: "Requirement, analysis, and test cases are required." },
      { status: 400 }
    );
  }

  const req = requirement as Requirement;
  const ana = analysis as RequirementAnalysis;
  const tcs = testCases as TestCase[];

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
  if (tcs.some((tc) => !tc.id || tc.requirementId !== req.id)) {
    return NextResponse.json(
      { error: "Test cases are malformed or do not match the requirement." },
      { status: 400 }
    );
  }

  try {
    const testData = await generateTestData(req, ana, tcs);
    const qualityReport = generateQualityReport({
      requirement: req,
      analysis: ana,
      testCases: tcs,
      artifacts: [],
    });

    return NextResponse.json({
      testData,
      qualityReport,
    });
  } catch (err) {
    if (err instanceof TestDataAgentError) {
      const status =
        err.code === "missing_api_key" || err.code === "provider_error"
          ? 503
          : 502;
      return NextResponse.json({ error: err.userMessage }, { status });
    }
    return NextResponse.json(
      { error: "Unable to generate test data. Please try again." },
      { status: 500 }
    );
  }
}
