# LoveTree V4 Telegram Intake Readiness Baseline — 2026-08-08

## Purpose

This document freezes the **pre-sync comparison baseline** for the new Telegram intake set that will appear under:

`reference/v4-incoming-telegram-20260808/`

The incoming folder is intentionally mixed-purpose:

1. **LoveTree implementation/integration candidates** — intended to evolve V4.
2. **Cross-product references** — files from 사실로, 단지온, 이어온, 파디엠/디파이엠 or other products that may be useful as design/UX references but are **not LoveTree implementation sources by default**.

No incoming source is to be deleted merely because it is unrelated to LoveTree. Classification and preservation come before implementation.

---

## Authority / Current Baseline

- Repository: `skerishKang/lovetree-limone`
- Baseline branch: `main`
- Baseline SHA at preparation time: `97aa06294d328ed0e816ee8518699d735ac41231`
- Official V4 source registry: `app/components/v4/v4-source-manifest.ts`
- Official V4 source count: **29**
- Official V4 sources remain the current integrated product baseline until a later product-adoption decision.

This readiness document is documentation-only. It does not alter V4 routes, backend, DB, Auth, Worker, deployment configuration, or Production.

---

## Existing Draft Work That Must Not Be Duplicated Blindly

### PR #37 — 4 memory lab sources

Branch: `feat/v4-new-telegram-sources-20260804`
Status: **Draft / unmerged / product-unapproved**

| Source | Existing lab route | Existing component | Intake handling |
|---|---|---|---|
| `lovetree-memory-pulse-dashboard-v1.html` | `/v4/labs/memory/pulse` | `V4MemoryPulse` | Compare incoming file/version before any new implementation |
| `lovetree-memory-scene-recipe-library-v1.html` | `/v4/labs/memory/recipes` | `V4SceneRecipeLibrary` | Compare incoming file/version before any new implementation |
| `lovetree-moment-polish-lab-v1.html` | `/v4/labs/memory/polish-lab` | `V4MomentPolishLab` | Compare incoming file/version before any new implementation |
| `lovetree-memory-window-composer-v2.html` | `/v4/labs/memory/window-composer` | `V4MemoryWindowComposer` | Compare incoming file/version before any new implementation |

Rules:

- Do not merge PR #37 as part of intake.
- Do not overwrite or delete its source files.
- If the new intake contains a later version, classify it as `LOVETREE_EVOLUTION` and compare behavior before deciding whether to update, supersede, or preserve both.

### PR #44 — 5 incoming lab implementations

Branch: `feat/new-sibling-design-sources-20260808`
Status: **Draft / unmerged / product-unapproved**

| Source family | Known source | Existing lab route | Existing component | Pre-sync status |
|---|---|---|---|---|
| Template Composer | `lovetree-auto-unfold-template-composer-v2.4-youtube-fixed.html` | `/v4/labs/incoming/template-composer` | `V4IncomingTemplateComposer` | Re-check against new intake |
| Live Flow Map | `lovetree-live-flow-map-v1-1.html` | `/v4/labs/incoming/live-flow-map` | `V4IncomingLiveFlowMap` | Re-check against new intake |
| Living Memory Terrain | `lovetree-living-memory-terrain-v1-2-standalone.html` | `/v4/labs/incoming/memory-terrain` | `V4IncomingMemoryTerrain` | Re-check against new intake |
| Memory Film Studio | `lovetree-memory-film-studio-v1.html` | `/v4/labs/incoming/film-studio` | `V4IncomingFilmStudio` | Re-check source provenance and completeness |
| Popup Season Book | `lovetree-popup-season-memory-book-v1.html` | `/v4/labs/incoming/popup-season-book` | `V4IncomingPopupSeasonBook` | Re-check against new intake |

PR #44 also preserves/reference-tracks these known source families:

- `lovetree-auto-unfold-mindmap-form-v1.html`
- `lovetree-living-video-memory-graph-v1.html`
- `lovetree-season-aquarelle-bloom-v3-cinematic-preview.html`

Rules:

- Do not merge PR #44 merely because an incoming filename matches.
- Incoming Telegram copies may be newer, functionally richer, or corrected.
- Existing React ports are comparison targets, not source-of-truth replacements for the HTML originals.

---

## Known Pre-Sync Classifications From Earlier Audit

These are **provisional history**, not final decisions for the new 46-file intake.

| Family | Earlier classification | Required action after sync |
|---|---|---|
| Template Composer v2.4 | `NEW_SCREEN` | Re-fingerprint and compare |
| Auto-Unfold Mindmap Form v1 | `VISUAL_VARIANT` | Re-check if newer/changed |
| Live Flow Map v1.1 | `NEW_SCREEN` | Re-fingerprint and compare |
| Living Memory Terrain v1.2 | `NEW_SCREEN` | Re-fingerprint and compare |
| Living Video Memory Graph v1 | `VISUAL_VARIANT` | Re-check if newer/changed |
| Memory Film Studio v1 | `NEW_SCREEN` | Verify actual source file now present and compare full behavior |
| Popup Season Memory Book v1 | `NEW_SCREEN` | Re-fingerprint and compare |
| Season Aquarelle Bloom v3 preview | `REJECTED_SOURCE / ASSETS_MISSING` | Preserve; do not implement unless a corrected source/assets arrive |
| Memory Pulse / Recipe Library / Window Composer / Moment Polish | `PR#37 LAB` | Do not duplicate; compare versions |
| Video Tearoff Memory Pad / Whole Picture Memory Dashboard | existing separate branch lineage | Compare before duplication |
| Cinematic reference motion | `IMPLEMENTED_EQUIVALENT` | Compare only if changed |
| `memory-topology-lab` and other visual families | previously `VISUAL_VARIANT` | **Do not assume old classification remains correct**; inspect new intake version/content |

---

## Incoming 46-File Classification Model

Every incoming file must receive exactly one primary class before implementation work begins:

### A. LoveTree product sources

- `LOVETREE_NEW` — genuinely new LoveTree product capability/screen.
- `LOVETREE_EVOLUTION` — later/richer version of an existing LoveTree source or V4 screen.
- `LOVETREE_VARIANT` — meaningful visual/compositional alternative without enough distinct product behavior to justify immediate new product integration.
- `LOVETREE_DUPLICATE` — byte-identical or functionally identical existing source already preserved/implemented.
- `LOVETREE_ASSET_DEPENDENCY` — asset required by a LoveTree source.
- `LOVETREE_BLOCKED_SOURCE` — source is preserved but cannot be implemented faithfully due to missing assets, broken dependencies, incomplete source, or gate failure.

### B. Cross-product references

- `REFERENCE_SASILRO`
- `REFERENCE_DANJION`
- `REFERENCE_IEON`
- `REFERENCE_PADIEM`
- `REFERENCE_OTHER`

Cross-product files are **not to be deleted** and are not to be implemented as LoveTree screens automatically. Their value is as UI/UX/reference material for later design synthesis.

### C. Unclear

- `UNCLASSIFIED_PRESERVE`

If provenance or purpose is unclear, preserve the file and defer the decision. Do not delete it.

---

## Required Comparison Dimensions After Drive Sync

For every LoveTree-related incoming HTML, compare at least:

1. filename/version
2. file size and SHA-256
3. `<title>` and visible product identity
4. main V4 source/route counterpart
5. PR #37 counterpart, if any
6. PR #44 counterpart, if any
7. other unmerged branch counterpart, if any
8. core interaction model
9. modal behavior
10. drag/pan/zoom
11. animation/replay
12. timeline/graph/tree navigation
13. search/filter
14. media/video/upload behavior
15. keyboard behavior
16. mobile behavior
17. local persistence/state
18. external/local asset dependencies
19. whether it adds a real product capability versus a visual-only variation
20. whether existing V4 implementation lost source behavior

The decision must be evidence-based. Filename similarity alone is insufficient.

---

## Implementation Decision States

After comparison, every LoveTree source should end in one of these states:

- `ADOPT_NEW_V4_SCREEN`
- `UPGRADE_EXISTING_V4_SCREEN`
- `MERGE_BEHAVIOR_INTO_EXISTING_V4`
- `KEEP_AS_OPTIONAL_VARIANT`
- `REFERENCE_ONLY`
- `BLOCKED_PENDING_ASSETS`
- `NO_ACTION_EXACT_DUPLICATE`

No source should be silently discarded.

---

## Preservation / Folder Policy

The original incoming files should remain preserved under the Telegram intake reference tree.

Recommended logical organization after inspection (physical moves only after the synced files are visible and provenance is recorded):

```text
reference/v4-incoming-telegram-20260808/
  01_lovetree-implementation/
    new/
    evolution/
    variants/
    blocked/
  02_cross-product-reference/
    sasilro/
    danjion/
    ieon/
    padiem/
    other/
  99_unclassified/
```

Important:

- **No deletion.**
- No source rewrite just to normalize formatting.
- Preserve original filenames when possible.
- If physical reorganization would obscure original intake provenance, keep files in place and use an index document instead of moving them.

---

## Backend Integration Boundary

The new Telegram intake phase is frontend/source lineage work first.

Do not infer that a visually implemented lab is production-complete. Existing V4 source ports may still use fixture/local browser state. Product adoption should later determine which screens connect to the existing LoveTree Auth/API/DB/Tree/Memory spine.

No DB schema, Firebase/Auth, Worker, Production deployment, or backend write is part of the pre-sync readiness phase.

---

## Hold Gates Until the 46 Files Are Visible

Before the synced Telegram intake is inspected:

- **HOLD** PR #37 merge.
- **HOLD** PR #44 merge.
- **HOLD** new product-route adoption.
- **HOLD** replacement of existing official V4 screens.
- **HOLD** deletion/movement of source evidence.

Allowed now:

- read-only comparison
- lineage mapping
- documentation
- preparation of intake classification tables

---

## Immediate Post-Sync Procedure

When `reference/v4-incoming-telegram-20260808/` becomes visible in Drive:

1. Confirm actual file count and filenames.
2. Separate LoveTree implementation candidates from cross-product references **without deleting either group**.
3. Fingerprint LoveTree candidates.
4. Compare against main 29 official sources, PR #37, PR #44, and other known branches.
5. Reassess all prior `NEW_SCREEN` / `VISUAL_VARIANT` judgments using the newly synced source content.
6. Produce a final adoption matrix.
7. Only then authorize React/V4 implementation or remediation.

---

## Readiness Status

`READY_FOR_46_FILE_DRIVE_SYNC_COMPARISON`

This document intentionally makes no adoption or merge decision for the 46-file intake before the files are visible and inspected.