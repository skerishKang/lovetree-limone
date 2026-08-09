# LoveTree Product Families & Design Variant Operating Model

Date: 2026-08-09
Issue: #74

## 1. Product model

LoveTree is managed as **two product families only**.

1. **Legacy LoveTree**
   - Route: `/legacy`
   - Purpose: preserve the first implemented product as a stable comparison baseline.
   - The previous `/` implementation is preserved byte-for-byte as the Legacy page body.

2. **Next LoveTree**
   - Route: `/v4`
   - Purpose: build the next product by connecting sibling-supplied UI/UX candidates to the shared functional core.
   - Shared core means Auth, API, DB, Tree, Moment, Community, visibility/privacy and canonical product routes are not duplicated for every visual candidate.

`/v2` and `/v3` remain reachable as historical comparison routes, but they are **not** additional product families.

## 2. Root gateway

The root route `/` is the Product Gateway.

It provides three review paths:

- Legacy LoveTree
- Next LoveTree
- Design Lab

`/gateway` is an explicit alias for the same gateway so the entry point can always be linked directly.

## 3. Design Lab rule

Sibling designs are not promoted to V5/V6/V7 complete products merely because more files arrive.

Every new design is registered under:

`Scenario -> Variant`

Current scenarios:

- Historical Baselines
- Entry / Onboarding
- Tree Workspace / Lifecycle
- Graph / Timeline / Retrospective
- People / Archive
- Community
- Milestones / 300+ Growth
- Cinematic / Brand

The existing `V4_SOURCE_MANIFEST` is the source inventory authority for sibling HTML sources. Design Lab derives candidates from that manifest automatically, so future source additions do not require maintaining a second parallel list.

## 4. Candidate kinds

A Variant does not have to be a full screen.

- `screen`: an independently rendered screen candidate
- `mechanic`: a behavior that may be embedded into another screen (for example draggable notes)
- `experience`: an immersive archive/milestone/cinematic experience
- `historical`: a preserved technical baseline such as V2/V3

This prevents a mechanic source and a full visual surface from being misclassified as two competing complete products.

## 5. Candidate lifecycle

Use the following review lifecycle:

`received -> mapped -> implemented -> validated -> shortlisted -> selected`

A candidate that is no longer active becomes `superseded`; it is preserved for traceability rather than deleted.

This lifecycle aligns with the design-asset operating folders:

- `00_기준문서`: rules, manifests, selection criteria
- `10_채택본`: selected/adopted designs
- `20_진행중_후보`: received through shortlisted candidates
- `90_미채택_보관`: superseded candidates retained for comparison/history

## 6. Selection policy

Do not choose the final Next LoveTree combination before the candidate set is adequately implemented and reviewable.

Selection is per scenario, not per whole-product clone. A final combination may therefore choose, for example:

- Onboarding: Variant B
- Workspace: Variant A
- Graph: Nebula
- Archive: Motion + Accordion
- Milestone: Aurora

Only the selected cross-scenario combination needs full end-to-end journey validation as a final release candidate.

## 7. Testing model

### Shared functional tests

Run once against the common product core:

- Auth
- Tree CRUD
- Moment CRUD
- relations
- privacy/visibility
- Community
- API/DB contracts

### Per-Variant tests

Each candidate must prove only the behavior it owns:

- renderability
- primary interactions
- responsive behavior
- overflow/modal lifecycle
- animation/reduced-motion expectations where applicable
- compatibility with the shared data contract

### Final combination

After sibling/user selection, run the complete desktop/mobile journey only against the selected final combination.

This avoids combinatorial testing of every possible cross-scenario combination.

## 8. Future sibling design intake

When a new design arrives:

1. Preserve the original source asset.
2. Add it to the source manifest with source file, route, role and preservation contract.
3. Assign it to one existing Scenario whenever possible.
4. Register it as a Variant; do not create a new product-generation number.
5. Implement it against shared data/function contracts.
6. Expose it in Design Lab.
7. Validate it independently.
8. Shortlist/select only during the later joint review.

Create a new Scenario only if the design represents a genuinely new product job, not merely a new visual treatment.

## 9. Deployment model

Deployment automation is tracked separately in #75.

Desired final state:

`merge main -> automated validation -> guarded Cloudflare build/deploy -> production smoke -> rollback path`

The repository currently has a PR validation workflow and guarded production deployment scripts. Enabling a new automatic Production trigger is intentionally separate from the Design Lab architecture and final design selection.

## 10. Non-goals of this architecture phase

- no deletion of V2/V3 candidate history
- no final design selection
- no destructive DB migration
- no Production Worker mutation
- no duplication of Auth/API/DB per visual candidate
