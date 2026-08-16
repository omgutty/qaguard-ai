// Quality Agent — deterministic mock (Phase 1). Preserved for reference/testing.
// The production agent (quality-agent.ts) now uses the real LLM.

import { computeQualityReport } from "@/lib/utils/scoring";
import type {
  AutomationArtifact,
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
} from "@/types/qa";

export function generateQualityReportMock(args: {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  artifacts: AutomationArtifact[];
}): QualityReport {
  return computeQualityReport(args);
}
