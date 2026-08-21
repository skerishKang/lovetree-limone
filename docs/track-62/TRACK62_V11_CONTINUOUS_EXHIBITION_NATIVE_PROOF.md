# Track 62 V1.1 — Continuous Exhibition Rail Native Capability Proof (bounded report)

Status: **DRAFT candidate — capability proof only.** Not a Lineage 62 allocation,
not canonical V4 adoption, not a product-owner review artifact.

- Issue: #159 ([Track 62 Intake] Continuous Circular Rail exhibition)
- Refs: #141, #201
- Route: `/design-lab/capabilities/continuous-exhibition-rail`
- Intake manifest: `design-intake/manifests/track-62-v11-continuous-exhibition-native-proof.json`
  (`REFERENCE_CAPABILITY_ONLY` / `EXECUTABLE_AVAILABLE` / `dom-2d`; route is
  the capability surface; the classification itself fails closed without any
  lineage identity)

## Scope

Proves the Track 62 V1.1 continuous circular rail as a **native Design Lab
capability** on current `main`:

- `CAPABILITY_PROOF = YES`
- `LINEAGE_62_ALLOCATION = NO`
- `CANONICAL_PRODUCT = NO`
- `lib/design-lineages.ts` untouched; no Lineage62 registration.

Isolated files only:

```text
app/design-lab/capabilities/continuous-exhibition-rail/page.tsx
app/design-lab/capabilities/continuous-exhibition-rail/ContinuousExhibitionRailExperience.tsx
app/design-lab/capabilities/continuous-exhibition-rail/track62-continuous-exhibition-rail.css
lib/track-62-v11/controller.ts
lib/track-62-v11/data.ts
lib/track-62-v11/dialog.ts
tests/track-62-v11-controller.test.mjs
tests/track-62-v11-moments.test.mjs
tests/track-62-v11-dialog.test.mjs
tests/track-62-v11-intake.test.mjs
qa/track62-v11-continuous-exhibition-qa.mjs
qa/evidence/track62-v11/**
.github/workflows/track62-v11-continuous-exhibition-qa.yml
docs/track-62/TRACK62_V11_CONTINUOUS_EXHIBITION_NATIVE_PROOF.md
```

`package.json` and shared runtime primitives (`lib/design-runtime/**`, Design
Fidelity registry) are intentionally NOT modified: no new npm scripts were
needed, and no shared extraction is performed without a second consumer.

## ContinuousPhaseController (local, narrow, pure core)

`lib/track-62-v11/controller.ts` is renderer-neutral, React-neutral,
DOM-neutral and LoveTree-domain-neutral. Timer-free: consumers drive frames.

Contract proven by focused pure tests across **3 / 7 / 11 scenes**:

- one authoritative fractional `phase` / `target` / `velocity` state;
- wheel delta → fractional target accumulation on the same phase;
- pointer drag and touch drag accumulate the same phase after an explicit
  movement-threshold edge ("armed" → "dragging", exactly once);
- reverse input takes effect immediately (no input lock);
- damping/inertia settle toward fling target or nearest scene;
- idle detection then nearest-scene snap (never an instant jump);
- direct node selection travels through the controller with real intermediate
  fractional states (travel, not teleport);
- `pointercancel` / `lostpointercapture` = cleanup only: no selection, no
  viewer open, no target commit;
- overlay open/close is a pure no-op on the transport — **phase preservation**
  (the V1.1 `phase = 3.25 → panel open → close → phase still 3.25` evidence);
- bounds clamping at both ends for every scene count.

Projection contract used by scenes, rail nodes and terrain parallax alike:

```text
sceneX = (sceneIndex - phase) * spacing
```

Reduced motion (`prefers-reduced-motion: reduce`) only changes settle speed
(fast settle, no long inertia); wheel/drag/keyboard/selection semantics are
identical, and nothing is disabled.

The discrete antipattern was explicitly rejected: no `selectedIndex++` /
`translateX(index * 100vw)` model exists anywhere in the proof.

## Single Moment authority

`exhibitionModel(moments, momentId)` derives rail / sculpture / viewer (VIEW,
SCULPTURES, MEMORY FILMS, JOURNAL) / MY TREE summary from one `momentId`.
There is no parallel per-surface selection state; `selectedMoment` is never
duplicated. V1.1 loop preserved: sculpture → viewer → WHY NEXT → SAVE →
tabs → phase preserved → MY TREE internal summary.

## Source HOLDs closed natively

| HOLD | Native resolution |
| --- | --- |
| DIALOG_ACCESSIBILITY | viewer/menu/mytree dialogs: `role=dialog` + `aria-modal`, deterministic focus entry, Tab/Shift+Tab containment, background `inert`, Escape + explicit close, trigger focus restore with re-open-safe fallback (pure `planFocusRestore` proven; P/Q/R/S/T verified in Chromium) |
| MOBILE_320_390_COPY_READABILITY | mobile composition: active title / note / WHY NEXT / CTA in a fixed upper-left copy band; sculpture band lowered and scaled; bounding-box overlap = 0 verified at 390×844 and 320×720 |
| MY_TREE_NATIVE_HANDOFF | stays **HOLD**: internal exhibition-path summary panel only; zero `/v4`, `/my-tree` or `/trees/` links; no fake native route |
| PRODUCTION_MEDIA_AUTHORITY | stays **NOT PROVEN**: DEMO_PREVIEW / MEDIA_REFERENCE_ONLY states only; SAVE is localStorage prototype state, clearly marked |

Source assets: the six byte-unique RGBA human sculptures remain
`SOURCE_REFERENCE_ONLY` (no repository transport authority). The proof renders
neutral generated DEMO fixtures and never claims source EXACT bytes. Pinned
source identity (20,728,647 bytes,
`bc5484a1c545165feb57cd76cae49c8f1e7bb0b3f4a0e11fa9bc4e739a6987e8`) is
recorded in the manifest and footer — fingerprinting only, never embedding the
20.7MB standalone HTML.

## Evidence

- Focused pure tests: 59 cases (`tests/track-62-v11-*.test.mjs`, node:test;
  deliberately Playwright-free so the A-track fail-closed browser inventory
  stays exactly 8 entries).
- Real Chromium QA: `qa/track62-v11-continuous-exhibition-qa.mjs`, 46 checks,
  desktop 1280×800 / mobile 390×844 / narrow 320×720 / reduced-motion;
  covers route load, overflow 0, console/page errors 0, fractional wheel,
  idle snap, immediate reverse, actual pointer drag, touch-equivalent drag,
  pointercancel/lostcapture safety, same-controller node travel, phase
  preservation, one Moment across surfaces, full dialog focus lifecycle,
  mobile readability, keyboard navigation, visible focus, truth boundaries.
- Local evidence set: `qa/evidence/track62-v11/` (4 viewport screenshots +
  viewer-open screenshot + `qa-results.json`); CI re-generates the full set as
  workflow artifact `track62-v11-continuous-exhibition-qa-evidence`.
- Validation on the working head: lint (0 errors), typecheck, build,
  design:intake:validate (all 11 manifests), db:check — all clean.

## Remaining boundaries (unchanged by this proof)

`REPOSITORY_LINEAGE_62_RESERVATION = HOLD`,
`CANONICAL_V4_ADOPTION = HOLD`,
`PRODUCT_OWNER_APPROVAL = PENDING`,
`SHARED_RUNTIME_EXTRACTION = NOT_PERFORMED` (single consumer).
Web CTO owns Ready/Merge/canonical decisions; this PR stays Draft.
