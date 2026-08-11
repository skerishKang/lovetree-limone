# Lineage 58 — VideoFigure Atelier V2

Issue: #145

## Source authority

- Lineage: `58 / VideoFigure Atelier`
- Primary scenario: `people-archive`
- Classification: `REVISION`
- Recommendation: `PARTIAL IMPLEMENT`
- Internal candidate route: `/design-lab/lineages/58/v2`
- Canonical `/v4` adoption: **not approved**

### V1 baseline

- Drive folder: `1Z7yZmFMGaIWwaK0msBBQNtmXWMUDh9uh`
- Runtime: `lovetree-video-figure-atelier-v1.html`
- Drive file: `1eqNaaDsEKSFLIKCddee4rNGyGW6y5v15`
- Bytes: `30,604`
- SHA256: `cbb981c2796944b2c8988949ae9bc2249480fe2cd566616ee702cd5363c85953`

### V2 current Revision

- Drive folder: `1pmg0xuLEaYafMnhfM9ZJyQUc0qAqkXlr`
- Runtime: `lovetree-video-figure-atelier-v2.html`
- Drive file: `1iC6IyJBy86UhIANts6nDm414WnBUU66p`
- Bytes: `27,918`
- SHA256: `ac30f2abfc88e99e1ce7829f270c4cc76a5eae93b5f1b1e3a56dac1654c5b466`

The authoritative HTML remains in Drive. This repository records its exact fingerprint and implements a native Design Lab candidate; it does not rewrite the Drive original.

## Product/domain boundary

`Person → Moment → DerivedFigure / Look → ordered angle assets → source provenance`

A Figure is not a Person record. The Design Lab fixture uses projection-only data and does not create DB/API/Auth schema.

## Source runtime contract

- A–J = 10 Figure/Look sets.
- Ordered angles: `000 / 045 / 090 / 135 / 180 / 225 / 270 / 315`.
- Total runtime frames: 80 PNG.
- Autoplay traverses all eight ordered angles before progressing to the next Look.
- Manual drag, direct angle control, direct Look selection or modal interaction takes authority immediately.
- Resume policy in this candidate: `resume-after-idle` after the manual interaction lifecycle completes.
- Look selection atomically changes selected Figure, accent, background/light/ring treatment and provenance metadata.
- The figure viewport uses `object-fit: contain` + stable bottom/center anchoring because natural source dimensions vary.
- Verified natural dimensions across the exact source set are `378×506`, `412×464`, and `412×465`.

## Shared runtime evidence (#141)

Rendering tier: `Tier A / sprite-frame 2.5D`.

Implemented or locally proven as extractable boundaries:

- P1 Interaction Authority / Gesture Arbiter — pointer threshold, pointer capture after horizontal intent, `pointercancel`, `lostpointercapture`, mobile `pan-y` priority.
- P2 Ordered Frame / Turntable — `lib/videofigure-turntable.ts` pure reducer.
- P3 Guided Transport — autoplay/manual takeover + explicit resume policy.
- P4 Canonical Selection — one turntable state owns Look + angle; cards/hero/provenance project from it.
- P5 Responsive archive/detail — desktop right rail becomes flow content on narrow screens; provenance remains visible.
- P7 Motion/Accessibility — reduced motion disables automatic 360 and continuous decorative motion.
- P8 Exact Asset Gate — 80-entry Drive fingerprint registry + hard-fail local binary verifier.
- P9 Fidelity Harness evidence — route exposes source fingerprints, transfer gate state and source-delta boundaries for browser review.

Do not create a Capsule-specific turntable engine. Memory Capsule and VideoFigure should converge on a future narrow shared `OrderedFrameTurntable`/interaction authority boundary after two consumers are proven.

## Exact binary transfer state

Marker: `EXACT_VIDEOFIGURE_ASSET_TRANSFER_HOLD`

The web worker cannot create byte-exact binary Git files through the available UTF-8 GitHub contents writer. It therefore does not add generated substitutes.

Registry state in this branch:

- 80/80 runtime filenames registered.
- 80/80 Drive IDs registered.
- 80/80 Drive byte sizes registered.
- 80/80 authoritative dimensions registered from downloaded Drive source binaries.
- 80/80 authoritative SHA256 registered from downloaded Drive source binaries.
- byte-size mismatch during source verification: 0/80.
- the four previously pinned fingerprints (`A_000`, `A_090`, `F_000`, `J_315`) reproduced exactly.
- Git binary transfer: **0/80** by this worker.
- exact product/source-fidelity gate: **HOLD** until the binaries exist at the repository target paths and the verifier passes.

Target directory for the local worker:

`public/design-lab/lineages/58/videofigure/frames/`

Run:

`node scripts/verify-lineage-58-videofigure-assets.mjs`

The verifier has two separate responsibilities: the fingerprint registry must be 80/80 complete, and the local repository must contain all 80 exact binaries matching bytes, dimensions, and SHA256. The current web PR satisfies the first condition only. No source-fidelity visual PASS before the second condition is green.

## Fake extraction boundary

The following source labels are simulation only:

- `SCENE CUT`
- `FACE LOCK`
- `OUTFIT LOCK`
- `8-VIEW BUILD`
- `100 MOMENTS FOUND`

The Design Lab modal identifies them as `SOURCE DEMO / NON-PERSISTENT / SIMULATED`. Selecting a local file does not upload, process or persist it. No media-processing backend and no fake completion result are introduced.

The source runtime contains no real `<video>` playback. This candidate therefore does not add a duplicate video player or a fake sound subsystem. `VIEW SOURCE MOMENT` remains an adapter/deep-link contract placeholder.

## Rights boundary

Concrete A–J human imagery is `design-fixture-only` until commercial rights/publicity/copyright provenance is separately approved. No celebrity identity inference is part of this implementation. Benchmark video/creature assets and turnaround generation sheets are not runtime assets.

## Template platform evidence (#142)

### Candidate template family

`figure-memory-viewer`

### USER_BINDABLE

- Person/Subject
- source Moment
- source media/time provenance
- ordered Figure frames
- note/title

### USER_CONFIGURABLE

- autoplay preference, subject to product/reduced-motion policy
- validated archive/filter options

### TEMPLATE_LOCKED

- complete ordered-angle grammar
- selected Figure/Look/provenance synchronization
- manual takeover semantics
- source traceability

### PRODUCT_POLICY

- persistence/save semantics
- rights eligibility
- whether derived Figure generation exists
- whether a media-processing pipeline exists

### SOURCE_REFERENCE_ONLY

- benchmark assets
- turnaround generation sheets
- fake extraction progress/counts
- unverified concrete human identities

## Data-variance QA before template promotion

A source-faithful Design Lab page is not yet a reusable template. Before promotion, test at minimum:

- 1, 3 and 10 Look collections within the supported contract
- short/long Korean and English Person/Look names
- short/long notes and missing optional note
- square, tall and wide source-frame canvases normalized into the canonical viewport
- mixed source dimensions across angles without figure jump
- slow decode, one missing angle and corrupted PNG fail-closed states
- different provenance label lengths and time ranges
- saved filter with 0, 1 and all items saved
- autoplay on/off, manual takeover and reduced motion
- 1280×800, 390×844 and 320×720
- horizontal overflow = 0
- keyboard-only angle/look navigation
- touch horizontal drag versus vertical page scrolling
- modal focus trap/Escape/focus return
- rights-ineligible fixture state
