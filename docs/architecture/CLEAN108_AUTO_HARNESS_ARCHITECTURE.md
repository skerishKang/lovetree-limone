# CLEAN-108 Auto Harness Architecture

Status: **Design / pilot architecture**  
Standing issue: **#611**  
Parent CLEAN program: **#589**  
Governing fidelity process: **#564**

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

This is illustrative, not a fixed final JSON schema.

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

Where mechanically feasible, the harness should reconstruct an equivalent single-file representation and compare the relevant extracted content/order against the authority.

The goal is not necessarily one universal byte-for-byte reconstruction for every possible HTML parser edge case. The goal is a deterministic proof that the split operation preserved the extracted source content and execution order without semantic rewriting.

Any exception requires an explicit mechanical reason and review.

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

SRC068 is the reference regression family for this behavior.

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

Generated evidence should carry a schema/harness version once automation is shared across concurrent units.

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

## 17. Pilot regression families

Useful materially different patterns already available in the repository/history:

```text
SRC056  graph/relationship runtime
SRC057  detail/viewer runtime
SRC058  board runtime
SRC060  exploration/canvas-like runtime
SRC064  large inline-data runtime
SRC068  DUAL_VARIANT runtime
SRC062  large inline-media + wheel/drag/swipe/viewer/panel runtime
```

Accepted capsules remain immutable. Use them as regression inputs or reference patterns, not rewrite targets.

## 18. Automation maturity gates

### M0 — manual-assisted

- static analyzer available
- worker still writes most state recipes manually

### M1 — candidate-assisted

- analyzer proposes interactions/states
- worker approves/rejects candidates
- S2 capture automated

### M2 — full mechanical pipeline

- approved recipe -> S2 capture -> S3 split -> S4 replay automated

### M3 — parallel production

- evidence classifier stable
- shared harness regression suite stable
- 4-6 independent units safe in parallel

### M4 — scaled production

- 8-12+ workers safe
- CENTRAL review load reduced by reliable high-confidence classification

## 19. Explicit non-goals

This harness does not:

- choose product UX
- convert to React/Next
- normalize code
- improve source responsiveness
- repair source bugs
- connect backend/DB/Auth
- invent Source/Codex identity
- make final visual acceptance autonomously

## 20. Current implementation order

```text
SRC062 strict S2-S4 completion
-> extract reusable recipe/analyzer requirements
-> strengthen common analyzer/replay pipeline
-> prove against 3-5 materially different patterns
-> release 4-6 parallel units
-> measure and scale deliberately
```

Related: #611, #589, #564, #565.
