// Test Engine Agent — deterministic mock test case generation (Phase 1).
// Phase 2: swap internals for an LLM call, keep generateTestCases() signature.

import { makeId } from "@/lib/utils/traceability";
import type {
  Requirement,
  RequirementAnalysis,
  TestCase,
  TestCaseType,
  TestDataSource,
} from "@/types/qa";

/** Wrap a requirement sentence into a verifiable assertion phrase. */
function criterionPhrase(criterion: string): string {
  return criterion.trim().replace(/\.$/, "");
}

function buildPositiveCases(
  requirement: Requirement,
  criteria: string[]
): TestCase[] {
  const cases: TestCase[] = [];
  criteria.forEach((raw, idx) => {
    const criterion = criterionPhrase(raw);
    const number = idx + 1;
    cases.push({
      id: makeId("TC"),
      requirementId: requirement.id,
      title: `Valid submission: ${criterion.slice(0, 48)}`,
      description: `Verifies the acceptance criterion "${criterion}" is met on the happy path.`,
      type: "positive",
      priority: "high",
      source: `Acceptance Criteria #${number}` as TestDataSource,
      preconditions: ["User has access to the feature."],
      steps: [
        {
          stepNumber: 1,
          action: "Open the feature and begin a new submission.",
          testData: "Valid representative input",
          expectedResult: "The submission form is displayed without errors.",
        },
        {
          stepNumber: 2,
          action: `Submit with the expected inputs (${criterion}).`,
          testData: criterion,
          expectedResult: criterion,
        },
        {
          stepNumber: 3,
          action: "Confirm the success state.",
          testData: "—",
          expectedResult:
            "The system confirms the action succeeded and the result is visible.",
        },
      ],
      expectedResult: criterion,
      reviewStatus: "pending",
    });
  });
  return cases;
}

function buildNegativeCase(requirement: Requirement): TestCase {
  return {
    id: makeId("TC"),
    requirementId: requirement.id,
    title: "Rejection of invalid or empty input",
    description:
      "Confirms the system rejects clearly invalid input and surfaces an actionable error rather than failing silently.",
    type: "negative",
    priority: "high",
    source: "AI-Derived",
    preconditions: ["User has access to the feature."],
    steps: [
      {
        stepNumber: 1,
        action: "Begin a new submission.",
        testData: "Empty / blank inputs",
        expectedResult: "Submit is disabled or shows a validation message.",
      },
      {
        stepNumber: 2,
        action: "Enter clearly invalid values and submit.",
        testData: "Invalid format, out-of-range values",
        expectedResult:
          "The system shows a clear error and does not create a record.",
      },
      {
        stepNumber: 3,
        action: "Attempt to proceed after the error.",
        testData: "—",
        expectedResult:
          "No partial record is created; the user can correct and retry.",
      },
    ],
    expectedResult:
      "Invalid input is rejected with a clear, actionable error message and no record is created.",
    reviewStatus: "pending",
  };
}

function buildBoundaryCase(requirement: Requirement): TestCase {
  return {
    id: makeId("TC"),
    requirementId: requirement.id,
    title: "Boundary values for input limits",
    description:
      "Verifies behavior at and around minimum/maximum input boundaries where off-by-one defects commonly hide.",
    type: "boundary",
    priority: "medium",
    source: "AI-Derived",
    preconditions: ["User has access to the feature."],
    steps: [
      {
        stepNumber: 1,
        action: "Enter the minimum acceptable value for each field.",
        testData: "Minimum boundary values",
        expectedResult: "Input is accepted or rejected per defined limits.",
      },
      {
        stepNumber: 2,
        action: "Enter the maximum acceptable value for each field.",
        testData: "Maximum boundary values",
        expectedResult: "Input is accepted or rejected per defined limits.",
      },
      {
        stepNumber: 3,
        action: "Enter one unit above the maximum and one below the minimum.",
        testData: "Over/under boundary values",
        expectedResult:
          "The system enforces the limit with a clear validation message.",
      },
    ],
    expectedResult:
      "Boundary values behave per the defined limits, including a clean rejection just outside them.",
    reviewStatus: "pending",
  };
}

function buildValidationCase(requirement: Requirement): TestCase {
  return {
    id: makeId("TC"),
    requirementId: requirement.id,
    title: "Validation of field formats and required fields",
    description:
      "Checks required-field and format validation across the input form.",
    type: "validation",
    priority: "medium",
    source: "AI-Derived",
    preconditions: ["User has access to the feature."],
    steps: [
      {
        stepNumber: 1,
        action: "Leave all required fields empty and submit.",
        testData: "All fields empty",
        expectedResult:
          "Each required field shows a validation message.",
      },
      {
        stepNumber: 2,
        action: "Enter malformed values (bad email, bad format).",
        testData: "Malformed values",
        expectedResult:
          "Format validation rejects the input with specific errors.",
      },
      {
        stepNumber: 3,
        action: "Correct the errors and resubmit.",
        testData: "Valid corrected values",
        expectedResult: "Submission proceeds past validation.",
      },
    ],
    expectedResult:
      "Required and formatted fields are validated with specific, recoverable error messages.",
    reviewStatus: "pending",
  };
}

function buildSecurityCase(requirement: Requirement): TestCase {
  return {
    id: makeId("TC"),
    requirementId: requirement.id,
    title: "Unauthorized access is blocked",
    description:
      "Confirms unauthenticated/unauthorized users cannot reach protected functionality.",
    type: "security",
    priority: "critical",
    source: "AI-Derived",
    preconditions: ["The user is not authenticated, or lacks the required role."],
    steps: [
      {
        stepNumber: 1,
        action: "Attempt to access the feature while unauthenticated.",
        testData: "Unauthenticated session",
        expectedResult:
          "Access is redirected to sign-in or blocked with 401.",
      },
      {
        stepNumber: 2,
        action: "Attempt to access with a role lacking permission.",
        testData: "Insufficient-role account",
        expectedResult:
          "Access is denied; sensitive data is not exposed.",
      },
      {
        stepNumber: 3,
        action: "Inspect the response for sensitive leakage.",
        testData: "—",
        expectedResult:
          "No sensitive data (credentials, PII, internal ids) is returned.",
      },
    ],
    expectedResult:
      "Unauthorized access is blocked and no sensitive data leaks.",
    reviewStatus: "pending",
  };
}

function buildRegressionCase(requirement: Requirement): TestCase {
  return {
    id: makeId("TC"),
    requirementId: requirement.id,
    title: "Regression: core flow remains intact after changes",
    description:
      "Guard test — re-runs the primary acceptance flow to catch regressions introduced by future changes.",
    type: "regression",
    priority: "medium",
    source: "AI-Derived",
    preconditions: ["The feature is deployed to the target environment."],
    steps: [
      {
        stepNumber: 1,
        action: "Execute the primary end-to-end flow for this requirement.",
        testData: "Representative happy-path data",
        expectedResult: "The primary flow completes successfully.",
      },
      {
        stepNumber: 2,
        action: "Verify previously-fixed defect scenarios still pass.",
        testData: "Historical defect cases",
        expectedResult: "No previously-fixed defect regresses.",
      },
    ],
    expectedResult:
      "Core behavior remains stable after changes; no regression is introduced.",
    reviewStatus: "pending",
  };
}

export function generateTestCases(
  requirement: Requirement,
  analysis: RequirementAnalysis
): TestCase[] {
  const criteria = requirement.acceptanceCriteria.filter((c) => c.trim());

  if (criteria.length === 0) {
    return [];
  }

  const cases: TestCase[] = [];
  cases.push(...buildPositiveCases(requirement, criteria));

  const derived: { build: (r: Requirement) => TestCase; type: TestCaseType }[] = [
    { build: buildNegativeCase, type: "negative" },
    { build: buildBoundaryCase, type: "boundary" },
    { build: buildValidationCase, type: "validation" },
  ];

  // Security case only when the requirement mentions auth/sensitive handling.
  const text = `${requirement.title} ${requirement.description} ${criteria.join(
    " "
  )}`.toLowerCase();
  if (/(password|auth|login|session|permission|role|ssn|card|secret)/i.test(text)) {
    derived.push({ build: buildSecurityCase, type: "security" });
  }

  // Regression case when the analysis flagged gaps that future changes may reintroduce.
  if (analysis.gaps.length > 0 || analysis.testabilityScore < 60) {
    derived.push({ build: buildRegressionCase, type: "regression" });
  }

  derived.forEach((d) => {
    cases.push(d.build(requirement));
  });

  // Attach stable, non-conflicting type ordering: positive first, then derived.
  const typeOrder: TestCaseType[] = [
    "positive",
    "negative",
    "boundary",
    "validation",
    "security",
    "regression",
  ];
  cases.sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );

  return cases;
}
