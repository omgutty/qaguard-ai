// QAGuard AI — Core data contracts for the V1 pipeline:
// Requirement → RequirementAnalysis → TestCase[] → TestData[] → Human Review
//   → AutomationArtifact[] → QualityReport

// ---------------------------------------------------------------------------
// Controlled vocabularies (union types)
// ---------------------------------------------------------------------------

export type TestCaseType =
  | "positive"
  | "negative"
  | "boundary"
  | "validation"
  | "security"
  | "regression";

export type TestPriority = "low" | "medium" | "high" | "critical";

export type ReviewStatus = "pending" | "approved" | "rejected" | "modified";

export type ReviewDecision = "approve" | "reject";

export type TestDataSource =
  | "Acceptance Criteria #1"
  | "Acceptance Criteria #2"
  | "Acceptance Criteria #3"
  | "Acceptance Criteria #4"
  | "Acceptance Criteria #5"
  | "AI-Derived";

export type AutomationFramework = "playwright";

export type AutomationLanguage = "typescript";

export type TestDataFieldType =
  | "string"
  | "email"
  | "password"
  | "number"
  | "url"
  | "boolean"
  | "date"
  | "uuid"
  | "role"
  | "phone";

// ---------------------------------------------------------------------------
// Requirement & Analysis
// ---------------------------------------------------------------------------

export interface Requirement {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  createdAt: string;
}

export type RequirementGapType =
  | "missing_acceptance_criteria"
  | "ambiguous"
  | "unverifiable"
  | "unclear_error_handling";

export interface RequirementGap {
  id: string;
  type: RequirementGapType;
  description: string;
  suggestion: string;
  /** Where in the requirement this gap was detected. */
  source: "Description" | "Acceptance Criteria";
}

export interface RequirementRisk {
  id: string;
  severity: "low" | "medium" | "high";
  description: string;
  mitigation: string;
}

export type RecommendationType = "clarity" | "testability" | "coverage" | "security";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  text: string;
  /** Whether this is derived from the requirement itself or AI-inferred. */
  origin: "derived" | "ai";
}

export interface RequirementAnalysis {
  requirementId: string;
  completenessScore: number;
  clarityScore: number;
  testabilityScore: number;
  overallScore: number;
  gaps: RequirementGap[];
  risks: RequirementRisk[];
  recommendations: Recommendation[];
}

// ---------------------------------------------------------------------------
// Test Cases
// ---------------------------------------------------------------------------

export interface TestStep {
  stepNumber: number;
  action: string;
  testData: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  requirementId: string;
  title: string;
  description: string;
  type: TestCaseType;
  priority: TestPriority;
  source: TestDataSource;
  preconditions: string[];
  steps: TestStep[];
  expectedResult: string;
  reviewStatus: ReviewStatus;
}

export interface TestCaseReview {
  testCaseId: string;
  decision: ReviewDecision;
  comment?: string;
  reviewedAt: string;
}

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

export interface TestDataField {
  name: string;
  value: string;
  type: TestDataFieldType;
  sensitive: boolean;
}

export interface TestData {
  id: string;
  testCaseId: string;
  fields: TestDataField[];
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

export interface AutomationArtifact {
  testCaseId: string;
  requirementId: string;
  framework: AutomationFramework;
  language: AutomationLanguage;
  fileName: string;
  code: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

export type QualityFindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type QualityFindingCategory =
  | "missing_coverage"
  | "negative_coverage"
  | "boundary_coverage"
  | "ambiguity"
  | "risk_without_test"
  | "missing_test_data"
  | "traceability_gap"
  | "unreviewed_test"
  | "weak_test"
  | "duplicate_test";

export interface QualityFinding {
  id: string;
  severity: QualityFindingSeverity;
  category: QualityFindingCategory;
  description: string;
  /** Evidence / source in the pipeline this finding is based on. */
  evidence: string;
  recommendation: string;
}

export interface QualityReport {
  requirementId: string;
  overallScore: number;
  requirementCoverage: number;
  testCoverage: number;
  traceabilityScore: number;
  testabilityScore: number;
  aiConfidence: number;
  requirementGaps: number;
  aiDerivedTests: number;
  approvedTests: number;
  rejectedTests: number;
  /** AI-generated findings (empty for deterministic mock output). */
  findings: QualityFinding[];
}

export type WorkflowStageKey =
  | "requirement"
  | "test-cases"
  | "test-data"
  | "review"
  | "automation"
  | "quality";

export interface TraceabilityItem {
  requirementId: string;
  testCaseId: string;
  source: TestDataSource;
  reviewStatus: ReviewStatus;
  hasAutomation: boolean;
}

export interface WorkflowStage {
  key: WorkflowStageKey;
  label: string;
  count: number;
  complete: boolean;
}

// ---------------------------------------------------------------------------
// Shared application state
// ---------------------------------------------------------------------------

export interface WorkflowState {
  requirement: Requirement | null;
  analysis: RequirementAnalysis | null;
  testCases: TestCase[];
  testData: TestData[];
  reviews: TestCaseReview[];
  automationArtifacts: AutomationArtifact[];
  qualityReport: QualityReport | null;
}
