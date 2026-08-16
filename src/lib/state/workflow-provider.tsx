"use client";

// Single source of truth for the whole pipeline. Client-only state that
// survives navigation AND page refresh via localStorage persistence.
//
// Hydration-safe pattern:
// - SSR + first client render: deterministic empty state (no localStorage
//   read), so server and client match exactly.
// - After hydration: the store is initialized from localStorage; all reads
//   flow through useSyncExternalStore, all writes go to the store + persisted.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  AutomationArtifact,
  QualityReport,
  Requirement,
  RequirementAnalysis,
  ReviewStatus,
  TestCase,
  TestData,
  WorkflowState,
} from "@/types/qa";

interface WorkflowContextValue {
  state: WorkflowState;
  setRequirement: (r: Requirement | null) => void;
  setAnalysis: (a: RequirementAnalysis | null) => void;
  setTestCases: (tc: TestCase[]) => void;
  setTestData: (td: TestData[]) => void;
  setReviews: Dispatch<SetStateAction<WorkflowState["reviews"]>>;
  setAutomationArtifacts: (a: AutomationArtifact[]) => void;
  setQualityReport: (q: QualityReport | null) => void;
  updateTestCase: (id: string, patch: Partial<TestCase>) => void;
  updateTestDataField: (testDataId: string, fieldIndex: number, value: string) => void;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

const STORAGE_KEY = "qaguard-workflow";
const SCHEMA_VERSION = 2;

const EMPTY_STATE: WorkflowState = {
  requirement: null,
  analysis: null,
  testCases: [],
  testData: [],
  reviews: [],
  automationArtifacts: [],
  qualityReport: null,
};

/**
 * Migrate a persisted qualityReport from an older schema into the current one.
 * Old reports (pre-`findings`/`requirementId`) are repaired defensively so a
 * stale localStorage entry can never crash a page. Unknown shapes are reset.
 */
function migrateQualityReport(raw: unknown): QualityReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const toScore = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : fallback;
  const toCount = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
  return {
    requirementId: typeof r.requirementId === "string" ? r.requirementId : "",
    overallScore: toScore(r.overallScore),
    requirementCoverage: toScore(r.requirementCoverage),
    testCoverage: toScore(r.testCoverage),
    traceabilityScore: toScore(r.traceabilityScore),
    testabilityScore: toScore(r.testabilityScore),
    aiConfidence: toScore(r.aiConfidence),
    requirementGaps: toCount(r.requirementGaps),
    aiDerivedTests: toCount(r.aiDerivedTests),
    approvedTests: toCount(r.approvedTests),
    rejectedTests: toCount(r.rejectedTests),
    findings: Array.isArray(r.findings) ? r.findings : [],
  };
}

function sanitizeStored(raw: string): WorkflowState {
  const parsed = JSON.parse(raw) as Partial<WorkflowState> & { schemaVersion?: number };
  if (!parsed || typeof parsed !== "object") return EMPTY_STATE;
  // If this is a newer schema we don't understand, start fresh.
  if (parsed.schemaVersion && parsed.schemaVersion > SCHEMA_VERSION) {
    return EMPTY_STATE;
  }
  return {
    requirement: parsed.requirement ?? null,
    analysis: parsed.analysis ?? null,
    testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
    testData: Array.isArray(parsed.testData) ? parsed.testData : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    automationArtifacts: Array.isArray(parsed.automationArtifacts)
      ? parsed.automationArtifacts
      : [],
    qualityReport: migrateQualityReport(parsed.qualityReport),
  };
}

// ---------------------------------------------------------------------------
// External store (module-level). The provider and all subscribers read this.
// ---------------------------------------------------------------------------

let current: WorkflowState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: WorkflowState) {
  current = next;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...next })
    );
  } catch {
    // Ignore storage write failures.
  }
  emit();
}

function updateState(
  updater: (prev: WorkflowState) => WorkflowState
): WorkflowState {
  const next = updater(current);
  setState(next);
  return next;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): WorkflowState {
  return current;
}

function getServerSnapshot(): WorkflowState {
  return EMPTY_STATE;
}

function hydrateFromStorage() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      current = sanitizeStored(raw);
      emit();
    }
  } catch {
    // Ignore storage read failures.
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function WorkflowProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage exactly once on the client (after hydration).
  useSyncExternalStore(subscribe, () => {
    hydrateFromStorage();
    return getSnapshot();
  }, getServerSnapshot);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setRequirement = useCallback((requirement: Requirement | null) => {
    updateState((prev) => ({ ...prev, requirement }));
  }, []);
  const setAnalysis = useCallback((analysis: RequirementAnalysis | null) => {
    updateState((prev) => ({ ...prev, analysis }));
  }, []);
  const setTestCases = useCallback((testCases: TestCase[]) => {
    updateState((prev) => ({ ...prev, testCases }));
  }, []);
  const setTestData = useCallback((testData: TestData[]) => {
    updateState((prev) => ({ ...prev, testData }));
  }, []);
  const setReviews = useCallback(
    (updater: SetStateAction<WorkflowState["reviews"]>) => {
      updateState((prev) => ({
        ...prev,
        reviews:
          typeof updater === "function"
            ? (updater as (prev: WorkflowState["reviews"]) => WorkflowState["reviews"])(prev.reviews)
            : updater,
      }));
    },
    []
  );
  const setAutomationArtifacts = useCallback((automationArtifacts: AutomationArtifact[]) => {
    updateState((prev) => ({ ...prev, automationArtifacts }));
  }, []);
  const setQualityReport = useCallback((qualityReport: QualityReport | null) => {
    updateState((prev) => ({ ...prev, qualityReport }));
  }, []);

  const updateTestCase = useCallback((id: string, patch: Partial<TestCase>) => {
    updateState((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) =>
        tc.id === id ? { ...tc, ...patch } : tc
      ),
    }));
  }, []);

  const updateTestDataField = useCallback(
    (testDataId: string, fieldIndex: number, value: string) => {
      updateState((prev) => ({
        ...prev,
        testData: prev.testData.map((td) =>
          td.id === testDataId
            ? {
                ...td,
                fields: td.fields.map((f, i) =>
                  i === fieldIndex ? { ...f, value } : f
                ),
              }
            : td
        ),
      }));
    },
    []
  );

  const resetWorkflow = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      state,
      setRequirement,
      setAnalysis,
      setTestCases,
      setTestData,
      setReviews,
      setAutomationArtifacts,
      setQualityReport,
      updateTestCase,
      updateTestDataField,
      resetWorkflow,
    }),
    [
      state,
      setRequirement,
      setAnalysis,
      setTestCases,
      setTestData,
      setReviews,
      setAutomationArtifacts,
      setQualityReport,
      updateTestCase,
      updateTestDataField,
      resetWorkflow,
    ]
  );

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return ctx;
}

export type { ReviewStatus };
