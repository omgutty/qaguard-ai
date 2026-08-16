// Client-side validation helpers (no external schema libs in Phase 1).

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRequirementInput(input: {
  title: string;
  description: string;
  acceptanceCriteria: string[];
}): ValidationResult {
  const errors: string[] = [];
  if (!input.title.trim()) {
    errors.push("Requirement title is required.");
  }
  if (!input.description.trim()) {
    errors.push("Requirement description is required.");
  }
  const nonEmptyCriteria = input.acceptanceCriteria.filter((c) => c.trim());
  if (nonEmptyCriteria.length === 0) {
    errors.push("Add at least one acceptance criterion.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateAutomationReady(testCaseIds: string[]): ValidationResult {
  return {
    valid: testCaseIds.length > 0,
    errors: testCaseIds.length > 0 ? [] : ["No approved test cases yet."],
  };
}
