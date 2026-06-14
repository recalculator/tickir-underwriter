---
name: tickir-deal-stage-transition
description: Use this skill whenever building or modifying any feature in tickir-underwriter that reads or changes a deal's stage/status. Encodes the deal pipeline state machine (DOCUMENT_COLLECTION to SPREADING to CREDIT_REVIEW to CREDIT_COMMITTEE to CLOSED/DECLINED), required ActivityLog and Notification side effects on transitions, and how the stage badge/UI reflects state. Trigger this any time the user mentions "deal stage", "deal status", "pipeline", "stage transition", "ActivityLog", "Notification", or asks to add a feature that should "move the deal forward" or "unlock the next step".
---

# Tickir Deal Stage Transitions

## The pipeline

```
DOCUMENT_COLLECTION -> SPREADING -> CREDIT_REVIEW -> CREDIT_COMMITTEE -> CLOSED / DECLINED
```

DECLINED can be reached from any stage (a deal can be declined at any point). CLOSED is reached only from CREDIT_COMMITTEE.

## Rules for any feature touching deal.stage

1. **Identify which stage the feature belongs to** before writing code. If a feature is meant to be available "once documents are validated," that's a CREDIT_REVIEW-adjacent gate on DOCUMENT_COLLECTION → SPREADING, not a freestanding check.
2. **Check prerequisites before transitioning.** A transition function should verify the deal is currently in the expected prior stage (and that any required sub-conditions are met — e.g., spread locked before CREDIT_REVIEW) before writing the new stage. Don't let a route silently set `stage: 'SPREADING'` without confirming the deal was in `DOCUMENT_COLLECTION` and docs are validated.
3. **Every stage transition writes an ActivityLog entry.** Include: deal id, from-stage, to-stage, actor (user who triggered it, or "system" for automated transitions), timestamp. If you add a new transition path, add its ActivityLog entry — don't assume it's logged elsewhere.
4. **Every stage transition that requires action from a specific role creates a Notification.** E.g., moving to CREDIT_REVIEW notifies the credit reviewer; moving to CREDIT_COMMITTEE notifies committee members. If a new transition introduces a new "someone needs to do something next" moment, it needs a Notification, not just an ActivityLog entry.
5. **Stage badge/UI**: the stage badge color/label mapping is centralized — find and reuse the existing mapping rather than hardcoding a new color/label for a stage in a new component. If you introduce a new stage value (rare — confirm with the user first), update the central mapping, don't create a local one.

## Common mistakes to avoid

- Allowing a transition to skip a stage (e.g. DOCUMENT_COLLECTION straight to CREDIT_REVIEW) without an explicit reason and without checking SPREADING's prerequisites were actually satisfied some other way.
- Writing ActivityLog but forgetting Notification (or vice versa) on transitions that need both.
- Hardcoding stage strings as raw literals scattered across files — use the existing enum/constant.
- Allowing DECLINED to require a specific prior stage — it should be reachable from any active stage.
