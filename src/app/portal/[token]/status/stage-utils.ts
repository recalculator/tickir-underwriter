import type { DealStage } from "@prisma/client";

export type StepState = "completed" | "current" | "upcoming";

export type Step = {
  number: number;
  label: string;
  description: string;
};

export const STEPS: Step[] = [
  { number: 1, label: "Documents Submitted", description: "Upload your required documents" },
  { number: 2, label: "Under Review", description: "Your banker is reviewing your application" },
  { number: 3, label: "Credit Analysis", description: "Our credit team is analyzing your financials" },
  { number: 4, label: "Decision", description: "Credit committee review" },
  { number: 5, label: "Complete", description: "Loan decision made" },
];

// Map each stage to the step number it corresponds to (1-based)
const STAGE_TO_STEP: Record<DealStage, number> = {
  DOCUMENT_COLLECTION: 1,
  SPREADING: 2,
  CREDIT_REVIEW: 3,
  CREDIT_COMMITTEE: 4,
  CLOSED: 5,
  DECLINED: 5,
};

export function getStepState(
  stepNumber: number,
  currentStage: DealStage,
  allDocsValidated: boolean
): StepState {
  const currentStep = STAGE_TO_STEP[currentStage];

  // Special case: step 1 is completed if all docs are validated OR we've moved past it
  if (stepNumber === 1) {
    if (allDocsValidated || currentStep > 1) return "completed";
    return "current";
  }

  if (stepNumber < currentStep) return "completed";
  if (stepNumber === currentStep) return "current";
  return "upcoming";
}

export type CompletionLabel = { text: string; color: string } | null;

export function getCompletionLabel(stage: DealStage): CompletionLabel {
  if (stage === "CLOSED") return { text: "Approved", color: "text-green-600" };
  if (stage === "DECLINED") return { text: "Decision Made", color: "text-gray-500" };
  return null;
}

const BORROWER_ACTIVITY_MAP: Record<string, string> = {
  DEAL_CREATED: "Application started",
  DOCUMENT_UPLOADED: "Document received",
  DOCUMENT_VALIDATED: "Document verified ✓",
  DOCUMENT_REJECTED: "Document needs attention",
  ALL_DOCS_COLLECTED: "All documents received",
  STAGE_ADVANCED: "Application moved to next stage",
  SPREAD_LOCKED: "Financial review complete",
};

export function translateActivityType(actionType: string): string | null {
  return BORROWER_ACTIVITY_MAP[actionType] ?? null;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}
