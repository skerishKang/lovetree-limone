# CLEAN-108 Auto Harness Architecture

- Status: **M1 accepted / Stage-1 production architecture**
- Standing issue: **#611**
- Parent CLEAN program: **#589**
- Governing fidelity process: **#564**
- M1 acceptance / Stage-1 release: **#611 comment 5546112083**
- Maturity: M2 implemented/proven to current bounded scope; M3/Stage-1 released; **M4/Stage-2 NOT released**

## 1. Architectural goal

The harness should turn a large collection of executable single-HTML Source/Codex authorities into a repeatable mechanical preservation pipeline while keeping human/model judgment only where the runtime cannot be safely inferred.

Target architecture:

```text
AUTHORITY
   |
   v
AUTO ANALYZER
   |
   v
STATE RECIPE CANDIDATES
   |
   v
APPROVED S2 BASELINE PLAN
   |
   v
BASELINE CAPTURE
   |
   v
MECHANICAL SPLITTER
   |
   v
ORIGINAL / SPLIT REPLAY
   |
   v
PARITY COMPARATOR
   |
   v
EVIDENCE CLASSIFIER
   |
   +--> HIGH_CONFIDENCE -> CENTRAL quick visual review
   |
   +--> DIFF/ERROR/UNKNOWN -> CENTRAL deep review
```

The architecture is Source-preserving. It is not a frontend framework migration system.

## 1a. Merged module map (current main)

The conceptual components below are implemented by the following merged modules on
current main. Every named module exists on main at the time of writing.

```text
Authority inspection/analysis:
src/08_harness/analyze-source-authority.mjs
src/08_harness/auto-analyzer/analyze-html.mjs

State recipe schema / validation:
src/08_harness/state-recipe.schema.json
src/08_harness/auto-analyzer/validate-state-recipe.mjs
src/08_harness/state-replay/validate-executable-state-recipe.mjs

Executable recipe engine (bounded declarative actions):
src/08_harness/state-replay/execute-state-recipe.mjs

Recipe matrix expansion (viewport x state expansion):
src/08_harness/state-replay/expand-recipe-matrix.mjs

Approved-recipe capture adapter (evidence, no filesystem writes):
src/08_harness/state-replay/capture-approved-state-recipe.mjs

Matched comparison + evidence normalization:
src/08_harness/state-replay/compare-matched-state-replay.mjs
src/08_harness/state-replay/matched-evidence-normalization.mjs

Thin real-browser matched-pair runner (SIMPLE family, SRC056-released):
src/08_harness/state-replay/replay-approved-state-pair.mjs

Per-family merged proof runners:
src/08_harness/prove-src056-approved-recipe-parity.mjs
src/08_harness/prove-src060-approved-recipe-parity.mjs
src/08_harness/prove-src068-dual-variant-replay.mjs
src/08_harness/prove-src047-media-viewer-replay.mjs
src/08_harness/prove-src062-large-inline-replay.mjs (supplementary, merged PR #627)

Source-specific replay plugins (DUAL_VARIANT / MEDIA_VIEWER / LARGE_INLINE families):
src/08_harness/state-replay/replay-approved-dual-variant-pair.mjs
src/08_harness/state-replay/replay-approved-src047-media-viewer-pair.mjs
src/08_harness/state-replay/replay-approved-src062-large-inline-pair.mjs

Mechanical splitter / capsule validators:
src/08_harness/materialize-mechanical-split.mjs
src/08_harness/validate-mechanical-split.mjs
src/08_harness/dual-variant-mechanical.mjs
src/08_harness/source-capsule-validator.mjs
src/08_harness/validate-layout.mjs
src/08_harness/generation-phase-guard.mjs

Recipe fixtures (state recipes are DATA only):
src/08_harness/fixtures/state-recipes/SRC056/overview.json
src/08_harness/fixtures/state-recipes/SRC056/origin-reveal.json
src/08_harness/fixtures/state-recipes/SRC060/approved-complex-matrix.json
tests/fixtures/clean108-src056-replay-recipes.json
```

Exact-head CI that binds browser evidence to the PR head SHA (never a synthetic merge
ref) is enforced by the merged workflows:

```text
.github/workflows/src-108-harness-gate.yml
.github/workflows/clean108-src068-dual-variant-replay.yml
.github/workflows/clean108-src047-media-viewer-replay.yml
```

## 2. Component A — Authority Inspector

Inputs:

```text
unit identity
Drive/GitHub authority provenance
canonical executable bytes
expected SHA256
variant/duplicate policy
```

Responsibilities:

- verify bytes
- compute SHA256
- confirm MIME/basic HTML executability
- reject authority drift
- expose immutable authority metadata to later stages

Fail closed on:

- missing exact executable
- hash mismatch
- unresolved multi-file canonical selection
- undeclared A/B or multi-variant authority

The inspector never selects a canonical authority on its own.

## 3. Component B — Static Auto Analyzer

The static analyzer reads the authoritative HTML without changing it.

### Structural inventory

Collect:

- document title
- total bytes
- DOM element count
- IDs/classes/landmarks
- inline style blocks
- inline script blocks
- module/classic script mode
- data URI count/types/sizes
- image/video/audio/iframe references
- external URLs/domains
- CSS imports/fonts

### Runtime-surface discovery

Search for candidate behavior including:

```text
addEventListener
onclick/onpointer*/ontouch*/onwheel
wheel
pointerdown/move/up
mousedown/move/up
touchstart/move/end
keydown/keyup
requestAnimationFrame
setTimeout/setInterval
localStorage/sessionStorage
history/location
postMessage
Dialog/modal/panel/menu patterns
classList state changes
aria-expanded / hidden / open
```

### Runtime hook discovery

Record exposed debug/runtime objects such as:

```text
window.__SOURCE__
window.__trackXX
window.__lt
```

Hooks are evidence aids only. The analyzer must not require them for every Source.

## 4. Component C — Dynamic Probe

Static discovery alone is insufficient for generated listeners or runtime-initialized state.

A clean browser probe should collect:

- event listener evidence where observable
- active DOM changes after initial settle
- requestAnimationFrame/timer activity
- scroll/overflow behavior
- visible interactive elements
- overlays whose opacity/visibility changes
- focusable/clickable candidates
- browser console/page/request failures

The probe should not randomly mutate the Source indefinitely. It proposes bounded candidate interactions.

## 5. State Recipe model

A state recipe describes how to reproducibly reach one source-defining runtime state.

Example conceptual schema:

```json
{
  "id": "SCENE04_VIEWER",
  "viewport": { "width": 1440, "height": 900 },
  "preconditions": {
    "storage": "clean",
    "startUrl": "original/original.html"
  },
  "actions": [
    { "type": "wheel", "deltaY": 720 },
    { "type": "waitForRuntime", "path": "__track62.targetPhase", "equals": 3 },
    { "type": "click", "selector": "[data-active-sculpture]" },
    { "type": "waitForSelectorState", "selector": "#viewer", "state": "open" }
  ],
  "assertions": [
    { "type": "runtime", "path": "__track62.phase", "equals": 3 },
    { "type": "visible", "selector": "#viewer" }
  ]
}
```

The merged governing schema is `src/08_harness/state-recipe.schema.json` with recipe
validation in `src/08_harness/auto-analyzer/validate-state-recipe.mjs` and executable
validation in `src/08_harness/state-replay/validate-executable-state-recipe.mjs`.
Recipes are DATA only: fixed action primitives, no recipe-supplied code.

### Recipe principles

- use real browser input for behavior whose semantics depend on input type
- do not replace swipe with keyboard merely because both reach the same scene
- wait for deterministic settled state, not arbitrary sleep where a state signal exists
- keep recipes minimal and source-defining
- store viewport and storage assumptions explicitly

## 6. Auto candidate generation

The analyzer may propose state families based on discovered behavior.

Examples:

| Discovery | Candidate state |
|---|---|
| modal/dialog/viewer element | `VIEWER_OPEN` / `MODAL_OPEN` |
| mobile menu trigger | `MENU_OPEN` |
| wheel listener + phase state | `WHEEL_TRAVEL_SETTLED` |
| pointer drag threshold | `DRAG_TRAVEL` + `TAP_VS_DRAG` |
| touch/pointer mobile path | `SWIPE_TRAVEL` |
| hover handlers | `HOVER_ACTIVE` |
| media play controls | `MEDIA_PLAYING` |
| playback/timeline | `PLAYBACK_ACTIVE` |

The analyzer generates candidates; it does not declare them mandatory without review.

## 7. Component D — S2 Baseline Capturer

For each approved state recipe, capture:

```text
screenshot
viewport/device scale
DOM landmarks
critical element bounding rects
critical computed styles
z-index / overflow
runtime state snapshot
asset/media references
console errors
page errors
failed requests
interaction outcome
```

Baseline artifacts are immutable for the authority revision after CENTRAL acceptance.

## 8. Component E — Mechanical Splitter

The splitter operates on the authoritative HTML and a minimal extraction policy.

Default:

```text
one or more inline <style> blocks -> styles.css
one or more inline <script> blocks -> script.js or mechanically ordered files
markup -> index.html
```

### Asset policy

Before moving an asset, ask:

> Is relocation required to preserve execution after the HTML/CSS/JS split?

If no, keep it where its semantic owner already resides.

Large inline data URIs are not automatically extracted.

### Split invariants

- script execution order preserved
- style cascade order preserved
- HTML parser behavior preserved
- asset bytes preserved
- no DOM normalization
- no event rewrite
- no breakpoint rewrite
- no Source defect repair

## 9. Round-trip validator

The merged mechanical splitter (`src/08_harness/materialize-mechanical-split.mjs`)
reconstructs the single-file representation from the split outputs and verifies
**round-trip byte identity** (`round_trip_byte_identity: true`) before writing.
`src/08_harness/validate-mechanical-split.mjs` re-validates every accepted capsule
(currently 8/8). Any exception requires an explicit mechanical reason and review.

## 10. Component F — S4 Replay Runner

For every accepted S2 recipe:

```text
run recipe against ORIGINAL
capture A evidence

run same recipe against SPLIT
capture B evidence
```

The runner must use matched:

- browser version
- viewport
- device scale
- zoom
- localStorage/session state
- network substitution policy
- timing/state-settle rules

No hidden split-only helper may bypass a real Source interaction that the original recipe used.

## 11. Component G — Parity Comparator

### Screenshot comparison

Support multiple classifications:

```text
PIXEL_EXACT
PIXEL_WITHIN_DETERMINISTIC_TOLERANCE
VISUAL_DIFF
NONDETERMINISTIC_REVIEW_REQUIRED
```

Animation/media should not be forced into an inappropriate exact-pixel rule if the authority itself is nondeterministic.

### DOM comparison

Compare relevant:

- IDs/landmarks
- element counts where stable
- text/content authority
- selected/open state

### Geometry comparison

Compare source-defining bounding boxes/world coordinates with explicit epsilon.

### Style comparison

Compare only critical/source-defining computed properties to avoid meaningless browser noise.

### Interaction comparison

Compare semantic outcome:

```text
same selected item
same viewer/panel state
same phase/scene
same playback state
same route/storage effect when source-authoritative
```

### Runtime health

Compare:

- console errors
- page errors
- failed requests
- unexpected cross-variant media

## 12. Component H — Evidence Classifier

Suggested result classes:

```text
HIGH_CONFIDENCE_PARITY_CANDIDATE
PARITY_DIFF
RUNTIME_ERROR
ASSET_MISMATCH
TIMING_AMBIGUITY
NONDETERMINISTIC_REVIEW_REQUIRED
HARNESS_UNSUPPORTED_SOURCE
```

`HIGH_CONFIDENCE_PARITY_CANDIDATE` is not equivalent to CENTRAL acceptance.

## 13. Variant architecture

Multi-variant Sources must remain one declared identity when authority says so.

Example model:

```text
SRCxxx
  variant A
  variant B
```

Rules:

- no implicit default variant
- variant selector fail-closed
- analyzer enumerates declared variants
- S2/S4 recipes run per variant as required
- cross-contamination explicitly tested
- generic harness may skip fail-closed if a dedicated driver is required

SRC068 is the merged DUAL_VARIANT proof family (see §20). The analyzer registry marks it
DUAL_VARIANT with no generic hook trust; a merged plugin owns its replay. Authority
decides which Sources are DUAL_VARIANT.

## 14. Simple / complex adapters

The common architecture should support Source-specific drivers without turning every exception into a generic-harness rewrite.

Conceptual split:

```text
common analyzer/replay engine
        ^
        |
optional Source driver
        |
Source-specific state semantics
```

A driver may describe how to reach a state; it must not change Source bytes.

## 15. Evidence schema versioning

Generated evidence carries explicit schema/harness version fields on merged current main
(`clean108-s2-recipe-evidence-v1`, `clean108-matched-replay-comparison-v1`,
`clean108-matched-pair-comparison-v1`, `clean108-dual-variant-replay-v1`, per-family
proof versions).

Minimum provenance should include:

```text
unit ID
authority SHA
branch head SHA
harness version
browser version
viewport
recipe ID
state ID
capture timestamp
comparison mode
```

A harness schema change must not silently reinterpret old accepted evidence.

## 16. Failure containment

If a shared harness defect is discovered:

1. stop broad new releases
2. classify affected active units
3. do not modify accepted Source capsules
4. fix the harness in a bounded PR
5. replay regression fixture classes
6. resume only after CENTRAL acceptance

This prevents one generic bug from invalidating many concurrent branches.

## 17. Bounded `setRuntime` action primitive

`setRuntime` is a **bounded module-owned action primitive**, not arbitrary JavaScript.

Purpose: reproduce **already-accepted deterministic runtime state** that a real
interaction reaches but whose final numeric state a generic settle cannot guarantee
(e.g. an accepted camera pin after a node select). It assigns only a primitive
literal or a primitive read from a source-bound own-property path.

SRC060 is the proof pattern: after `evaluateHook` drives the accepted interaction, the
recipe pins the accepted camera values (`yaw/pitch/zoom/tx/ty/tz`) through bounded
`setRuntime` actions, then settles before capture.

Explicitly prohibited everywhere:

```text
recipe arbitrary property expression
eval
new Function
free-form callback
recipe-supplied page.evaluate source
unbounded / prototype-chain paths
foreign (non-source-bound) roots
```

`setRuntime` is not appropriate for every Source. Sources whose accepted state is
reached deterministically by declarative interaction need no pinning.

## 18. Screenshot policies are Source-specific

The harness does **not** have one universal screenshot policy. Each merged proof uses
its accepted policy:

```text
SRC056  raw/exact matched replay
SRC060  canonical16: 16x16 downsample, RGB masked 0xF0, alpha unchanged,
        exact canonical digest equality
SRC047  accepted Source-specific canonical-Hamming policy, threshold inherited from
        previously accepted Source evidence, drift beyond threshold fails closed
SRC068  variant-specific exact/approved policy per A/B
```

Critical rule:

```text
Source-specific accepted tolerance != global tolerance
```

A new Source may not borrow SRC047/SRC060 tolerance merely because it helps CI pass.
Tolerance policy is accepted per Source from its own evidence, never globally relaxed.

## 19. Content DOM normalization

The mechanical split moves inline `<style>`/`<script>` into external `styles.css`/
`script.js`, so the raw tag count legitimately differs between original and split by
mechanical glue. Where the accepted comparison policy requires, evidence normalization
counts rendered content elements excluding the mechanical glue tags:

```text
body *:not(script):not(link):not(style)
```

Distinguish strictly:

```text
mechanical glue normalization   (allowed, bounded)
meaningful DOM normalization    (forbidden)
```

Only mechanical glue is normalized away. Real content DOM differences remain fail-closed.

## 20. Merged proof families (M1)

These families are merged on current main as **materially different proof families**, not
merely four Source IDs. Accepted capsules remain immutable regression inputs.

### SIMPLE — SRC056

```text
2 states (OVERVIEW, ORIGIN_REVEAL) x 3 viewports = 6 matched pair replays
raw screenshot exact comparison
reference family for backwards-compatible matched replay
```

### COMPLEX — SRC060

```text
7 state families x 3 viewports = 21 matched pair replays
1000 nodes / 9 clusters / 24 bridge records
runtime hooks __LT60__ + __LT60_V12__
deterministic accepted camera pinning (e.g. CONNECTION_HANDOFF 430x932 zoom = 2.35)
canonical16 screenshot normalization
Proves the automation is not limited to simple DOM-only Sources.
```

### DUAL_VARIANT — SRC068

Merged proof architecture (not conceptual):

```text
identity = { sourceId, variant }
explicit A/B selection
no implicit default variant
zero cross-contamination
A/B desktop + mobile replay
generic SINGLE executable path remains fail-closed for SRC068
```

Not every multi-revision Source is DUAL_VARIANT. Authority decides that classification;
the analyzer records it, it never guesses it.

### MEDIA/VIEWER — SRC047

Merged fourth proof family. Verified architectural distinctions only:

```text
media/viewer runtime
accepted Source-specific canonical-Hamming screenshot policy
applicable-state matrix; N/A states (e.g. mobile nav where N/A) remain N/A
rather than being fabricated
branded-Chrome requirement enforced before browser work
```

### LARGE_INLINE — SRC062 (supplementary)

Merged supplementary proof (PR #627) after M1 acceptance. Not a prerequisite to the
M1 gate; it is additional regression hardening for a large-inline-media runtime with
the same generic declarative pipeline.

## 21. Automation maturity gates

These gates describe what has been proven. M1 issue naming and the M0-M4 labels below
are distinct terms and must not be conflated.

```text
M0 = satisfied historically (manual-assisted era)
M1 = satisfied (candidate-assisted; S2 capture automated)
M2 = implemented/proven to current bounded scope (approved recipe -> S2 capture ->
     S3 split -> S4 replay automated; setRuntime + canonical digests + normalization
     merged)
M3 / Stage-1 controlled parallel production = RELEASED (4-6 workers; #611 comment
     5546112083)
M4 / Stage-2 scale = NOT RELEASED (8-12+ workers; requires observed stable operation
     under Stage-1 and metrics not yet gathered)
```

## 22. Explicit non-goals

This harness does not:

- choose product UX
- convert to React/Next
- normalize meaningful DOM
- improve source responsiveness
- repair source bugs
- connect backend/DB/Auth
- invent Source/Codex identity
- make final visual acceptance autonomously

## 23. Review-load reduction and exact-head CI

Automation currently pre-classifies, per replay family:

```text
authority bytes/SHA
recipe validation
mechanical round-trip
browser replay
DOM/runtime comparison
screenshot comparison
browser error health (console/page/request)
exact-head provenance
pre-browser HOLD classification
variant contamination checks
```

CENTRAL still owns:

```text
authority choice
S2 source-defining-state judgment
parity-diff interpretation
final visual acceptance
Ready transition
merge
```

Statement of evidence: **mechanical review-load reduction is demonstrated**; clock-time
savings are not yet formally measured and are not claimed here.

### Exact-head CI invariant

```text
CI evidence must bind to the exact PR head SHA
github.event.pull_request.head.sha
```

Synthetic merge-ref fallback is forbidden where the merged harness enforces it
(`resolveExactHead` fails closed under `CI=true`/`GITHUB_ACTIONS=true` without
`SRC_EXACT_HEAD`). Local development may keep the git-HEAD fallback. This document does
not rewrite CI semantics; it records the merged invariant.

## 24. Current rollout sequence

```text
M1 pilot = COMPLETE / ACCEPTED

Stage 1 (ACTIVE / RELEASED):
  4-6 independent unit workers total
  strict authority queue
  unit-local branches/worktrees
  shared harness changes separately released
  CENTRAL final review

Stage 2:
  NOT RELEASED
  measure Stage-1 stability first
```

Specific Source lanes currently in flight (e.g. SRC069, SRC071 materialization) are unit
lanes, not permanent architecture dependencies.

## 25. Issue #611 standing status

```text
#611 = standing automation/concurrency authority
AUTO_CLOSE = NO
ISSUE611_CLOSE = NO
```

M1 closure does not mean issue closure.

Related: #611, #589, #564, #565.
