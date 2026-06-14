---
name: tickir-ai-extraction-task
description: Use this skill whenever building any new AI-assisted feature in tickir-underwriter that calls Claude (e.g. risk factor summaries, covenant flagging, additional document analysis), or when modifying the existing spreading, consistency-check, or lending-decision features. Encodes the shared pattern, build context from Prisma, check ANTHROPIC_API_KEY, call anthropic.messages.create with CLAUDE_MODEL, parse JSON from the response, handle the no-key fallback, store results with confidence/flag fields. Trigger this for any "new AI feature", "call Claude for X", "extract/analyze with AI", or "add a confidence score" request.
---

# Tickir AI Extraction Task Pattern

This is the shared shape used by spreading, consistency-check, and lending-decision. Any new AI-assisted feature should follow it rather than inventing new plumbing.

## The pattern

1. **Build context from Prisma.** Gather whatever deal/document/financial data the AI needs into a structured object. Look at how spreading/consistency-check/lendingDecision build their context objects and follow the same shape conventions (field naming, what's included vs omitted) for consistency.

2. **Check ANTHROPIC_API_KEY before calling out.** If not set, follow the no-key fallback path — see tickir-ai-fallback-handling skill for the exact required behavior (structured status, UI messaging, manual fallback). Don't write a new ad hoc fallback.

3. **Call `anthropic.messages.create` using `CLAUDE_MODEL`** (the env-configured model constant) — never hardcode a model string. Match the existing call structure (system prompt style, max_tokens, etc.) used by the other extraction features.

4. **Parse JSON out of the response.** The model is prompted to return structured JSON; parse it defensively — wrap in try/catch, and if parsing fails, treat it as an AI error (not a no-key case) per the fallback skill's distinction between "no key" and "call/parse failed."

5. **Store results with confidence/flag fields.** Persist the extracted data alongside:
   - a confidence score/level (however the existing features represent this — check the schema for the actual field names/types rather than assuming)
   - flag fields for anything the AI marked as uncertain, inconsistent, or needing banker review

6. **Banker review is mandatory.** AI output from this pattern is always advisory — never auto-apply extracted values to a deal's official record without the banker reviewing/confirming. If the new feature produces a recommendation or value, it should land in a "pending review" state, same as spreading results do before lock.

## Before building a new AI feature

Read the existing implementation of whichever of spreading.ts / consistency-check.ts / lendingDecision.ts is most similar to what you're building, and mirror its structure (context-building, prompt construction, parsing, storage) rather than designing from scratch. If the new feature's output should feed into a later pipeline stage (e.g. a new risk-flag feature feeding the credit memo), check tickir-deal-stage-transition and tickir-underwriter-pipeline for how cross-stage data flow is handled.

## Common mistakes to avoid

- Hardcoding a model name instead of using `CLAUDE_MODEL`.
- Treating "no API key" and "API call failed" as the same error case.
- Storing AI output as if it were banker-confirmed data (skipping the review/lock step).
- Building a new context-gathering function from scratch when an existing one already assembles most of what's needed.
