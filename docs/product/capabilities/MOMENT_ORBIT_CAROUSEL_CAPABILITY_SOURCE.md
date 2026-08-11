# Moment Orbit Carousel Capability Candidate

## Decision

- Classification: `CAPABILITY`
- Recommendation: `PARTIAL IMPLEMENT`
- Product adoption: **not approved**
- New Lineage: **forbidden by intake decision**
- `04_LoveTree_Idol_Orbit_Archive_V1` Revision registration: **forbidden by intake decision**
- Canonical comparison route: `/v4/subjects/demo/orbit`
- Implementation route: `/design-lab/capabilities/moment-orbit-carousel`

This candidate exists only so CTO visual QA can compare the current V4 Orbit with the newly supplied interaction mechanics before any product adoption decision.

## Authoritative intake base

- Repository: `skerishKang/lovetree-limone`
- main used to start implementation: `b22ac8865f05f897c90937527c8c5542a90a5f95`
- existing open capability PR #113 is a separate owner/workstream and is not modified by this candidate.

## Source provenance

New source folder:

- `10_LoveTree_Idol_Moment_Orbit_Carousel_V1`
- Drive folder ID: `1qyrwsNyxi5f4uiRQ8rl0gyzhNRTwAnvv`

Executable source:

- `01_HTML/index-v1.html`
- Drive ID: `1WRV1mFJ3_3P-AdEzAd9CtyeCETNj2wLE`
- bytes: `24,146`
- SHA256: `5268d78efc757854a6bc123396f3e4cfa03e70a2b73f6a7d19b3f1ce9564d7a1`

Byte-identical alias:

- `01_HTML/index.html`
- Drive ID: `1JasHmRE20FH05S9KZw9GcPCoIT2F4e98`
- same bytes/SHA256 as `index-v1.html`

Comparison source:

- `04_LoveTree_Idol_Orbit_Archive_V1`
- Drive folder ID: `17aoUk-jLjC9W5ptddFzDom9jS6EW626E`

The supplied benchmark reference video is analysis evidence only. It is not a runtime asset of this candidate.

## Extracted mechanics

The candidate extracts only these mechanics:

1. center-snapping Moment card orbit;
2. drag/touch release to nearest canonical Moment;
3. a ten-item mixed photo + video Moment collection;
4. one selected state shared by orbit card, thumbnail shelf and inspector;
5. persistent desktop selected-Moment inspector and explicit mobile off-canvas inspector;
6. interruptible autoplay;
7. selected-media-only audio authority;
8. horizontal / vertical orbit switching;
9. click, drag, wheel, keyboard and touch input contracts.

## Autoplay policy

The candidate uses the source interval of `4200ms`, but makes takeover semantics explicit:

- autoplay advances one canonical Moment at a time;
- pointer drag/touch immediately suspends the pending timer;
- release snaps to the nearest Moment;
- any manual card, shelf, wheel, keyboard, axis or drag selection resets the autoplay clock;
- when AUTO remains enabled, the next automatic advance occurs only after a fresh 4200ms interval;
- `prefers-reduced-motion: reduce` defaults AUTO to OFF;
- reduced-motion users may explicitly enable AUTO, but spatial transitions remain immediate.

## Audio authority

No background orbit card creates a playable media element. A video media element exists only in the selected inspector. Therefore there can be at most one media element with audio authority, and selection changes reset sound to muted.

This internal mechanics candidate intentionally uses inert local SVG media stubs instead of transferring or substituting the Drive source binaries. This is not a source-fidelity visual/media approval surface.

## Explicitly excluded source-demo semantics

The candidate does not import or invent canonical product meaning for:

- source demo person identity;
- source demo saved-Moment / Connection / day counts;
- hard-coded emotion, date or branch values;
- fake save persistence or `SAVE THIS MOMENT` semantics;
- ambient petal effects as product meaning;
- benchmark reference video runtime use.

## Existing V4 contract preserved

No file under the canonical `/v4/subjects/demo/orbit` route is modified by this candidate. Existing V4 behaviors remain owned by the current product implementation, including current Moment selection, drag, wheel, keyboard, detail viewer and the `wave / orbit / free / diagonal` grammar.

If CTO later approves adoption, the product change must be a focused diff against the current `V4LiquidOrbitGallery`, not a replacement of the archive system.

## Mobile policy

The candidate deliberately corrects the source V1 mobile problems:

- shelf is horizontally scrollable and every one of the ten items remains directly focusable/tappable;
- transformed cards are clipped by the stage and do not expand document width;
- inspector is explicit off-canvas UI with backdrop and close control;
- open inspector traps Tab focus and restores previous focus on close;
- drag/tap separation uses an 8px click slop;
- touch uses the same pointer path as mouse drag;
- 390×844 and 320×720 are browser-QA targets.

## Adoption boundary

A later product adoption should consider only a focused transfer of:

- snap-selection state;
- shelf synchronization;
- mixed-media type handling;
- persistent inspector option;
- explicit autoplay takeover policy;
- selected-only audio authority;
- optional vertical-axis mode.

The current V4 route's `wave / orbit / free / diagonal` grammar, archive navigation and existing viewer behavior must remain unless a separate CTO decision explicitly replaces them.
