// Traceability helpers shared across screens. Kept here so no screen
// re-implements pipeline mapping logic.

import type {
  AutomationArtifact,
  Requirement,
  TestCase,
  TestData,
  TraceabilityItem,
  WorkflowStage,
} from "@/types/qa";

/** Deterministic pseudo-id generator (no crypto randomness needed for mock ids). */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(
    Math.random() * 46656
  )
    .toString(36)
    .toUpperCase()
    .padStart(3, "0")}`;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function countApproved(testCases: TestCase[]): number {
  return testCases.filter((tc) => tc.reviewStatus === "approved").length;
}

export function countRejected(testCases: TestCase[]): number {
  return testCases.filter((tc) => tc.reviewStatus === "rejected").length;
}

export function countPending(testCases: TestCase[]): number {
  return testCases.filter((tc) => tc.reviewStatus === "pending").length;
}

export function countAiDerived(testCases: TestCase[]): number {
  return testCases.filter((tc) => tc.source === "AI-Derived").length;
}

export function hasAutomation(
  artifacts: AutomationArtifact[],
  testCaseId: string
): boolean {
  return artifacts.some((a) => a.testCaseId === testCaseId);
}

export function buildTraceability(
  requirement: Requirement | null,
  testCases: TestCase[],
  artifacts: AutomationArtifact[]
): TraceabilityItem[] {
  if (!requirement) return [];
  return testCases.map((tc) => ({
    requirementId: requirement.id,
    testCaseId: tc.id,
    source: tc.source,
    reviewStatus: tc.reviewStatus,
    hasAutomation: hasAutomation(artifacts, tc.id),
  }));
}

export function buildWorkflowStages(
  requirement: Requirement | null,
  testCases: TestCase[],
  testData: TestData[],
  artifacts: AutomationArtifact[]
): WorkflowStage[] {
  const approved = countApproved(testCases);
  return [
    {
      key: "requirement",
      label: "Requirement",
      count: requirement ? 1 : 0,
      complete: requirement !== null,
    },
    {
      key: "test-cases",
      label: "Test Generation",
      count: testCases.length,
      complete: testCases.length > 0,
    },
    {
      key: "test-data",
      label: "Test Data",
      count: testData.length,
      complete: testData.length > 0,
    },
    {
      key: "review",
      label: "Human Review",
      count: approved,
      complete: testCases.length > 0 && approved === testCases.length,
    },
    {
      key: "automation",
      label: "Automation",
      count: artifacts.length,
      complete: artifacts.length > 0,
    },
  ];
}
