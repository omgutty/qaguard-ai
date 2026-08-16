// Quality Agent — deterministic QualityReport derived from real pipeline state (Phase 1).
// Phase 2: swap internals for an LLM call, keep generateQualityReport() signature.

import { computeQualityReport } from "@/lib/utils/scoring";
import type {
  AutomationArtifact,
  QualityReport,
  Requirement,
  RequirementAnalysis,
  TestCase,
} from "@/types/qa";

export function generateQualityReport(args: {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  artifacts: AutomationArtifact[];
}): QualityReport {
  return computeQualityReport(args);
}
