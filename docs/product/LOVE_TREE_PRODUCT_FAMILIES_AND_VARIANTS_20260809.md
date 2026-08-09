# LoveTree Product Families, Design Lineages, Variants & Experience Capabilities

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
   - Auth, API, DB, Tree, Moment, Relation, Community and privacy/visibility remain shared product truth.

`/v2` and `/v3` remain reachable as historical comparison routes, but they are **not** additional product families.

## 2. Root gateway

The root route `/` is the Product Gateway with three review paths:

- Legacy LoveTree
- Next LoveTree
- Design Lab

`/gateway` is an explicit alias for the same gateway.

## 3. Next architecture: Product → Lineage/Revision → Variant → Capability

Next LoveTree separates four concepts that were previously easy to confuse.

### Product Core

The one shared functional product: Auth, API, DB, Tree, Moment, Relation, Community, privacy/visibility and canonical routes.

### Design Lineage / Revision

A numbered or otherwise coherent design track is a **Lineage**. Iterative V1/V2/V3/V4 files inside that track are **Revisions**.

Example:

`LoveTree 48 Neon Pilot -> 01 V1 -> 02 V2 -> ... -> 10 Final Gate`

These revisions are not V1/V2/V3/V4 LoveTree products. They are preserved attempts inside one design thesis.

Lineage registry: `lib/design-lineages.ts`.

### Scenario Variant

A Variant is a candidate surface/experience for one LoveTree product job, such as Onboarding, Graph or Archive.

Variant question: **which candidate surface should the final product use?**

### Experience Capability

A Capability is a reusable interaction/visual mechanism that one or more Variants may consume, even when the mechanism was discovered in another sibling project.

Capability question: **which reusable mechanism is worth adopting across surfaces?**

A Capability may be adopted even when the source visual Variant is not selected. Selecting a Variant does not automatically adopt every experimental mechanic in its source.

## 4. Why the Lineage layer is necessary

Sibling design work is iterative. One design direction may contain many revisions, fallback candidates, approved storyboards, executable HTMLs and rejected attempts.

Without Lineages, those revisions look like separate product versions and the review space becomes misleading.

Lineage rules:

- new visual polish or correction -> new Revision inside the current Lineage;
- fallback/baseline/rejected attempts remain preserved inside the Lineage;
- create a new Lineage only for a genuinely separate design thesis, benchmark lineage, product job or interaction direction;
- a Lineage never creates a third LoveTree product family;
- Lineage lifecycle: `incoming / active / hold / closed`;
- Revision decisions: `baseline / candidate / approved-plan / rejected / reference`.

The initial evidence snapshot includes numbered LoveTree design tracks 48-52.

## 5. Design Lab rule

Every new design artifact is classified as one or more of:

- existing/new Design Lineage;
- Revision inside that Lineage;
- `Scenario -> Variant`;
- Experience Capability evidence/contribution;
- reference-only benchmark;
- superseded/history.

Do **not** create a new V5/V6/V7 whole LoveTree product merely because more files arrive.

Current scenarios:

- Historical Baselines
- Entry / Onboarding
- Tree Workspace / Lifecycle
- Graph / Timeline / Retrospective
- People / Archive
- Community
- Milestones / 300+ Growth
- Cinematic / Brand

The existing `V4_SOURCE_MANIFEST` is the source inventory authority for LoveTree HTML sources already ported into the repository. Design Lab derives those implementation candidates from that manifest automatically; it does not depend on a hardcoded source count.

Cross-project capabilities are registered separately with provenance in `lib/experience-capabilities.ts`.

## 6. Variant kinds and lifecycle

A Variant does not have to be a full screen.

- `screen`: independently rendered screen candidate
- `mechanic`: behavior embedded into another screen
- `experience`: immersive archive/milestone/cinematic experience
- `historical`: preserved technical baseline such as V2/V3

Variant lifecycle:

`received -> mapped -> implemented -> validated -> shortlisted -> selected`

A candidate that is no longer active becomes `superseded`; it is retained for traceability rather than deleted.

## 7. Capability lifecycle

Use:

`observed -> mapped -> prototype-requested -> prototyped -> validated -> adopted`

Use `rejected` for a researched mechanism that remains visible as history but should not enter the product.

Initial capability evidence is documented in `CROSS_PROJECT_EXPERIENCE_CAPABILITY_LIBRARY.md`.

## 8. Selection policy

Do not choose the final Next composition before the candidate set is adequately implemented and reviewable.

Selection is per Scenario, not per whole-product clone. A final composition may choose, for example:

- Onboarding: Variant B
- Workspace: Variant A
- Graph: Nebula
- Archive: Motion + Accordion
- Milestone: Aurora

The composition can additionally adopt shared Capabilities such as spatial orbit, cinematic convergence or physical-object navigation without cloning the original source product.

A baseline/fallback revision may remain preserved even if another revision is later selected.

## 9. Testing model

### Shared Product Core

Run once against:

- Auth
- Tree CRUD
- Moment CRUD
- relations
- privacy/visibility
- Community
- API/DB contracts

### Per-Lineage / Revision

Check that:

- revisions stay attached to the correct Lineage;
- baseline/candidate/rejected state is explicit;
- earlier baseline/approved files are not overwritten;
- a cosmetic revision does not create another product family.

### Per-Variant

Validate only behavior the Variant owns:

- renderability
- primary interactions
- responsive behavior
- overflow/modal lifecycle
- animation/reduced-motion expectations where applicable
- shared-data compatibility

### Per-Capability

Validate the reusable mechanic independently:

- input/data adapter contract
- desktop/mobile interaction
- fallback behavior
- accessibility/reduced-motion
- browser/performance risk where relevant

### Final composition

After user/sibling selection, run the complete desktop/mobile journey only against the final or near-final composition.

Do not test the Cartesian product of every Revision × Variant × Capability.

## 10. Future sibling design intake

When a new design arrives:

1. Preserve the original source asset unchanged.
2. Record source project/folder/file and observed behavior.
3. Attach it to an existing Lineage or justify a genuinely new Lineage.
4. Record its Revision state if it is an iteration of that Lineage.
5. Decide whether it is a Variant, a Capability contribution, both, reference-only, or history.
6. For LoveTree HTML implementation candidates, update the source manifest with source file, route, role and preservation contract when the port begins.
7. Assign existing Scenario(s) whenever possible.
8. If it contributes a reusable mechanic, update the Capability registry with data needs, integration rule, risk and provenance.
9. Implement against shared Core contracts rather than forking Auth/API/DB.
10. Expose the result in Design Lab and validate independently.
11. Shortlist/select only during later joint review.

Use `DESIGN_VARIANT_AND_CAPABILITY_INTAKE_TEMPLATE.md` for handoffs; despite the historical filename, the template now includes Lineage/Revision classification.

## 11. Design Lab usability

Design Lab is an internal review surface, not another public product.

It provides:

- Lineage cards with revision history and current decisions;
- searchable/filterable Scenario Variants;
- searchable/filterable Experience Capabilities by source project and LoveTree scenario;
- direct links to implemented candidate routes;
- provenance and validation-risk visibility.

This allows the candidate pool to grow without turning the UI into one unstructured list.

## 12. Parallel model roles

### Drive-connected web model

Best for:

- broad sibling Drive audit
- source comparison
- Lineage/Revision classification
- reusable mechanic extraction
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

## 13. Deployment model

Deployment automation remains tracked separately in #75.

Desired eventual state:

`merge main -> automated validation -> guarded Cloudflare build/deploy -> production smoke -> rollback path`

The repository currently has PR validation and guarded Production deployment scripts. Production trigger configuration is separate from Design Lab architecture and final design selection.

## 14. Non-goals of this architecture phase

- no deletion of V2/V3 candidate history
- no final design selection
- no destructive DB migration
- no Production Worker mutation
- no Production Firebase mutation
- no duplication of Auth/API/DB per visual candidate
- no wholesale copying of unrelated sibling products into LoveTree
- no treating a Lineage revision label as a new LoveTree product generation
