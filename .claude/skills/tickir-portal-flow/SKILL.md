---
name: tickir-portal-flow
description: Use this skill whenever working on the borrower-facing /portal/[token]/... routes in tickir-underwriter, including document upload, status display, or anything using validate-token.ts or stage-utils.ts. These routes use token-based auth, NOT NextAuth sessions, and have their own validation/status logic separate from the banker-facing app. Trigger this any time the user mentions "portal", "borrower upload", "token link", "borrower-facing", or asks to add/modify anything under src/app/portal/.
---

# Tickir Portal Flow (Borrower-Facing)

## Critical distinction

Routes under `/portal/[token]/...` are a **separate, unauthenticated (no-login) flow** for borrowers. They do NOT use NextAuth sessions. Do not apply the tickir-api-route pattern (NextAuth session check, `session.user.bankId` scoping) to portal routes — it's the wrong auth model and will break the flow or, worse, silently no-op.

## What portal routes use instead

1. **Token-based access**: the `[token]` segment is the access credential. Validate it via `validate-token.ts` — this is the equivalent of the session check, but it's a token lookup against the deal/portal-link record, not a user session.
2. **Token validation must happen first**, same priority as the session check in normal routes: invalid/expired/used token → appropriate error response/page before any data access.
3. **Status/stage display logic**: borrower-facing status (e.g. "documents received," "under review") is derived via `stage-utils.ts`, which likely maps internal deal stages (DOCUMENT_COLLECTION, SPREADING, etc. — see tickir-deal-stage-transition) to borrower-appropriate language. Don't expose internal stage names or banker-only stages (e.g. CREDIT_COMMITTEE specifics) directly to borrowers — use the mapping.

## Scoping in portal routes

Even though there's no `session.user.bankId`, portal routes still must only access data belonging to the deal associated with the validated token — never broaden a query beyond that single deal's records based on convenience.

## Common mistakes to avoid

- Copying the tickir-api-route pattern (NextAuth session, `bankId` scoping) into a portal route — wrong auth model entirely.
- Forgetting token validation, or validating it but not checking expiry/single-use semantics if those exist (check `validate-token.ts` for what it actually enforces).
- Exposing raw internal deal-stage values or banker-only data (notes, internal flags, lending decision details) to the borrower-facing UI.
- Writing new borrower-facing status strings inline instead of going through `stage-utils.ts`.

## Before making changes

Read `validate-token.ts` and `stage-utils.ts` to confirm current token semantics and stage-mapping before adding new portal routes or status displays.
