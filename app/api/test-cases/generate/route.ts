import { connection, NextResponse } from "next/server";
import {
  generateTestCases,
  TestEngineAgentError,
} from "@/agents/test-engine-agent";
import { generateTestData } from "@/agents/test-data-agent";
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
 * Runs the downstream mock agents (test data, quality) server-side so the
 * rest of the governed workflow keeps working.
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
    const testData = testCases.map((tc) => generateTestData(tc));
    const qualityReport = generateQualityReport({
      requirement: req,
      analysis: ana,
      testCases,
      artifacts: [],
    });

    return NextResponse.json({
      testCases,
      testData,
      qualityReport,
    });
  } catch (err) {
    if (err instanceof TestEngineAgentError) {
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
