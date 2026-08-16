"use client";

// Single source of truth for the whole pipeline. Client-only state that
// survives navigation within the browser session (no database, no Redux).

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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

const EMPTY_STATE: WorkflowState = {
  requirement: null,
  analysis: null,
  testCases: [],
  testData: [],
  reviews: [],
  automationArtifacts: [],
  qualityReport: null,
};

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkflowState>(EMPTY_STATE);

  const setRequirement = useCallback((requirement: Requirement | null) => {
    setState((prev) => ({ ...prev, requirement }));
  }, []);
  const setAnalysis = useCallback((analysis: RequirementAnalysis | null) => {
    setState((prev) => ({ ...prev, analysis }));
  }, []);
  const setTestCases = useCallback((testCases: TestCase[]) => {
    setState((prev) => ({ ...prev, testCases }));
  }, []);
  const setTestData = useCallback((testData: TestData[]) => {
    setState((prev) => ({ ...prev, testData }));
  }, []);
  const setReviews = useCallback(
    (updater: SetStateAction<WorkflowState["reviews"]>) => {
      setState((prev) => ({
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
    setState((prev) => ({ ...prev, automationArtifacts }));
  }, []);
  const setQualityReport = useCallback((qualityReport: QualityReport | null) => {
    setState((prev) => ({ ...prev, qualityReport }));
  }, []);

  const updateTestCase = useCallback((id: string, patch: Partial<TestCase>) => {
    setState((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) =>
        tc.id === id ? { ...tc, ...patch } : tc
      ),
    }));
  }, []);

  const updateTestDataField = useCallback(
    (testDataId: string, fieldIndex: number, value: string) => {
      setState((prev) => ({
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
