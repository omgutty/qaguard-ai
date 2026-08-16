import { connection, NextResponse } from "next/server";
import { analyzeRequirement, RequirementAgentError } from "@/agents/requirement-agent";
import { validateRequirementInput } from "@/lib/validation/requirement";
import { makeId } from "@/lib/utils/traceability";
import type { Requirement } from "@/types/qa";

export const runtime = "nodejs";

interface AnalyzeBody {
  title?: unknown;
  description?: unknown;
  acceptanceCriteria?: unknown;
}

/**
 * POST /api/requirements/analyze
 * Browser → this route (server) → Requirement Agent → OpenRouter → validated JSON.
 * Returns only the requirement + analysis; test case generation happens in a
 * separate step via /api/test-cases/generate.
 */
export async function POST(request: Request) {
  // Next.js 16: await connection() to opt into dynamic rendering so
  // process.env (OPENROUTER_API_KEY) is evaluated at runtime, not build time.
  await connection();

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const acceptanceCriteria = Array.isArray(body.acceptanceCriteria)
    ? body.acceptanceCriteria.filter(
        (c): c is string => typeof c === "string"
      )
    : [];

  const inputValidation = validateRequirementInput({
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    acceptanceCriteria,
  });
  if (!inputValidation.valid) {
    return NextResponse.json(
      { error: inputValidation.errors.join(" ") },
      { status: 400 }
    );
  }

  const requirement: Requirement = {
    id: makeId("REQ"),
    title: (body.title as string).trim(),
    description: (body.description as string).trim(),
    acceptanceCriteria: acceptanceCriteria.map((c) => c.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };

  try {
    const analysis = await analyzeRequirement(requirement);
    return NextResponse.json({ requirement, analysis });
  } catch (err) {
    if (err instanceof RequirementAgentError) {
      const status =
        err.code === "missing_api_key" || err.code === "provider_error"
          ? 503
          : 502;
      return NextResponse.json(
        { error: err.userMessage },
        { status }
      );
    }
    // Unknown error — never leak internals.
    return NextResponse.json(
      { error: "Unable to analyze the requirement. Please try again." },
      { status: 500 }
    );
  }
}
