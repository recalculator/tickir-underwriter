/**
 * Shared helpers for the AI-assisted underwriting pipeline (spreading,
 * consistency checks, lending advisory, credit memo drafting). Every step
 * degrades to a manual-entry fallback when ANTHROPIC_API_KEY isn't set, and
 * this module keeps that detection and messaging consistent across them.
 */

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const AI_DISABLED_REASON =
  "AI assistance is unavailable — no ANTHROPIC_API_KEY is configured for this bank.";

export function aiDisabledMessage(action: string): string {
  return `${AI_DISABLED_REASON} ${action}`;
}
