# LoveTree Product Families, Variants & Experience Capabilities

Date: 2026-08-09
Issues: #74, #77

## 1. Product model

LoveTree is managed as **two product families only**.

1. **Legacy LoveTree**
   - Route: `/legacy`
   - Purpose: preserve the first implemented product as a stable comparison baseline.
   - The previous `/` implementation is preserved as the Legacy page body.

2. **Next LoveTree**
   - Route: `/v4`
   - Purpose: build the next product by connecting sibling-supplied UI/UX candidates to the shared functional core.
   - Shared core means Auth, API, DB, Tree, Moment, Relation, Community and privacy/visibility are not duplicated for every visual candidate.

`/v2` and `/v3` remain reachable as historical comparison routes, but they are **not** additional product families.

## 2. Root gateway

The root route `/` is the Product Gateway.

It provides three review paths:

- Legacy LoveTree
- Next LoveTree
- Design Lab

`/gateway` is an explicit alias for the same gateway.

## 3. Three-layer Next architecture

Next LoveTree is organized as:

1. **Product Core** — shared product truth and behavior.
2. **Experience Capabilities** — reusable interaction/visual mechanics that may originate in LoveTree or another sibling project.
3. **Scenario Variants** — candidate screens/experiences that consume the common Core and selected Capabilities.

This separates two decisions:

- **Variant selection:** which candidate surface should the final product use?
- **Capability adoption:** which reusable mechanism is valuable across one or more surfaces?

A Capability can be adopted even if its source Variant is not selected. Selecting a Variant does not automatically adopt every experimental mechanic present in its source.

## 4. Design Lab rule

Sibling designs are not promoted to V5/V6/V7 complete products merely because more files arrive.

Every new design is classified as one or more of:

- `Scenario -> Variant`
- Experience Capability evidence/contribution
- reference-only benchmark
- superseded/history

Current scenarios:

- Historical Baselines
- Entry / Onboarding
- Tree Workspace / Lifecycle
- Graph / Timeline / Retrospective
- People / Archive
- Community
- Milestones / 300+ Growth
- Cinematic / Brand

The existing `V4_SOURCE_MANIFEST` is the source inventory authority for sibling LoveTree HTML sources. Design Lab derives LoveTree candidates from that manifest automatically.

Cross-project capabilities are registered separately with provenance in `lib/experience-capabilities.ts`.

## 5. Candidate kinds

A Variant does not have to be a full screen.

- `screen`: independently rendered screen candidate
- `mechanic`: behavior embedded into another screen
- `experience`: immersive archive/milestone/cinematic experience
- `historical`: preserved technical baseline such as V2/V3

This prevents a mechanic source and a full visual surface from being misclassified as two competing complete products.

## 6. Variant lifecycle

Use:

`received -> mapped -> implemented -> validated -> shortlisted -> selected`

A candidate that is no longer active becomes `superseded`; it is retained for traceability rather than deleted.

## 7. Capability lifecycle

Use:

`observed -> mapped -> prototype-requested -> prototyped -> validated -> adopted`

Use `rejected` for a researched mechanism that should remain visible as history but should not enter the product.

Initial capability evidence is documented in `CROSS_PROJECT_EXPERIENCE_CAPABILITY_LIBRARY.md`.

## 8. Selection policy

Do not choose the final Next LoveTree combination before the candidate set is adequately implemented and reviewable.

Selection is per Scenario, not per whole-product clone. A final composition may choose, for example:

- Onboarding: Variant B
- Workspace: Variant A
- Graph: Nebula
- Archive: Motion + Accordion
- Milestone: Aurora

The composition can additionally adopt shared Capabilities such as spatial orbit, cinematic convergence or physical-object navigation without cloning the original source product.

Only the selected or near-final composition needs full end-to-end journey validation.

## 9. Testing model

### Shared functional tests

Run once against the common Product Core:

- Auth
- Tree CRUD
- Moment CRUD
- relations
- privacy/visibility
- Community
- API/DB contracts

### Per-Variant tests

Each candidate proves only the behavior it owns:

- renderability
- primary interactions
- responsive behavior
- overflow/modal lifecycle
- animation/reduced-motion expectations where applicable
- shared-data compatibility

### Per-Capability tests

Validate the reusable mechanic independently:

- input/data adapter contract
- desktop/mobile interaction
- fallback behavior
- accessibility/reduced-motion
- browser/performance risk where relevant

### Final composition

After user/sibling selection, run the complete desktop/mobile journey only against the final or near-final composition.

Do not test the Cartesian product of every Variant and every Capability.

## 10. Future sibling design intake

When a new design arrives:

1. Preserve the original source asset unchanged.
2. Record source project/folder/file and observed behavior.
3. Decide whether the item is a Variant, a Capability contribution, both, reference-only, or history.
4. For LoveTree HTML variants, update the source manifest with source file, route, role and preservation contract.
5. Assign existing Scenario(s) whenever possible.
6. If it contributes a reusable mechanic, update the Capability registry with data needs, integration rule, risk and provenance.
7. Implement against shared Core contracts rather than forking Auth/API/DB.
8. Expose the result in Design Lab.
9. Validate independently.
10. Shortlist/select only during later joint review.

Create a new Scenario only if the design represents a genuinely new product job, not merely a new visual treatment.

Use `DESIGN_VARIANT_AND_CAPABILITY_INTAKE_TEMPLATE.md` for future handoffs.

## 11. Parallel model roles

### Drive-connected web model

Best for:

- broad sibling Drive audit
- source comparison
- extracting reusable mechanics
- evidence/provenance cataloging

Tracked in #78.

### Local/browser model

Use only when local execution materially helps:

- Chromium desktop/mobile validation
- WebGL performance/fallback
- touch gestures
- focus/keyboard lifecycle
- resize/orientation

Tracked in #79.

Local access is not required for Drive research.

## 12. Deployment model

Deployment automation is tracked separately in #75.

Desired final state:

`merge main -> automated validation -> guarded Cloudflare build/deploy -> production smoke -> rollback path`

The repository currently has PR validation and guarded Production deployment scripts. Production trigger configuration is separate from Design Lab architecture and final design selection.

## 13. Non-goals of this architecture phase

- no deletion of V2/V3 candidate history
- no final design selection
- no destructive DB migration
- no Production Worker mutation
- no Production Firebase mutation
- no duplication of Auth/API/DB per visual candidate
- no wholesale copying of unrelated sibling products into LoveTree
