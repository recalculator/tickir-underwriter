---
name: tickir-marketplace-underwriter-handoff
description: Use this skill whenever working on either tickir-marketplace or tickir-underwriter in a way that touches the eventual cross-repo integration point, specifically a marketplace "deal accepted" event creating or linking to an Underwriter deal. This documents the planned interface/contract between the two repos so neither side is built in a way that makes future integration painful. Trigger this when the user mentions "handoff", "integration between repos", "marketplace to underwriter", "deal accepted", or makes changes to the marketplace Deal model or the underwriter deal-creation/intake logic.
---

# Tickir Marketplace to Underwriter Handoff (Planned Contract)

## Status: not yet implemented — this is a forward-compatibility guide

The two repos are currently independent (separate databases, separate Prisma schemas). The integration point is: when a borrower selects a lender in the marketplace and a "Deal" is created there, this should eventually result in a corresponding deal/intake record in tickir-underwriter, scoped to that bank.

## Design principles to follow now, even before integration is built

1. **Don't couple the schemas directly.** The marketplace `Deal` model and the underwriter deal model are separate and will likely remain separate tables/databases. The handoff should be event/API-based (e.g. marketplace calls an underwriter intake endpoint, or both write to a shared minimal record), not a shared foreign key across databases.

2. **Identify the minimal handoff payload.** Whatever fields the underwriter needs to bootstrap a new deal (borrower business info, loan type/amount/purpose from the original request, selected bank, any documents/notes already exchanged) should be things the marketplace `Deal` model can actually produce. When changing the marketplace Deal model, consider: "would this field be useful/necessary for the underwriter intake?" — don't remove or restructure fields that are likely part of this future contract without noting it.

3. **Underwriter intake should map to DOCUMENT_COLLECTION.** A deal arriving from the marketplace handoff should enter the underwriter pipeline (see tickir-deal-stage-transition) at the DOCUMENT_COLLECTION stage — the marketplace side doesn't produce documents/spreads, just the initial request + lender match.

4. **Bank scoping must hold across the boundary.** Whatever bank account/identity is used in the marketplace to represent "Bank X" must map cleanly to the `bankId` used for scoping in the underwriter (per tickir-api-route). If these identifiers don't currently correspond 1:1, that's a gap to flag, not silently work around.

## When this skill applies right now

Since integration isn't built yet, this skill mostly means: when modifying either repo's deal-related models or intake logic, briefly consider whether the change makes the eventual handoff easier or harder, and flag (don't necessarily fix) anything that would make it harder — e.g. removing a field from marketplace `Deal` that would have been useful context for underwriter intake, or building underwriter intake assumptions that only make sense for manually-created deals and wouldn't accept a marketplace-originated payload.

## Common mistakes to avoid

- Building underwriter deal-creation as "always manual, banker fills in everything" in a way that has no path for programmatic/API-based creation later.
- Removing fields from the marketplace Deal model that represent information the underwriter side would need, without noting the loss.
- Assuming bank identity representations match across repos without checking.
