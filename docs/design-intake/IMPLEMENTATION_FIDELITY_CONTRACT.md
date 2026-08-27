# LoveTree Source-Faithful Implementation Contract

Authority: Issue #537

Status: P0 current operating contract for design-source implementation semantics.

This document corrects a systemic ambiguity between **source role/adoption** and **implementation fidelity**. It does not rewrite historical Issues/PRs. Historical records remain evidence; this contract controls current interpretation and future work.

## 1. Core definition

When the product owner explicitly requests **IMPLEMENT / PORT / RECREATE / 원본대로 구현** for an authoritative executable design source, that source is the **normative UI/UX specification**.

Implementation means:

```text
authoritative source UI/UX
        ↓ faithful runtime/framework translation
native visual/interaction surface
        ↓ canonical data/API/Auth binding
canonical product surface
        ↓ matched visual + interaction verification
PRODUCT_FIDELITY_PASS
```

The implementation must preserve, to the extent observable in the authoritative source:

- composition and spatial hierarchy;
- layout, dimensions, spacing and responsive intent;
- typography, colors and surface treatment;
- glass/blur/refraction/shadow/glow/depth/z-order effects;
- media staging and object placement;
- animation timing, sequencing and transition identity;
- click/tap/hover/pointer behavior;
- drag/swipe/wheel/zoom/pan behavior;
- selection/deselection and inspector/viewer behavior;
- branch/path/WHY NEXT/replay/cinema behavior where present;
- action outcomes and navigation consequences.

Canonical product data may replace demo fixtures. Existing Auth/API/DB/schema authority remains controlling unless a separate backend change is explicitly authorized.

## 2. What IMPLEMENT is not

The following do **not** by themselves satisfy an IMPLEMENT/PORT request:

- extracting only a visual language;
- extracting only presentation grammar;
- visual donor integration;
- function donor integration;
- preserving only interaction mechanics;
- creating a thematically similar canonical surface;
- routing to an existing product page;
- merging a native Design Lab candidate;
- CI GREEN;
- Design Fidelity orchestration GREEN;
- screenshot existence without source comparison;
- canonical route wiring or Moment continuity alone.

Explicit identities:

```text
PRODUCT_DONOR_INTEGRATED != IMPLEMENTED
CANONICAL_EXISTING_SURFACE != IMPLEMENTED
NATIVE_PROVING_COMPLETE != PRODUCT_FIDELITY_PASS
CANONICAL_ROUTE_INTEGRATED != PRODUCT_FIDELITY_PASS
CI_GREEN != VISUAL_FIDELITY_PASS
INTERACTION_CONTRACT_PASS != VISUAL_FIDELITY_PASS
```

## 3. Source-role axis and implementation axis are separate

A source's **role/disposition** may be one of:

- `REFERENCE`
- `VISUAL_DONOR`
- `FUNCTION_DONOR`
- `ADOPTED_PRODUCT_VISUAL`
- `ADOPTED_PRODUCT_FUNCTION`
- `HOLD`

This is independent of implementation progress.

For an authoritative source selected for faithful implementation, use these implementation states:

1. `SOURCE_PINNED`
2. `NATIVE_PORT_COMPLETE`
3. `VISUAL_FIDELITY_PASS`
4. `INTERACTION_FIDELITY_PASS`
5. `CANONICAL_DATA_BOUND`
6. `CANONICAL_ROUTE_INTEGRATED`
7. `PRODUCT_FIDELITY_PASS`
8. `PRODUCTION_READY`

`IMPLEMENTED = YES` is allowed only after `PRODUCT_FIDELITY_PASS` when the task was an explicit faithful implementation/port request.

## 4. Explicit ADAPT / DONOR mode

Bounded reinterpretation is allowed only when the owner/task explicitly requests terms such as:

- DONOR
- ADAPT
- INSPIRED
- GRAMMAR
- CAPABILITY EXTRACTION
- MECHANICS EXTRACTION

In that mode, the source remains provenance/reference evidence and the product may intentionally diverge. Such work must be reported as `PRODUCT_DONOR_ONLY` or another donor/adaptation state, never as a faithful implementation of the source.

If task language is ambiguous but an authoritative executable source exists and the user says "구현", default to **faithful-port mode**, not donor mode.

## 5. Default integration architecture

For faithful source implementation, prefer:

```text
NATIVE VISUAL SURFACE
+ CANONICAL DATA ADAPTER
+ PRODUCT NAVIGATION SHELL
```

Do not independently redraw or simplify the canonical surface when a verified source-faithful native component already exists, unless an explicit technical blocker is documented and the replacement is re-verified against the source.

Canonical data substitution may include:

- demo Moment → canonical Moment;
- demo parent/edge → canonical parentId/Connection;
- demo media → canonical sourceType/sourceUrl/thumbnail;
- hardcoded tree identifier → canonical treeId;
- local/source navigation → canonical Next route;
- in-memory demo selection → canonical selected Moment URL/state.

Data adaptation must not become visual redesign by default.

## 6. Required visual fidelity evidence

For each faithful-port target, capture the authoritative source, native implementation, and canonical product at matched state and viewport.

Minimum viewports:

- `1280x800`
- `390x844`
- `320x720`

Required evidence for meaningful states:

- source screenshot;
- native screenshot;
- canonical screenshot;
- side-by-side source/native and source/canonical;
- overlay or image-diff artifact;
- explicit reviewer verdict.

Compare at minimum:

- page composition;
- background/theme;
- typography;
- card/node/object dimensions;
- spacing and alignment;
- media crop/staging;
- effects (glass, blur, shadow, glow, refraction);
- depth/perspective/z-order;
- major controls and labels;
- selected/expanded/modal/viewer states;
- mobile composition.

Screenshot creation alone is not a PASS. A reviewer must explicitly classify visible differences as acceptable fidelity repair, intentional canonical-data substitution, or a blocking redesign/divergence.

## 7. Required interaction fidelity evidence

Build a source → native → canonical outcome matrix for every meaningful interaction present in the source.

Check, where applicable:

- click/tap;
- repeat click/deselect;
- hover/pointer movement;
- drag/swipe;
- wheel/zoom/pan;
- keyboard selection/navigation;
- focus behavior;
- modal/viewer open/close;
- Escape;
- Back/Forward;
- branch/path choice;
- WHY NEXT;
- replay/cinema/media controls;
- cross-view navigation;
- reduced motion;
- touch parity.

`INTERACTION_FIDELITY_PASS` means equivalent meaningful actions reach the equivalent intended result/state, except where canonical data identity replaces demo identity.

## 8. Design Fidelity naming rule

A target registered only as an `interaction-contract` is not automatically source-visual-fidelity certified.

Current central Design Fidelity orchestration may prove route health, overflow, runtime errors, screenshots and browser-gate behavior. Such GREEN must be reported precisely as interaction/runtime evidence unless an authoritative-source comparison is part of the target.

Do not report:

```text
DESIGN_FIDELITY_PASS
```

as synonymous with source visual parity unless the source/native/product comparison evidence actually exists.

Preferred explicit labels:

- `RUNTIME_INTERACTION_GATE_PASS`
- `SOURCE_NATIVE_VISUAL_FIDELITY_PASS`
- `SOURCE_CANONICAL_VISUAL_FIDELITY_PASS`
- `SOURCE_CANONICAL_INTERACTION_FIDELITY_PASS`
- `PRODUCT_FIDELITY_PASS`

## 9. Historical Issue/PR interpretation

Historical Issues/PRs are not rewritten. Their factual provenance, hashes, routes, branch states and CI results remain valid.

However, current reporting must not elevate historical wording beyond what the evidence supports.

Examples:

- a PR explicitly described as `VISUAL_DONOR` remains donor work;
- a merged Design Lab native candidate remains native proving unless canonical fidelity was also verified;
- a canonical integration PR may prove route/data continuity without proving source UI parity;
- a Design Fidelity GREEN interaction contract remains interaction/runtime proof unless matched source comparison was reviewed.

Issue #537 owns the current semantic correction.

## 10. 108-result / normalized-family re-audit classes

Until the corpus is re-audited, do not describe the 108-result set as faithfully implemented.

Use at least these current-state classes:

- `EXACT_PRODUCT_PORT_VERIFIED`
- `NATIVE_PORT_ONLY_PRODUCT_NOT_VERIFIED`
- `PRODUCT_DONOR_ONLY`
- `CANONICAL_REINTERPRETED`
- `CANONICAL_EXISTING_NOT_SOURCE_IMPLEMENTATION`
- `SOURCE_PINNED_ONLY`
- `HOLD`
- `UNKNOWN_REQUIRES_AUDIT`

For every family record separately:

- authoritative source path/fingerprint;
- source role/disposition;
- native route/component;
- canonical route/component;
- canonical directly reuses native: YES/NO;
- source↔native visual review state;
- source↔canonical visual review state;
- source↔canonical interaction review state;
- exact product-fidelity verdict;
- supporting Issue/PR/evidence.

## 11. Five-Source calibration set

Before broad 108/88 certification, calibrate this contract against:

- Source56 Vertical Moment Relationship Network;
- Source57 Living Glass Moment Card;
- Source58 Living Memory Pinboard Cinematic;
- Source60 3D Moment Cluster Deep Explorer;
- Source64 Floating Moment Welcome Orbit Portal.

No member of the calibration set may be called `PRODUCT_FIDELITY_PASS` until matched browser evidence is complete.

## 12. Repair constraints

Fidelity repair must not silently introduce:

- new DB/schema;
- new product backend authority;
- new Auth authority;
- fabricated source semantics;
- demo fixtures as durable product truth;
- source-original mutation.

When canonical data lacks a demo/source field, preserve the source visual/interaction structure using truthful canonical content or explicitly mark the unsupported semantic as omitted/held. Do not redesign the whole surface merely to remove a demo value.

## 13. Completion reporting

Every future source implementation report must state independently:

```text
SOURCE_AUTHORITY =
SOURCE_ROLE =
NATIVE_PORT =
SOURCE_NATIVE_VISUAL_FIDELITY =
SOURCE_NATIVE_INTERACTION_FIDELITY =
CANONICAL_DATA_BOUND =
CANONICAL_ROUTE_INTEGRATED =
SOURCE_CANONICAL_VISUAL_FIDELITY =
SOURCE_CANONICAL_INTERACTION_FIDELITY =
PRODUCT_FIDELITY =
PRODUCTION_READY =
```

Unknown evidence must remain `UNKNOWN` or `HOLD`; never infer completion from a neighboring state.
