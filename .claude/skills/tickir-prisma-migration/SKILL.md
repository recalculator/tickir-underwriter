---
name: tickir-prisma-migration
description: Use this skill whenever making any change to schema.prisma in either Tickir repo, or whenever a request implies a data model change (new field, new table/model, relation change, enum change). Ensures the full set of side effects is handled, migration, seed file updates, src/types/index.ts updates, and @@index checks for bank-scoped queries. Trigger this for "add a field", "new table/model", "change the schema", "add an enum value", or any request that would require `prisma migrate` to run.
---

# Tickir Prisma Migration Checklist

Any schema.prisma change is not done until all of these are checked, not just the schema edit itself.

## Checklist

1. **Edit schema.prisma.** Make the model/field/enum/relation change.

2. **Run the migration.** Generate and apply a migration (`prisma migrate dev` or the project's equivalent script) — don't leave the schema edited without a corresponding migration file, and don't hand-edit migration SQL unless the user explicitly asks for a custom migration.

3. **Update `src/types/index.ts`.** If this file defines or re-exports types derived from Prisma models (check whether it imports `Prisma` namespace types or hand-maintains parallel interfaces), update it to match. If types are hand-maintained, this is the step most likely to be forgotten and cause silent type drift — check it explicitly even for "small" field additions.

4. **Update seed files** if the change affects required fields (new non-nullable field with no default needs a value in seed data) or if seed data should demonstrate the new field/model for development.

5. **Check `@@index` for bank-scoped queries.** If the new/changed field is something that will be filtered on in bank-scoped queries (per tickir-api-route — most deal/document/borrower-related queries filter by `bankId`), consider whether a composite index involving `bankId` is needed for query performance. Don't add indexes speculatively for fields that won't be queried, but do flag the consideration for the user if it's ambiguous.

6. **Check downstream consumers.** If the changed model is used in spreading/consistency-check/lendingDecision/creditMemo context-building (tickir-ai-extraction-task), or in stage-transition logic (tickir-deal-stage-transition), confirm those still work with the new shape — a new required field especially can break context assembly if it's not populated yet on existing rows.

## Common mistakes to avoid

- Editing schema.prisma and stopping there without running a migration.
- Adding a non-nullable field without a default and without updating seed data — breaks existing dev databases.
- Leaving src/types/index.ts out of sync, causing TypeScript errors (or worse, silent `any`s) elsewhere.
- Adding indexes to every new field "just in case" — only add where there's an actual bank-scoped or otherwise hot query path.
