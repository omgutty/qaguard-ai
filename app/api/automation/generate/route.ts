import { connection, NextResponse } from "next/server";
import {
  generateAutomation,
  AutomationAgentError,
} from "@/agents/automation-agent";
import { assertApprovedForAutomation } from "@/lib/validation/automation";
import type {
  AutomationArtifact,
  Requirement,
  TestCase,
  TestData,
} from "@/types/qa";

export const runtime = "nodejs";

interface AutomationBody {
  testCase?: unknown;
  testData?: unknown;
  requirement?: unknown;
}

/**
 * POST /api/automation/generate
 * Browser → this route (server) → Automation Agent → OpenRouter → validated JSON.
 * Governance: ONLY approved test cases may be automated. Unapproved → 403.
 */
export async function POST(request: Request) {
  // Next.js 16: await connection() so process.env is read at runtime.
  await connection();

  let body: AutomationBody;
  try {
    body = (await request.json()) as AutomationBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const testCase = body.testCase as TestCase | null;
  const testData = body.testData as TestData | null;
  const requirement = (body.requirement as Requirement | null) ?? null;

  if (!testCase || typeof testCase !== "object" || !testCase.id) {
    return NextResponse.json(
      { error: "A valid test case is required." },
      { status: 400 }
    );
  }
  if (!testData || typeof testData !== "object" || testData.testCaseId !== testCase.id) {
    return NextResponse.json(
      { error: "Matching test data is required." },
      { status: 400 }
    );
  }

  // Governance gate — do NOT call the LLM for unapproved tests.
  try {
    assertApprovedForAutomation(testCase.reviewStatus);
  } catch {
    return NextResponse.json(
      { error: "Only approved test cases can be automated." },
      { status: 403 }
    );
  }

  try {
    const artifact: AutomationArtifact = await generateAutomation({
      testCase,
      testData,
      requirement,
    });

    return NextResponse.json({ artifact });
  } catch (err) {
    if (err instanceof AutomationAgentError) {
      const status =
        err.code === "missing_api_key" || err.code === "provider_error"
          ? 503
          : 502;
      return NextResponse.json({ error: err.userMessage }, { status });
    }
    return NextResponse.json(
      { error: "Unable to generate automation. Please try again." },
      { status: 500 }
    );
  }
}
