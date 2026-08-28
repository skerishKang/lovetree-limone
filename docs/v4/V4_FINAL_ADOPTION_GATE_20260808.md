# LoveTree V4 Final Design Adoption Gate — 2026-08-08

Status: **B_TRACK_ADOPTION_GATE_FINAL**

This document converts the completed Telegram 46-source audit into the final product-surface adoption plan. It is a design/product gate only: no backend/Auth/DB changes, no production deploy, no source deletion, and no PR #37/#44 merge.

## 1. Inputs and frozen baselines

- Repository: `skerishKang/lovetree-limone`
- Current main baseline used by the B audit: `97aa06294d328ed0e816ee8518699d735ac41231`
- A-track P0 product-spine candidate: PR #46, code gate green; runtime E2E remains blocked by lack of an isolated writable non-production Firebase/API/DB chain.
- Telegram intake: `old/reference/v4-incoming-telegram-20260808` — 46 HTML sources.
- Prior B audit:
  - `docs/v4/TELEGRAM_46_SOURCE_INVENTORY_20260808.md`
  - `docs/v4/TELEGRAM_46_SOURCE_CLASSIFICATION_20260808.md`
- Current V4 source manifest: 29 official source-faithful V4 sources.
- Existing real product shell already exposes canonical server-backed Tree routes under `/trees/:id` with Tree / Timeline / Album views. V4 demo routes are fidelity/reference surfaces, not a reason to create one production route per incoming HTML.

## 2. Non-negotiable adoption rules

1. **No one-route-per-HTML implementation.** Incoming HTMLs are behavior/art-direction sources, not routing requirements.
2. **Real product data remains server authoritative.** Incoming `localStorage` implementations are prototype behavior only. Tree/Memory payloads must use the existing Auth/API/DB product spine.
3. **Preserve source fidelity where the source is adopted.** Motion, hierarchy, interaction rhythm, responsive behavior, and key affordances should be retained unless they conflict with the product contract or accessibility.
4. **Canonical product routes win over demo routes.** `/v4/.../demo` remains useful as lineage/reference, but adopted behavior should ultimately live on real Tree/Browse surfaces.
5. **Public != Browse eligible.** Global Discovery must consume the A-track Browse/privacy contract, including public-child filtering and the LoveBud baseline of at least 3 public moments.
6. **Do not expose developer/data-model language in product UI.** Backend field names, idempotency, schema notes, etc. belong in implementation docs/tests only.
7. **Cross-product sources remain reference-only.** 사실로, 단지온, 이어온, 파디엠, AI Navigator, 또다른우주 sources are preserved but not imported into LoveTree product scope.

## 3. Final surface compression

The 16 implementation candidates are compressed into **7 product surfaces**, not 16 routes.

| Final product surface | Canonical target | Incoming sources absorbed | Gate decision |
|---|---|---|---|
| Discovery | `/v4/community` initially; later canonical Browse alias/convergence | Global Discovery Home | **ADOPT / UPGRADE** |
| Tree Overview | canonical `/trees/:id` family; recommended `overview` mode/tab | Whole Picture + Memory Pulse | **ADOPT / MERGE** |
| Public Story | canonical public Tree surface; story/replay mode, not a standalone app | Golden Heart Scroll Story | **MERGE** |
| Tree Graph | one canonical graph mode for a real Tree | Video Constellation + Topology Lab + Graph Observatory + Cosmic Atlas + Lore Map + Atlas 360 | **MERGE INTO ONE GRAPH PRODUCT** |
| Replay | canonical Tree/Album family; one replay mode | Vinyl Video Memory Player + Tearoff behavior | **ADOPT / MERGE** |
| Studio | canonical owner-only Tree authoring surface | Film Studio + Scene Recipe Library + Window Composer | **ADOPT AS ONE STUDIO** |
| Cinematic | existing `/v4/cinematic` | Cinematic v6 International | **UPGRADE EXISTING** |

This compression is the final routing rule for the current adoption cycle.

---

## 4. Wave 1 — launch-adjacent adoption

### 4.1 Global Discovery Home

Source: `lovetree-global-discovery-home-v1.html`

Prior classification: `LOVETREE_EVOLUTION` / `UPGRADE_EXISTING_V4_SCREEN` / P0.

**Final decision: ADOPT as the art-direction and information-architecture upgrade of current `/v4/community`. Do not create a second Discovery route.**

Preserve from source:

- forest/ivory editorial hero and strong first-moment CTA;
- horizontal LoveTree discovery rail;
- filters and curated collections;
- editorial storytelling rhythm across discovery, growth, feelings, featured Tree, categories, journeys;
- first-moment modal entry;
- scroll reveal/parallax/before-after interactions where they remain performant and accessible.

Do **not** port as product state:

- `localStorage` first-moment payload;
- `localStorage` newsletter persistence;
- fake/static Browse eligibility;
- hard-coded public Tree list as production data.

Real-data binding:

- Discovery Tree rails/cards -> A-track Community/Browse API;
- card visibility -> `public Tree AND >=3 public moments` contract;
- Tree opening -> canonical public Tree detail;
- first-moment CTA -> A-P0 real Auth + `POST /api/trees/with-first-memory` product spine;
- no duplicate Tree creation logic in B components.

Launch scope:

- **Ship:** hero, Tree discovery, filters, curated public Trees, first-moment acquisition.
- **Static/editorial okay initially:** principles/how-it-grows explanatory blocks.
- **Defer as product features:** Courses, Journal, newsletter backend unless independently approved.

### 4.2 Whole Picture Memory Dashboard

Source: `lovetree-whole-picture-memory-dashboard-v1.html`

Prior classification: `LOVETREE_NEW` / high-value Tree Overview candidate.

**Final decision: ADOPT as Tree Overview, not as another demo dashboard.**

Recommended product placement:

- add an `Overview` mode/tab in the canonical server-backed Tree family;
- do not replace Tree/Timeline/Album blindly;
- use Overview as the reflective summary surface, while the existing connected Tree remains the editing/navigation surface.

Preserve:

- question-led overview interaction;
- “where my heart stands / what changed / what may come next / what to do next” progressive summary structure;
- visual state switching and responsive summary card;
- moment rows that open actual Moment details;
- understated paper/plant visual system.

Data mapping available without new schema:

- Tree title/visibility/createdAt;
- Memory count;
- first/last Moment dates;
- emotionTags distribution;
- recent Moment list;
- source/thumbnail data;
- owner/public state.

Derived frontend metrics are allowed when deterministic and clearly presentation-only. Do not invent durable analytics fields in DB for this screen.

### 4.3 Golden Heart Scroll Story

Source: `lovetree-golden-heart-scroll-story-v1.html`

Prior classification: `LOVETREE_EVOLUTION` / `MERGE_BEHAVIOR_INTO_EXISTING_V4` / P1.

**Final decision: MERGE as an optional Public Story/Replay mode for a public Tree.**

Do not make Golden Heart the only public Tree representation. Users still need a legible Tree/detail view.

Preserve:

- sticky scroll exhibition;
- chapter rail/readout;
- golden-heart-to-tree growth metaphor;
- moment/video nodes;
- replayable narrative progression;
- person/season/moment storytelling when source data exists.

Data boundary:

- only public Memories provided by A-track privacy filtering;
- no private child should enter the story model even if parent Tree is public;
- absent person/season fields must degrade gracefully rather than being fabricated.

### 4.4 Video Constellation

Source: `lovetree-video-constellation-v3-dense-bookmarks-person-fix.html`

Prior classification: `LOVETREE_EVOLUTION` / `MERGE_BEHAVIOR_INTO_EXISTING_V4` / P1.

**Final decision: MERGE into the single canonical Tree Graph product; do not add a standalone constellation route.**

Use it primarily for:

- dense video-Moment constellation rendering;
- person/bookmark emphasis;
- Moment selection and detail focus;
- high-density visual traversal.

Canonical graph data should come from Memory `id`, `parentId`, title, memo, emotionTags, timestamp, sourceUrl, thumbnail, and visibility-filtered records. Current lack of durable x/y is not a blocker: automatic/layout-session coordinates may remain presentation state until the P2 data contract is approved.

### 4.5 Video Tearoff Memory Pad

Source: `lovetree-video-tearoff-memory-pad-v1.html`

Prior classification: `LOVETREE_VARIANT` / `MERGE_BEHAVIOR_INTO_EXISTING_V4` / P1.

**Final decision: DO NOT create a Tearoff route. Merge the tactile tear/reveal behavior into Replay/Moment revisit, especially mobile.**

Best placement:

- small-screen replay queue;
- Moment detail/revisit sequence;
- lightweight “next memory” gesture.

Person filters may be enabled only when the product has a reliable person/subject mapping. Otherwise preserve the interaction without fake person semantics.

### 4.6 Vinyl Video Memory Player

Source: `lovetree-vinyl-video-memory-player-v1.html`

Prior classification: `LOVETREE_NEW` / `ADOPT_NEW_V4_SCREEN` / P1.

Current V4 Motion Archive already has a small `vinyl` mode, so blindly adding another vinyl gallery would duplicate product roles.

**Final decision: ADOPT the stronger source as the lead experience of one canonical `Replay` product surface, while retiring the idea that every archive prototype needs a separate production destination.**

Replay should absorb:

- dedicated video player window;
- vinyl/record metaphor;
- minimize/restore behavior;
- memory queue/navigation;
- emotion/person metadata only where real data exists;
- source-time deep links when present.

The existing Motion Archive remains a lineage/fidelity reference; reusable behaviors can be migrated into Replay rather than kept as competing final products.

### 4.7 Cinematic v6 International

Source: `lovetree-cinematic-v6-international.html`

Prior classification: `LOVETREE_EVOLUTION` / `UPGRADE_EXISTING_V4_SCREEN` / P1.

**Final decision: UPGRADE existing `/v4/cinematic`; no new cinematic route.**

Current `/v4/cinematic` already faithfully realizes v5.1 lineage with 16-scene scroll, rail/menu, autoplay, motion masks, keyboard/reduced-motion support. v6 should be treated as an evolution patch:

- international/global copy;
- pointer-follow frame refinements;
- v6 chapter/menu presentation improvements;
- any motion delta that is demonstrably better than current v5.1 implementation.

Do not regress current accessibility, autoplay pause/resume safety, scene fidelity, or reduced-motion behavior.

---

## 5. Wave 2 — consolidated advanced products

### 5.1 One Tree Graph product

Absorb these candidates into a single graph product rather than separate routes:

- `lovetree-memory-topology-lab-v1.html`
- `lovetree-memory-graph-observatory-v1.html`
- `lovetree-cosmic-video-memory-atlas-v1.html`
- `lovetree-video-memory-lore-map-v1.html`
- `lovetree-memory-universe-atlas-360-v1.html`
- Video Constellation from Wave 1.

Recommended internal modes:

- **Graph** — current connected node graph baseline;
- **Constellation** — dense video/emotion navigation;
- **Topology** — people/season/feeling filters, modes, live/dense, rotate/zoom, inspector/telemetry;
- **Atlas** — pan/zoom/orbit/timeline spatial exploration;
- **Observatory** — branch focus, source recovery, season condensation;
- **Lore** — narrative/semantic overlays.

Topology Lab remains a genuine new capability, not merely a skin. Its interaction set is substantial enough to preserve as a mode inside this consolidated product.

### 5.2 One owner-only Studio product

Absorb:

- `lovetree-memory-film-studio-v1.html`
- `lovetree-memory-scene-recipe-library-v1.html`
- `lovetree-memory-window-composer-v1.html`

Recommended Studio internal structure:

- Storyboard
- Scene Recipes
- Window/Composition
- Export

Film Studio adoption is **blocked from release until export fidelity is restored**. The source implements real Storyboard JSON, Film Config JSON, Poster PNG, and WebM generation/recording. The existing PR #44 implementation that only toasts Poster PNG/WebM actions is not acceptable for merge as-is.

### 5.3 Memory Pulse Dashboard

Source: `lovetree-memory-pulse-dashboard-v1.html`

**Final decision: MERGE analytics behaviors into Tree Overview. Do not create a standalone Pulse route.**

Only metrics derivable from real data should ship. Private/public state and empty-state handling from the source should be preserved.

---

## 6. Blocked / no-action / preserve-only rules

### 6.1 48 Neon Pilot

`lovetree-48-neon-pilot-cinematic-hero-v1.html`

Status: `BLOCKED_PENDING_ASSETS`.

Five required local assets are missing. Do not implement a degraded substitute and call it source-faithful. Re-open only when all required assets arrive.

### 6.2 Cinematic v5.1

`lovetree-cinematic-reference-motion-v5-1-refined.html`

Current `/v4/cinematic` already realizes this lineage. `NO_ACTION_EXACT_DUPLICATE` remains correct.

### 6.3 Optional variants / references

Early cinematic variants, Living Memory v1, Core Reactor v1, Moment Polish Lab and other P3/reference sources remain preserved as lineage/research material. They are not launch routes.

### 6.4 Cross-product references

17 non-LoveTree references remain `REFERENCE_ONLY`; no deletion and no LoveTree import by default.

---

## 7. A-track / B-track integration boundary

A-track owns product truth and server contracts:

- Firebase Auth/session restoration;
- Tree/Memory CRUD;
- `POST /api/trees/with-first-memory`;
- Memory visibility inheritance;
- public/private authorization;
- Browse eligibility (`>=3 public moments`);
- public child filtering;
- later schema decisions for connection reason, dedicated video offset, durable graph coordinates, record/discovery date.

B/design integration owns presentation and interaction:

- V4 visual components/styles;
- responsive behavior;
- motion and interaction fidelity;
- product-mode composition;
- data-to-view adapters that do not redefine server truth.

B must not persist authoritative Tree/Memory payloads in `localStorage`.

## 8. Proposed view-model contracts

These are presentation contracts, not DB schema proposals.

### DiscoveryTreeSummary

- `id`
- `title`
- `ownerDisplayName`
- `cover/thumbnail`
- `publicMomentCount`
- `emotionTags[]`
- `updatedAt`
- optional presentation-only derived labels

### TreeOverviewModel

- Tree metadata
- filtered/authorized Moments
- moment count
- first/last Moment
- emotion distribution derived from `emotionTags`
- recent Moments
- optional derived trend summaries

### TreeGraphModel

- `nodes[]`: Memory `id`, `parentId`, title, memo, emotionTags, timestamp, sourceUrl, thumbnail
- `edges[]`: derived from parent relationships
- optional session/layout coordinates
- no durable x/y assumption until contract approved

### ReplayModel

- authorized Moment sequence
- title/memo/sourceUrl/thumbnail/emotionTags/timestamp
- video deep-link preserved in sourceUrl
- optional subject/person only when real mapping exists

### StudioModel

- authorized owner Tree + Moments
- storyboard state may remain Studio-local until a durable authoring/export contract is approved
- export output must be real, not toast-only

---

## 9. Implementation order after A-P1 contract review

1. **Global Discovery** — wire real Browse data + P0 first-moment CTA.
2. **Tree Overview** — Whole Picture baseline + safe derived Pulse metrics.
3. **Public Story** — Golden Heart using filtered public Moments.
4. **Replay** — Vinyl lead experience + Tearoff mobile/revisit interaction.
5. **Canonical Graph** — begin with current graph + Video Constellation; layer advanced P2 modes later.
6. **Cinematic v6** — low backend coupling; upgrade existing cinematic after core product surfaces are stable.
7. **Studio** — after product spine/public loop; export fidelity is a hard release gate.
8. **Advanced Graph modes** — Topology/Atlas/Observatory/Lore after core graph consumes real data reliably.

## 10. File-collision policy for parallel work

Until A-P1 finishes:

- A should avoid V4 visual redesign files.
- B should avoid `server/api/**`, DB/schema, Auth, core authorization, and mutation handlers.
- Do not have A and B simultaneously rewrite `app/trees/[id]/page.tsx` or `/v4/community` implementation.
- B may prepare new presentation components behind clean props/interfaces, then wire them after A contracts stabilize.

Recommended B implementation namespace when coding starts:

- `app/components/v4/adopted/discovery/**`
- `app/components/v4/adopted/overview/**`
- `app/components/v4/adopted/story/**`
- `app/components/v4/adopted/replay/**`
- `app/components/v4/adopted/graph/**`
- `app/components/v4/adopted/studio/**`

This keeps source-faithful implementation isolated until route integration.

## 11. Final Gate

### Adopt now / first implementation wave

1. Global Discovery Home
2. Whole Picture Memory Dashboard
3. Golden Heart Scroll Story
4. Video Constellation
5. Video Tearoff Memory Pad behavior
6. Vinyl Video Memory Player
7. Cinematic v6 International

### Adopt later / consolidated P2 products

8. Memory Film Studio
9. Memory Universe Atlas 360
10. Memory Topology Lab
11. Memory Graph Observatory
12. Cosmic Video Memory Atlas
13. Video Memory Lore Map
14. Memory Pulse Dashboard -> Overview
15. Memory Scene Recipe Library -> Studio
16. Memory Window Composer -> Studio

### Route outcome

**16 candidates do not become 16 routes. They collapse into Discovery, Overview, Public Story, Graph, Replay, Studio, and the existing Cinematic surface.**

### Final marker

`B_TRACK_ADOPTION_GATE_FINAL`
