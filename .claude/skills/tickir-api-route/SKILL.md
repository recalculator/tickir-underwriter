---
name: tickir-api-route
description: Use this skill whenever adding, modifying, or reviewing an API route in the tickir-underwriter repo (anything under src/app/api/). Encodes the standard route pattern of this codebase, NextAuth session check, bank-scoped Prisma query, Zod input validation, and a consistent error response shape, modeled on src/app/api/deals/[id]/route.ts. Trigger this any time the user asks to create a new endpoint, add a method to an existing route, or asks why an endpoint isn't returning the right data/errors.
---

# Tickir API Route Pattern

## The standard shape

Every route handler in src/app/api/ follows this order. Don't skip or reorder steps.

1. **Session check (NextAuth)**: Get the session at the top of the handler. If no session / no user, return 401 immediately. Don't proceed to any data access first.
2. **Bank scoping**: Every query that touches deal/borrower/document data must be scoped to the authenticated user's bank (e.g. `where: { bankId: session.user.bankId, ... }`). Never query by id alone without this scope — a user from Bank A must not be able to fetch Bank B's records by guessing an id.
3. **Input validation (Zod)**: Parse request body/params/query through a Zod schema before using any field. If validation fails, return a 400 with the validation error details in the standard error shape (see below). Don't hand-check fields with if-statements.
4. **Business logic**: Prisma calls, stage-transition logic (see tickir-deal-stage-transition skill if this route touches deal.stage), AI calls (see tickir-ai-extraction-task skill if this route triggers spreading/decision/memo).
5. **Consistent responses**:
   - Success: return the data directly or `{ data: ... }` — match whatever the reference route (`src/app/api/deals/[id]/route.ts`) does; don't invent a new envelope shape for new routes.
   - Errors: match the existing error shape from the reference route exactly (status code + body structure). If you're unsure what that shape is, read the reference route first rather than guessing.

## Reference implementation

Before writing a new route, read `src/app/api/deals/[id]/route.ts` to confirm the current session-check, bank-scoping, Zod, and error-shape conventions — this skill describes the pattern, but the actual file is the source of truth if they ever diverge.

## Common mistakes to avoid

- Querying by `id` without a `bankId` (or equivalent) filter — this is a cross-tenant data leak.
- Returning raw Zod errors or raw Prisma errors to the client instead of the standard error shape.
- Doing validation after starting database writes.
- Forgetting the session check on a new HTTP method added to an existing route file (each exported handler — GET, POST, PATCH, etc. — needs its own check, it's not inherited).
