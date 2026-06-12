/**
 * Pipeline lib functions (spreading, lendingDecision, creditMemo) throw plain
 * Errors for both "prerequisite not met" cases and unexpected failures.
 * Prerequisite-not-met messages all describe a state conflict, so map them to
 * 409 rather than the generic 500 used for unexpected errors.
 */
const BUSINESS_RULE_ERROR_PATTERNS = [
  "already locked",
  "must be validated",
  "before generating",
  "before recording",
  "before drafting",
  "is required before",
];

export function errorStatus(err: unknown): number {
  if (err instanceof Error && BUSINESS_RULE_ERROR_PATTERNS.some((p) => err.message.includes(p))) {
    return 409;
  }
  return 500;
}
