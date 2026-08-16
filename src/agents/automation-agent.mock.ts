// Automation Agent — deterministic mock (Phase 1). Preserved for reference/testing.
// The production agent (automation-agent.ts) now uses the real LLM.
// Note: generates code as a string; Playwright is NOT installed or executed.

import type {
  AutomationArtifact,
  TestCase,
  TestData,
} from "@/types/qa";

/** Escape a string for embedding in a TS/JS string literal. */
function tsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function sanitizeFileName(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "test-case"
  );
}

function actionForStep(step: { action: string; testData: string }): string {
  const action = step.action.toLowerCase();
  if (action.includes("submit") || action.includes("confirm")) {
    return `await page.getByRole("button", { name: /submit|confirm|save/i }).first().click();`;
  }
  if (action.includes("click") || action.includes("open") || action.includes("navigate")) {
    return `await page.getByRole("link", { name: /open|begin|new|view/i }).first().click();`;
  }
  if (action.includes("enter") || action.includes("fill") || action.includes("input")) {
    return `await page.getByRole("textbox").first().fill("${tsString(
      step.testData
    )}");`;
  }
  return `await page.getByRole("textbox").first().fill("${tsString(step.testData)}");`;
}

function assertionForTestCase(testCase: TestCase): string {
  switch (testCase.type) {
    case "negative":
    case "validation":
      return `await expect(page.getByText(/error|invalid|required/i).first()).toBeVisible();`;
    case "security":
      return `await expect(page.getByText(/403|denied|unauthorized/i).first()).toBeVisible();`;
    case "boundary":
      return `await expect(page.getByText(/must be|between|limit/i).first()).toBeVisible();`;
    default:
      return `await expect(page.getByRole("status").first()).toBeVisible();`;
  }
}

export function generateAutomationMock(
  testCase: TestCase,
  testData: TestData
): AutomationArtifact {
  const stepCode = testCase.steps
    .map((step) => {
      const indent = "  ";
      return `${indent}// Step ${step.stepNumber}: ${step.action}\n${indent}${actionForStep(
        step
      )}`;
    })
    .join("\n");

  const fileName = `${sanitizeFileName(testCase.title)}.spec.ts`;
  const code = `import { test, expect } from "@playwright/test";

test("${tsString(testCase.title)}", async ({ page }) => {
  // Precondition: ${testCase.preconditions[0] ?? "none"}
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill("${tsString(
    testData.fields.find((f) => f.type === "email")?.value ?? "user@example.com"
  )}");
  await page.getByLabel("Password").fill("${tsString(
    testData.fields.find((f) => f.type === "password")?.value ?? "password"
  )}");

${stepCode}

  ${assertionForTestCase(testCase)}
});`;

  return {
    testCaseId: testCase.id,
    requirementId: testCase.requirementId,
    framework: "playwright",
    language: "typescript",
    fileName,
    code,
    generatedAt: new Date().toISOString(),
  };
}

/** Batch helper: generate artifacts for a set of approved test cases. */
export function generateAutomationBatchMock(
  approvedTestCases: TestCase[],
  testData: TestData[]
): AutomationArtifact[] {
  return approvedTestCases
    .map((tc) => {
      const data = testData.find((td) => td.testCaseId === tc.id);
      if (!data) return null;
      return generateAutomationMock(tc, data);
    })
    .filter((a): a is AutomationArtifact => a !== null);
}
