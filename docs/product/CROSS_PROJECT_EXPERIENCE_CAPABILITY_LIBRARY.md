# Cross-project Experience Capability Library

Date: 2026-08-09
Issues: #77, #78, #79, #81-#84
Parent architecture: #74
Implementation PR: #76

## Why this exists

Sibling UI work is continuously produced across LoveTree and other product folders. Treating every new design as another complete LoveTree generation would create duplicated product shells, duplicated testing and an impossible final-selection matrix.

LoveTree therefore uses three layers:

1. **Product Core** — Auth, API, DB, Tree, Moment, Relation, Community, privacy/visibility.
2. **Experience Capabilities** — reusable interaction and visual mechanics.
3. **Scenario Variants** — candidate screens/experiences that consume the shared Core and selected Capabilities.

A Variant answers **which candidate surface should we choose?**
A Capability answers **which reusable mechanism should multiple surfaces share?**

## Initial capability set

The first registry snapshot is grounded in Drive artifacts reviewed on 2026-08-09.

### 1. Cosmic Orbit / Spatial 3D

Source: LoveTree 52 `V2_COSMIC_LOVETREE_CORE_POC` / `lovetree-52-v2-cosmic-core-poc.html`.

Observed source behavior:

- WebGL canvas
- drag/swipe orbit
- wheel/dolly camera movement
- Moment seed nodes
- connection-growth events
- particle/star field
- glass/emissive material language

LoveTree use: Graph, Replay, 100/300+ Milestone, Cinematic.

### 2. Cinematic Scene Transition

Source: 이어온 `03_회사기억추적_v1_시네마틱통합시연.html`.

Observed source behavior:

- perspective stage
- active/leaving scene lifecycle
- opacity/scale/depth/blur transition
- progress navigation

LoveTree use: Onboarding, Story/Replay, Milestones, Cinematic.

### 3. Memory Fragment Convergence

Source: same 이어온 cinematic demo.

Observed source behavior:

- scattered information fragments
- gather state
- fragments converge around a central axis
- axis reveal after convergence

LoveTree use: replace decorative floating cards with a meaningful `Moment fragments -> Relation structure` event.

### 4. Relationship Spatial Map

Source: 사실로 `01_사실로_시민사건원장_고소인중심_v1_GATE3.html`.

Observed source behavior:

- typed spatial cards
- visual connecting lines
- relationship overview before detail

LoveTree use: map Person, Moment, date, media and relations without importing legal/case semantics.

### 5. Memory Evolution / Version History

Source: same 사실로 Gate3 work.

Observed source behavior:

- original record remains visible
- later information is accumulated rather than silently replacing history
- status/version labels
- timeline presentation

LoveTree use: optional future Moment annotation/evolution layer. This is **not** authority to rewrite the current backend into event sourcing. Backend expansion requires separate evidence and review.

### 6. Physical Book / Object Navigation

Source: 또다른우주 CSS3D bookshelf, book-object motion, WebGL reading and final bookshelf-reading candidate lineage.

Observed research direction:

- shelf/spine-like browsing
- selectable physical object metaphor
- depth/open/return transitions

LoveTree use: Person, Season and Archive navigation.

### 7. Spatial Archive Exploration

Source: 아스테리브 shelf-document exploration, physical reading and integrated exploration candidates.

Observed research direction:

- spatial hierarchy
- document/object focus
- integrated exploration surface

LoveTree use: Person -> Season -> Moment archive navigation while preserving orientation.

### 8. Long-form Chapter / Milestone Navigation

Source: Guided Reader work for Iliad, Odyssey, Aeneid and Divine Comedy.

Observed source behavior:

- large chapter indexes
- completed versus pending state
- deep-linkable units
- long-running progress surface

LoveTree use: 100/300+ Moments, Seasons and large archives. Literary content is unrelated and must not be copied.

## Extraction rules

1. Do not copy an unrelated product wholesale into LoveTree.
2. Record the source artifact and only behavior actually observed.
3. Separate source fact from inference/recommendation.
4. Extract a mechanism with a clear data contract.
5. Map each Capability to one or more existing LoveTree Scenarios.
6. Create a new Scenario only when a genuinely new product job exists.
7. Preserve original Drive artifacts unchanged.
8. Store provenance labels in the repository, not personal Drive URLs or secrets.
9. A Capability may be adopted even if its source visual Variant is not selected.
10. Selecting a Variant does not automatically adopt every experimental Capability in its source.

## Capability lifecycle

Use:

`observed -> mapped -> prototype-requested -> prototyped -> validated -> adopted`

`rejected` means the mechanism is retained as research history but excluded from the product.

A Capability should not advance to adoption until:

- source behavior is inspectable;
- LoveTree data needs are defined;
- desktop/mobile interaction is understood;
- accessibility/reduced-motion behavior is defined where relevant;
- performance/browser risks are known;
- the mechanism improves a real LoveTree product job rather than merely adding spectacle.

## Parallel work model

### Drive-connected web GPT — #78

Use for broad Drive audit, source comparison and pattern extraction. It does not need local filesystem access.

Expected output per finding:

- source project/folder/file
- observed behavior
- signature motion/visual grammar
- data needs
- mobile evidence
- accessibility concerns
- applicable LoveTree Scenario(s)
- Variant / Capability / both classification
- cost/risk
- observe / prototype / adopt / reject recommendation

### Local/browser model — #79

Use only when local/browser execution adds value:

- Chromium desktop/mobile
- WebGL/fallback
- touch gestures
- performance/memory
- orientation/resize
- reduced motion
- focus/keyboard lifecycle

Local execution is not required for Drive research.

## Testing policy

Do not build a Cartesian product of every Variant and every Capability.

- validate shared Product Core once;
- validate each Capability independently;
- validate each Variant for behavior it owns;
- validate shortlisted compositions selectively;
- run full desktop/mobile E2E only on final or near-final compositions.

This is the operating model for ongoing sibling design intake.