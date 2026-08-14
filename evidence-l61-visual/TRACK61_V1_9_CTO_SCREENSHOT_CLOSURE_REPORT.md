# TRACK61_V1_9_CTO_SCREENSHOT_CLOSURE_REPORT

**PR:** #167 (Draft) — `feat/lineage-61-v1-7-native-proving-158`
**Updated PR title:** `feat(lineage-61): V1.9 native candidate factory proving (Refs #158, #157)`
**Branch / PR policy:** same existing branch & PR only. No new branch, no new PR. Draft maintained. READY NO. MERGE NO.
**Scope:** narrowly close the CTO screenshot-review blocker (provenance/status panel overlapping product UI). No expansion into unrelated blockers.

---

## 1. Blocker fixed — provenance/status panel no longer overlaps product UI

**File:** `app/design-lab/lineages/61/61-v1-9/page.tsx`

Before (covering product UI):
```
position: fixed; zIndex: 200; left: 8; bottom: 8; maxWidth: 360
```

After (normal document flow, never overlaps):
```
position: "static"
width: "100%"
boxSizing: "border-box"
marginTop: 24
```
- The provenance + HOLD disclosure is now a `<footer>` rendered **after** the product UI in document flow.
- It remains on-screen and is captured in screenshots — **not hidden for QA** (no `display:none`, no `visibility:hidden`, no screenshot-only hide).
- Horizontal overflow stays `0` (verdict below).
- Function renamed `Lineage61V17Page` → `Lineage61V19Page` (stale V1.7 naming retired).

## 2. Stale naming cleanup (V1.9 current truth)

`tests/track-61-guided-next-moment-builder-route-browser-qa.mjs`:
- `test("Track61 V1.7 — desktop/mobile/narrow actual-route interaction contract", …)` → `… V1.9 …`
- `test("Track61 V1.7 — reduced motion preserves the semantic builder flow", …)` → `… V1.9 …`

Substantive V1.7 references kept accurate (NOT renamed — they describe the real V1.7 implementation reuse / V1.7 navigation evidence): `design-intake-native-candidate-factory.test.mjs` (fixtures Track61→dom-2d V1.7; Track61 V1.7 navigation evidence HOLDS) and `design-fidelity-validation-orchestration.test.mjs` (Lineage61 V1.7 interaction-contract only while P8/source fidelity HOLD). **No assertion/behavior changed.**

Added initial-state screenshots so the closure artifact set is complete:
- `1280x800-initial.png`, `390x844-initial.png`, `320x720-initial.png` (captured before journey exercise)
- `390x844-reduced-motion.png` (already present) and journey / scale-disclosure screenshots retained.

## 3. PR title → current truth
`feat(lineage-61): V1.9 native candidate factory proving (Refs #158, #157)` (updated via REST; `gh pr edit` is blocked by a Projects-classic GraphQL deprecation error).

## 4. Holds preserved (NOT false-greened)
- **P8 exact-asset gate: HOLD** — no fake `exactAssets` added; source-fidelity not claimed.
- **Source navigation holds: HOLD** — `actualTargetOpen=false`, `receiverConsume=false`, `sameMomentFocus=false`.
- No source-fidelity claim introduced anywhere.

## 5. Validation

| Gate | Result |
|------|--------|
| `git diff --check` | clean (exit 0) |
| Lint (`eslint .`) | 0 errors (only pre-existing `<img>` warnings) |
| Typecheck (`tsc --noEmit`) | clean |
| Build (`npm run build`, Node 22) | success |
| Focused Track61 tests (factory + intake-contract + Design Fidelity orchestration) | 80/80 pass |
| Actual-route browser QA (`track-61-guided-next-moment-builder-route-browser-qa.mjs`) | 3/3 pass (V1.9 subtest names) |
| Provenance↔product overlap measurement | **0.0 px at all viewports** (below) |

### Overlap measurement (programmatic, scroll-through all viewports)
Script measured intersection between `[aria-label="출처 및 충실도 상태"]` and every product UI element (buttons, links, inputs, dialogs, representative choices, pool candidates) while scrolling the full document.

| Viewport | maxOverlapPx | footer box |
|----------|--------------|------------|
| 1280×800 | **0.0** | 1280×92 @ doc-flow bottom |
| 390×844 | **0.0** | 390×142 @ doc-flow bottom |
| 320×720 | **0.0** | 320×142 @ doc-flow bottom |
| 390×844 reduced-motion | **0.0** | 390×142 @ doc-flow bottom |

### New screenshot artifacts (generated locally + by CI Design Fidelity run)
`test-results/track-61-guided-next-moment-builder/`
- `1280x800-initial.png`
- `390x844-initial.png`
- `320x720-initial.png`
- `390x844-reduced-motion.png`
- journey: `1280x800-journey.png`, `390x844-journey.png`, `320x720-journey.png`
- scale-disclosure: `1280x800-v19-scale-disclosure.png`

In every artifact the provenance/status footer sits below the product content in document flow; **provenance panel ↔ product content overlap = 0**.

## 6. CI status at new exact head `51084cf43d455d3c926dbcac2642d222521650a5`

- **Design Fidelity Validation:** ✅ success
- **Fidelity · lineage-61-61-v1-9 (actual execution):** ✅ success
- **New screenshot artifact:** ✅ created (above set)
- **A-track (`validate`):** ⚠️ 1 pre-existing failure, **out of scope for this blocker**
  - Subgate `standard-non-browser-tests` → 999 pass / 1 fail.
  - Failing test: `design-intake-source-freshness.test.mjs` asserts
    `track-61-guided-next-moment-builder.json — HISTORICAL_PINNED`,
    but the reconciled manifest (this PR's V1.9 work) resolves to `— CURRENT` (V1.9).
  - Root cause: this assertion lives on `origin/main` (added after our branch diverged) and hardcodes the pre-reconciliation V1.7 `HISTORICAL_PINNED` state. It is a **merge-dependent, main-coupled** expectation, not caused by the screenshot fix, and cannot be corrected without merging the V1.9 reconciliation into `main` (CTO decision; MERGE NO). Editing the file in our branch would create a merge conflict and break the A-track checkout, so it is intentionally left untouched.
  - Recommendation (separate from this blocker): when the PR is merged, update the main-side freshness assertion for track-61 to `CURRENT` (or complete the reconciliation merge) so A-track goes fully green.

## 7. Status
- Draft: YES
- READY: NO
- MERGE: NO
- CTO to re-review the new artifact set directly, then decide merge.
