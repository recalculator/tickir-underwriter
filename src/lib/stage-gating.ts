import type { DealStageType } from "@/types";

export type StageGateInputs = {
  stage: DealStageType;
  allRequiredDocsValidated: boolean;
  hasLockedSpread: boolean;
  hasAdvisory: boolean;
  hasMemo: boolean;
  memoFinalized: boolean;
};

/**
 * Returns a human-readable reason the deal cannot advance to its next stage,
 * or null if the prerequisites for the current stage are met.
 */
export function getStageBlockReason(inputs: StageGateInputs): string | null {
  switch (inputs.stage) {
    case "DOCUMENT_COLLECTION":
      if (!inputs.allRequiredDocsValidated) {
        return "All required documents must be validated before advancing to Spreading.";
      }
      return null;
    case "SPREADING":
      if (!inputs.hasLockedSpread) {
        return "The spread must be locked before advancing to Credit Review.";
      }
      return null;
    case "CREDIT_REVIEW":
      if (!inputs.hasAdvisory) {
        return "Generate the AI lending advisory before advancing to Credit Committee.";
      }
      if (!inputs.hasMemo) {
        return "Draft the credit memo before advancing to Credit Committee.";
      }
      return null;
    case "CREDIT_COMMITTEE":
      if (!inputs.memoFinalized) {
        return "The credit memo must be finalized before closing the deal.";
      }
      return null;
    default:
      return null;
  }
}
