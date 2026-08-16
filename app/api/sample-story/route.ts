import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

/**
 * GET /api/sample-story
 * Returns the contents of examples/story.md so the UI can load it without
 * hardcoding the story into a component. The file at examples/story.md is the
 * single source of truth.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "examples", "story.md");
    const content = await readFile(filePath, "utf8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      { error: "Sample story is unavailable. Please try again." },
      { status: 500 }
    );
  }
}
