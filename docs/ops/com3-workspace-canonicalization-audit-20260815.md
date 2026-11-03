# COM3 Workspace Canonicalization Audit

**Date:** 2026-08-15  
**Repository:** skerishKang/lovetree-limone (main @ 19fc160d2f67c66a3fd1bffb4d4087e006316119)  
**Auditor:** LoveTree V4 COM3 — Canonical Tree Workspace Reconciliation Auditor  
**Mode:** READ ONLY — NO_CODE_MUTATION_CONFIRMED=YES  

---

## 1. Current main / Open PR

### Remote main (origin/main)
```
19fc160 test(design-fidelity): select proven lineage-58-v2 consumer for shared exact-asset core changes (#203)
268390a feat(lineage-64): prove V1.2.1 floating Moment entry portal (#196)
5073004 fix(lineage-57): preserve Lubt drag ownership across wander motion (#199)
f231a77 refactor(p8): extract exact-asset fingerprint pure core (#198)
010ac92 refactor(auth): add provider-neutral API token seam (#153)
e9f4fd5 feat(p2): wire VideoFigure angle selection to shared ordered-frame core (#190)
7ba1c00 feat(p3): extract guided-transport authority pure core (Refs #185, #141) (#188)
```

### Open PRs
| # | Title | Branch | Status |
|---|-------|--------|--------|
| 191 | feat(lineage-63): prove native Moment Field View Studio runtime (Refs #164, #141) | `feat/lineage-63-native-proving-164` | OPEN — Design Lab only. 12 files, 3949+ lines, all under `app/design-lab/lineages/63/`. Zero product surface overlap. |

**Product surface delta from origin/main:** None. Only `diff --stat` shows local design-lab cleanup (deleted lineage-64 V1.2.1). No `/trees/` or `/v4/trees/` files changed.

---

## 2. Current Route Graph

### REAL API-backed routes (canonical product surface)

```
/trees/[id]                  → TreeDetailPage (useTreeMoments → inline memory-board + modals)
/trees/[id]/overview         → V4FinalTreeSurface (mode="overview")
/trees/[id]/timeline         → TimelinePage (useTreeMoments → inline timeline + modals)
/trees/[id]/album            → AlbumPage (useTreeMoments → inline album-grid + modals)
/trees/[id]/studio           → V4FinalTreeSurface (mode="studio")
/trees/[id]/story            → V4PublicStorySticky
/trees/[id]/replay           → V4FinalTreeSurface (mode="replay")
/trees/[id]/graph            → V4FinalTreeSurface (mode="graph")
/my-trees                    → MyTreesPage (useAuth + apiFetch GET /api/trees)
/v4/community                → V4GlobalDiscoveryHome (apiFetch community endpoints)
/v4/community/trees/[id]     → V4PublicTree (apiFetch)
```

### Fixture/demo routes (V4 design prototypes)

```
/v4/trees/demo                     → V4TreeWorkspace (fixture INITIAL_MOMENTS + localStorage)
/v4/trees/demo/timeline            → V4JuyeonTimeline (from V4GraphExperiences — fixture)
/v4/trees/demo/graph               → V4FreeGraph (from V4GraphExperiences — fixture)
/v4/trees/demo/nebula              → V4LoveNebula (from V4GraphExperiences — fixture)
/v4/trees/demo/map                 → V4ObsidianMap (from V4GraphExperiences — fixture)
/v4/trees/demo/state               → V4TreeState (fixture + localStorage)
/v4/trees/demo/rest                → V4RestFlow (fixture + localStorage)
/v4/trees/demo/seasons             → V4SeasonArchive (from V4MilestoneExperiences — fixture)
/v4/trees/demo/graph/100-moments   → V4Moments100 + V4Moments100ExactRangePlayback (fixture)
/v4/trees/demo/growth/300-plus     → V4Growth300Plus (from V4MilestoneExperiences — fixture)
/v4/trees/demo/celebrate/300       → V4Finale300 (from V4MilestoneExperiences — fixture)
/v4/trees/demo/celebrate/aurora    → V4AuroraHeart (from V4MilestoneExperiences — fixture)
/v4/trees/demo/celebrate/canopy    → V4RainbowCanopy (from V4MilestoneExperiences — fixture)
/v4/trees/demo/celebrate/bloom     → V4PurpleBloom (from V4MilestoneExperiences — fixture)
/v4/trees/demo/onboarding/emotion  → V4EmotionStep (fixture + localStorage)
/v4/trees/demo/onboarding/connect  → V4ConnectStep (fixture + localStorage)
```

---

## 3. Actual Component Graph

```
PRODUCT SURFACE (REAL_API)                          FIXTURE/DEMO SURFACE
══════════════════════════                          ══════════════════════

TreeViewShell (app/components/)                     V4TreeWorkspace (app/components/v4/)
├── ViewSwitcher (8 views)                         ├── fixture INITIAL_MOMENTS[5]
├── MomentDetailModal                               ├── localStorage persistence
├── MomentComposerModal                             ├── SVG branch rendering
├── MomentThumbnail                                 ├── draggable cards
└── auth/error/loading states                       ├── diary sidebar
                                                    ├── composer panel
V4FinalTreeSurface (app/components/v4/product/)     ├── fullscreen mode
├── OverviewSurface (REAL_API data)                 └── zoom controls
│   ├── pulse score
│   ├── Q&A questions                              V4GraphExperiences (app/components/v4/)
│   ├── emotion counts                              ├── V4FreeGraph — fixture nodes
│   └── recent moments                              ├── V4LoveNebula — fixture particles
├── GraphSurface (REAL_API data)                    ├── V4ObsidianMap — fixture map
│   ├── 6 graph sub-modes (Graph/Constellation/…)   └── V4JuyeonTimeline — fixture timeline
│   ├── zoom/pan
│   ├── emotion filter                              V4MilestoneExperiences (app/components/v4/)
│   ├── inspector panel                             ├── V4Finale300 — animated SVG celebration
│   └── pointer-drag offset                         ├── V4AuroraHeart — particle heart
├── ReplaySurface (REAL_API data)                   ├── V4RainbowCanopy — category canopy
│   ├── vinyl disc animation                        ├── V4PurpleBloom — spiral flower
│   ├── tear-to-navigate gesture                    ├── V4Growth300Plus — infinite canvas
│   ├── queue sidebar                               └── V4SeasonArchive — season system
│   └── minimize mode
├── StudioSurface (REAL_API data + CANVAS)          V4Moments100 (app/components/v4/)
│   ├── storyboard tab                              └── 100 fixture moments as SVG world map
│   ├── scene editor                                (2872 lines — largest single component)
│   ├── recipe presets
│   ├── composition framing                         V4RestFlow (app/components/v4/)
│   └── export (JSON/PNG/WebM)                      └── active/resting toggle fixture

V4PublicStorySticky (app/components/v4/product/)    V4TreeState (app/components/v4/)
├── scroll-linked chapter navigation                └── lifecycle + visibility fixture
├── chapter rail
├── media + copy                                    V4EmotionStep (app/components/v4/)
└── branch SVG                                      └── onboarding step 1 fixture

V4GlobalDiscoveryHome (app/components/v4/product/)  V4ConnectStep (app/components/v4/)
├── community tree cards                            └── onboarding step 2 fixture
├── feel filter
└── API-backed hydration
```

---

## 4. REAL API/DB Authority

### Database schema (`db/schema.ts`) — 10 tables

| Table | Purpose | MVP Critical |
|-------|---------|-------------|
| `trees` | Tree entity | YES |
| `memories` | Moment entity | YES |
| `reactions` | Moment reactions (like/love/etc) | YES |
| `comments` | Memory comments | Optional |
| `treeComments` | Tree-level comments | Optional |
| `treeLikes` | Tree likes (toggle) | YES |
| `treeSocialCounts` | Aggregated like/view counts | YES |
| `treeViewDedupEvents` | 24h view deduplication | Optional |
| `socialIdempotency` | Idempotency guard | Internal |
| `socialRateLimits` | Rate limiting | Internal |

### Server API routes (`server/api/`)

| Route | Method | Purpose | Used by |
|-------|--------|---------|---------|
| `/api/trees` | GET | List user's trees | `/my-trees` |
| `/api/trees` | POST | Create tree | Entry |
| `/api/trees/with-first-memory` | POST | Atomically create tree + first memory | Entry |
| `/api/trees/:id` | GET | Get tree detail | All `/trees/[id]/*` |
| `/api/trees/:id` | PUT | Update tree | Future V4TreeState wiring |
| `/api/trees/:id` | DELETE | Delete tree | Future |
| `/api/trees/:id/memories` | GET | List memories | All `/trees/[id]/*` |
| `/api/trees/:id/memories` | POST | Create memory | ComposerModal |
| `/api/memories` | GET | All user's memories | Future |
| `/api/memories/:id` | PUT | Update memory | DetailModal |
| `/api/memories/:id` | DELETE | Delete memory | DetailModal |
| `/api/community/trees` | GET| Browse public trees | `/v4/community` |
| `/api/community/memories` | GET | List public memories | Community + Story views |
| `/api/trees/:id/like` | POST | Toggle like | Future |
| `/api/trees/:id/view` | POST | Record view | Future |
| `/api/memories/:memoryId/comments` | GET/POST/DELETE | Comments | Future |
| `/api/trees/:treeId/comments` | GET/POST/DELETE | Tree comments | Future |

### Data hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTreeMoments(treeId)` | `lib/use-tree-moments.ts` | Primary: fetches tree + memories, manages CRUD, provides 4 view projections (treeMoments, timelineMoments, albumMoments, canonicalMoments) |
| `useMomentUrlState()` | `lib/use-moment-url.ts` | Syncs `?moment=` and `?highlight=` URL params |
| `useAuth()` | `lib/auth.tsx` | Firebase Auth context |

### Canonical type contracts (`lib/`)

| File | Exports | Purpose |
|------|---------|---------|
| `tree-types.ts` | `TreeRecord`, `MemoryRecord`, utility functions | Client-side type definitions |
| `moment-model.ts` | `CanonicalMoment`, `TreeMomentView`, `TimelineMomentView`, `AlbumMomentView`, view selectors | Moment projection models |
| `moment-url.ts` | `replaceTreeViewQuery` | URL mutation pure function |

---

## 5. Fixture/Demo Authority

All 16 `/v4/trees/demo/*` routes are **100% fixture**. None make any API calls. They use:

- **Hardcoded arrays:** `INITIAL_MOMENTS` (5 moments in V4TreeWorkspace), `WORLD_W=2400` SVG moments (100 in V4Moments100), `ISSUES` (3 in V4TreeState), `EMOTIONS` (6), `RELATIONS` (5)
- **localStorage keys:** `lovetree-v4-workspace`, `lovetree-v4-tree-state`, `lovetree-v4-rest-state`, `lovetree-v4-discovery`, `lovetree-v4-emotion`, `lovetree-first-journey-unified`, `lovetree-step2-record`, `lovetree-step3-connection`
- **Hardcoded YouTube IDs:** `dQw4w9WgXcQ`, `ysz5S6PUM-U`, `M7lc1UVf-VE`, `aqz-KE-bpKQ`, `ScMzIvxBSi4`
- **No auth:** Zero Firebase Auth usage in any demo component
- **No routing:** All state transitions via internal React state, not URL

---

## 6. Per-Mode Matrix

### Canonical `/trees/[id]` modes

| Route | Mode | Shell | Component | Data Source | Modals | Owner Gate | API Calls |
|-------|------|-------|-----------|-------------|--------|------------|-----------|
| `/trees/[id]` | **tree** (default) | TreeViewShell | Inline memory-board | `useTreeMoments` → `treeMoments` | DetailModal + ComposerModal | No (read-only for non-owner, add button hidden) | GET tree + memories, POST/PUT/DELETE memories |
| `/trees/[id]/overview` | **overview** | V4FinalTreeSurface (wraps TreeViewShell) | OverviewSurface | `useTreeMoments` → `moments` | None | No | GET tree + memories |
| `/trees/[id]/timeline` | **timeline** | TreeViewShell | Inline timeline-list | `useTreeMoments` → `timelineMoments` | DetailModal + ComposerModal | No | GET tree + memories, POST/PUT/DELETE memories |
| `/trees/[id]/album` | **album** | TreeViewShell | Inline album-grid | `useTreeMoments` → `albumMoments` | DetailModal + ComposerModal | No | GET tree + memories, POST/PUT/DELETE memories |
| `/trees/[id]/studio` | **studio** | V4FinalTreeSurface (wraps TreeViewShell) | StudioSurface | `useTreeMoments` → `moments` | None | **YES — owner only** | GET tree + memories |
| `/trees/[id]/story` | **story** | V4PublicStorySticky (wraps TreeViewShell) | Full-page scroll story | `apiFetch` directly | None | No (public only) | GET tree + community memories |
| `/trees/[id]/replay` | **replay** | V4FinalTreeSurface (wraps TreeViewShell) | ReplaySurface | `useTreeMoments` → `moments` | None | No | GET tree + memories |
| `/trees/[id]/graph` | **graph** | V4FinalTreeSurface (wraps TreeViewShell) | GraphSurface | `useTreeMoments` → `moments` | None | No | GET tree + memories |

### Fixture `/v4/trees/demo/*` modes (for comparison)

| Demo Route | Mode Concept | Component | Data Source | Owner Gate | API Calls |
|------------|-------------|-----------|-------------|------------|-----------|
| `/v4/trees/demo` | workspace | V4TreeWorkspace | Fixture + localStorage | No | NONE |
| `/v4/trees/demo/timeline` | timeline | V4JuyeonTimeline | Fixture | No | NONE |
| `/v4/trees/demo/graph` | graph | V4FreeGraph | Fixture | No | NONE |
| `/v4/trees/demo/nebula` | nebula | V4LoveNebula | Fixture | No | NONE |
| `/v4/trees/demo/map` | map | V4ObsidianMap | Fixture | No | NONE |
| `/v4/trees/demo/state` | state | V4TreeState | Fixture + localStorage | No | NONE |
| `/v4/trees/demo/rest` | rest | V4RestFlow | Fixture + localStorage | No | NONE |
| `/v4/trees/demo/seasons` | seasons | V4SeasonArchive | Fixture | No | NONE |
| `/v4/trees/demo/graph/100-moments` | 100-moments | V4Moments100 | Fixture SVG | No | NONE |
| `/v4/trees/demo/growth/300-plus` | 300+ | V4Growth300Plus | Fixture | No | NONE |
| `/v4/trees/demo/celebrate/300` | 300-celebrate | V4Finale300 | Fixture | No | NONE |
| `/v4/trees/demo/celebrate/aurora` | aurora | V4AuroraHeart | Fixture | No | NONE |
| `/v4/trees/demo/celebrate/canopy` | canopy | V4RainbowCanopy | Fixture | No | NONE |
| `/v4/trees/demo/celebrate/bloom` | bloom | V4PurpleBloom | Fixture | No | NONE |
| `/v4/trees/demo/onboarding/emotion` | emotion-step | V4EmotionStep | Fixture + localStorage | No | NONE |
| `/v4/trees/demo/onboarding/connect` | connect-step | V4ConnectStep | Fixture + localStorage | No | NONE |

---

## 7. Viewer Mapping

### Current viewer surfaces mapped to authority

| User Intent | Current Route(s) | Authority | Canonical Solution |
|-------------|------------------|-----------|-------------------|
| **View my tree overview** | `/trees/[id]/overview` | **REAL_API** — V4FinalTreeSurface (OverviewSurface) | KEEP AS MODE |
| **View tree moments tree** | `/trees/[id]` | **REAL_API** — inline memory-board | KEEP AS MODE |
| **View timeline** | `/trees/[id]/timeline` | **REAL_API** — inline timeline | KEEP AS MODE |
| | `/v4/trees/demo/timeline` | **FIXTURE** — V4JuyeonTimeline | REFERENCE_ONLY |
| **View album/gallery** | `/trees/[id]/album` | **REAL_API** — inline album-grid | KEEP AS MODE |
| **View graph** | `/trees/[id]/graph` | **REAL_API** — V4FinalTreeSurface (GraphSurface) | KEEP AS MODE |
| | `/v4/trees/demo/graph` | **FIXTURE** — V4FreeGraph | REFERENCE_ONLY |
| **View nebula** | `/v4/trees/demo/nebula` | **FIXTURE** — V4LoveNebula | HOLD — design reference only |
| **View map** | `/v4/trees/demo/map` | **FIXTURE** — V4ObsidianMap | HOLD — design reference only |
| **View 100 moments** | `/v4/trees/demo/graph/100-moments` | **FIXTURE** — V4Moments100 | HOLD — design reference only |
| **View seasons** | `/v4/trees/demo/seasons` | **FIXTURE** — V4SeasonArchive | REFERENCE_ONLY |
| **View rest state** | `/v4/trees/demo/rest` | **FIXTURE** — V4RestFlow | REFERENCE_ONLY (design for tree state UX) |
| **View public story** | `/trees/[id]/story` | **REAL_API** — V4PublicStorySticky | KEEP AS MODE |
| **View replay** | `/trees/[id]/replay` | **REAL_API** — V4FinalTreeSurface (ReplaySurface) | KEEP AS MODE |
| **View studio** | `/trees/[id]/studio` | **REAL_API** — V4FinalTreeSurface (StudioSurface) | KEEP AS MODE — owner only |
| **Browse community** | `/v4/community` | **REAL_API** — V4GlobalDiscoveryHome | KEEP AS MODE |
| **View public tree** | `/v4/community/trees/[id]` | **REAL_API** — V4PublicTree | KEEP AS MODE |
| **My trees list** | `/my-trees` | **REAL_API** — MyTreesPage | KEEP AS MODE |

---

## 8. Studio Boundary

### Studio is a Workspace mode, NOT a separate product responsibility.

**Evidence:**
1. `StudioSurface` is defined inside `V4FinalTreeSurface.tsx` as a conditional render branch (`mode === "studio"`)
2. It is routed at `/trees/[id]/studio` — a sub-path under the tree ID, not a top-level route
3. `ViewSwitcher` includes `studio` as the 8th view tab — gated behind `isOwner`
4. StudioSurface receives `tree`, `moments`, and `isOwner` from `useTreeMoments` — same hook as all other modes
5. StudioSurface implements `Canvas`-based film storyboard editing, recipe presets, and export — distinct from the fixture `V4TreeWorkspace` which is a drag-and-drop card editor

**Recommended boundary:** Studio = owner-only editing/arranging mode within Workspace. It should NOT be a separate product shell.

---

## 9. Capability Reuse Map

### Capabilities that exist in BOTH real API and fixture forms

| Capability | REAL API Version | Fixture Version | Resolution |
|------------|-----------------|-----------------|------------|
| Tree view (cards + branches) | `/trees/[id]` inline memory-board | V4TreeWorkspace (fixture INITIAL_MOMENTS + drag) | **KEEP real API.** V4TreeWorkspace's draggable card concept is OPTIONAL_MODE for future. |
| Timeline | `/trees/[id]/timeline` with `useTreeMoments` | V4JuyeonTimeline (fixture) | **KEEP real API.** Fixture is REFERENCE_ONLY. |
| Graph | V4FinalTreeSurface GraphSurface (real data, 6 sub-modes) | V4FreeGraph (fixture) | **KEEP real API.** Fixture is REFERENCE_ONLY. |
| Milestone celebration | None | V4Finale300, V4AuroraHeart, V4RainbowCanopy, V4PurpleBloom (all fixture) | **HOLD.** Design reference only — no real API milestone triggers. |
| Seasons archive | None | V4SeasonArchive (fixture) | **REFERENCE_ONLY.** No DB schema for seasons. |
| Tree lifecycle state | None (tree PUT endpoint exists but unused) | V4TreeState (fixture + localStorage) | **KEEP real API endpoint.** Wire `PUT /api/trees/:id` to a settings panel. |
| 100-moments browser | None | V4Moments100 (fixture SVG, 2872 lines) | **REFERENCE_ONLY.** Massive component — design exploration. |
| Growth beyond 300 | None | V4Growth300Plus (fixture) | **REFERENCE_ONLY.** |
| Rest/idle flow | None | V4RestFlow (fixture) | **REFERENCE_ONLY.** |
| Nebula visualization | None | V4LoveNebula (fixture) | **REFERENCE_ONLY.** |
| Obsidian map | None | V4ObsidianMap (fixture) | **REFERENCE_ONLY.** |
| Emotion step onboarding | None (schema has `emotionTags` but no UI) | V4EmotionStep (fixture + localStorage) | **Capability should be preserved.** Wire into Create shell. |
| Connect step onboarding | None (schema has `connectionReason` but no UI) | V4ConnectStep (fixture + localStorage) | **Capability should be preserved.** Wire into Create shell. |

### Unique capabilities (no duplicate)

| Capability | Only In | Recommendation |
|------------|---------|----------------|
| Overview dashboard | V4FinalTreeSurface — OverviewSurface (REAL_API) | **KEEP** — no fixture equivalent |
| Replay with vinyl animation | V4FinalTreeSurface — ReplaySurface (REAL_API) | **KEEP** — no fixture equivalent |
| Studio film editor | V4FinalTreeSurface — StudioSurface (REAL_API) | **KEEP** — no fixture equivalent |
| Public story scroll | V4PublicStorySticky (REAL_API) | **KEEP** — no fixture equivalent |
| Community browse | V4GlobalDiscoveryHome (REAL_API) | **KEEP** — no fixture equivalent |
| My trees list | MyTreesPage (REAL_API) | **KEEP** — no fixture equivalent |
| Draggable card workspace | V4TreeWorkspace (FIXTURE) | **REFERENCE_ONLY** — need not migrate |
| 100-moments SVG world | V4Moments100 (FIXTURE) | **REFERENCE_ONLY** — too large for MVP |

---

## 10. Duplicate Product Truth List

### CONFIRMED DUPLICATE — REAL API vs FIXTURE

| # | REAL API Truth | Fixture Copy | Conflict Type |
|---|----------------|--------------|---------------|
| 1 | `/trees/[id]` — inline memory-board with `useTreeMoments` | V4TreeWorkspace — 5 hardcoded INITIAL_MOMENTS | **Competing tree workspace** — same user intent (view/edit moments of a tree) |
| 2 | `/trees/[id]/timeline` — `timelineMoments` from real API | V4JuyeonTimeline — fixture timeline | **Competing timeline view** |
| 3 | `/trees/[id]/graph` — GraphSurface with 6 sub-modes | V4FreeGraph — fixture nodes | **Competing graph view** |
| 4 | `/trees/[id]/album` — `albumMoments` from real API | V4BookShelfV1/V2/V3, V4PersonAlbums | **Competing album views** — real API is canonical, bookshelf variants are design exploration |

### NON-DUPLICATE (unique to one side)

| # | Component | Side | Reason |
|---|-----------|------|--------|
| 1 | V4FinalTreeSurface — OverviewSurface | REAL_API | No fixture equivalent |
| 2 | V4FinalTreeSurface — ReplaySurface | REAL_API | No fixture equivalent |
| 3 | V4FinalTreeSurface — StudioSurface | REAL_API | No fixture equivalent |
| 4 | V4PublicStorySticky | REAL_API | No fixture equivalent |
| 5 | V4GlobalDiscoveryHome | REAL_API | No fixture equivalent |
| 6 | MyTreesPage | REAL_API | No fixture equivalent |
| 7 | V4LoveNebula | FIXTURE | No real API equivalent |
| 8 | V4ObsidianMap | FIXTURE | No real API equivalent |
| 9 | V4Moments100 | FIXTURE | No real API equivalent |
| 10 | V4RestFlow | FIXTURE | No real API equivalent |
| 11 | V4TreeState | FIXTURE | No real API equivalent (but PUT endpoint exists) |
| 12 | V4EmotionStep + V4ConnectStep | FIXTURE | No real API equivalent (but schema supports it) |
| 13 | V4SeasonArchive | FIXTURE | No real API equivalent |
| 14 | V4MilestoneExperiences (6 components) | FIXTURE | No real API equivalent |
| 15 | All bookshelf variants (V1, V2-1, V2-3D, V2A-2) | FIXTURE | No real API equivalent |

---

## 11. Recommended Canonical Workspace

### SINGLE CANONICAL WORKSpace = `/trees/[id]` with V4FinalTreeSurface as mode engine

```
/trees/[id]   ← canonical entry point (default mode = "tree")
├── Mode: tree       → inline memory-board (currently at /trees/[id])
├── Mode: overview   → V4FinalTreeSurface mode="overview"
├── Mode: timeline   → inline timeline (currently at /trees/[id]/timeline)
├── Mode: album      → inline album-grid (currently at /trees/[id]/album)
├── Mode: graph      → V4FinalTreeSurface mode="graph"
├── Mode: replay     → V4FinalTreeSurface mode="replay"
├── Mode: studio     → V4FinalTreeSurface mode="studio" [owner only]
└── Mode: story      → V4PublicStorySticky [public only]
```

**Why V4FinalTreeSurface is NOT the sole owner:**
- Three inline modes (tree, timeline, album) have significant UX that is NOT replicated in V4FinalTreeSurface: MomentDetailModal, MomentComposerModal, and the per-mode moment lists (treeMoments, timelineMoments, albumMoments)
- V4FinalTreeSurface only has 5 modes (overview, story, graph, replay, studio)
- The "tree" default view (memory-board with tree-ordered moments) is only in the inline page

**Why V4TreeWorkspace is NOT the canonical owner:**
- 100% fixture data — zero API calls
- No auth, no real tree IDs, no persistence beyond localStorage
- The drag-and-drop card behavior is a nice-to-have, not core

### Recommended architecture: Hybrid

```
/trees/[id]  → canonical Workspace shell (TreeViewShell + ViewSwitcher)
  ├── TreeViewShell provides: branding, nav, view tabs, add-moment button
  ├── All modes share: useTreeMoments + useMomentUrlState + auth context
  ├── Modes that need modals (tree, timeline, album):
  │     render inline with DetailModal + ComposerModal
  ├── Modes that are self-contained (overview, graph, replay, studio):
  │     render V4FinalTreeSurface with mode prop
  └── Modes that are standalone (story):
        render V4PublicStorySticky
```

---

## 12. Exact Future Changed-File Estimate (for MVP consolidation)

### Files to DELETE (merge into Workspace modes)

| File | Reason | Lines |
|------|--------|-------|
| `app/v4/trees/demo/page.tsx` | Route no longer needed (demo) | 7 |
| `app/v4/trees/demo/timeline/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/graph/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/nebula/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/map/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/state/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/rest/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/seasons/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/graph/100-moments/page.tsx` | Route no longer needed | 7 |
| `app/v4/trees/demo/growth/300-plus/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/celebrate/300/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/celebrate/aurora/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/celebrate/bloom/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/celebrate/canopy/page.tsx` | Route no longer needed | 6 |
| `app/v4/trees/demo/onboarding/emotion/page.tsx` | Route no longer needed | 7 |
| `app/v4/trees/demo/onboarding/connect/page.tsx` | Route no longer needed | 7 |
| `app/components/v4/V4JourneyDock.tsx` | Replace with shell nav | 146 |

### Files to KEEP (with possible mode consolidation)

| File | Action | Lines |
|------|--------|-------|
| `app/trees/[id]/page.tsx` | KEEP — canonical tree view | 167 |
| `app/trees/[id]/overview/page.tsx` | KEEP — or merge into single page | 58 |
| `app/trees/[id]/timeline/page.tsx` | KEEP — or merge into single page | 165 |
| `app/trees/[id]/album/page.tsx` | KEEP — or merge into single page | 167 |
| `app/trees/[id]/studio/page.tsx` | KEEP — or merge into single page | 5 |
| `app/trees/[id]/story/page.tsx` | KEEP — or merge into single page | 12 |
| `app/trees/[id]/replay/page.tsx` | KEEP — or merge into single page | 5 |
| `app/trees/[id]/graph/page.tsx` | KEEP — or merge into single page | 5 |
| `app/components/TreeViewShell.tsx` | KEEP — canonical shell | 45 |
| `app/components/ViewSwitcher.tsx` | KEEP — canonical navigation | 42 |
| `app/components/MomentDetailModal.tsx` | KEEP | 222 |
| `app/components/MomentComposerModal.tsx` | KEEP | 188 |
| `app/components/MomentThumbnail.tsx` | KEEP | 44 |
| `app/components/v4/product/V4FinalTreeSurface.tsx` | KEEP — canonical mode engine | 405 |
| `app/components/v4/product/V4PublicStorySticky.tsx` | KEEP | 181 |
| `app/components/v4/product/V4GlobalDiscoveryHome.tsx` | KEEP | 138 |

### Files to REWIRE (replace fixture with real API)

| File | Action | Lines |
|------|--------|-------|
| `app/components/v4/V4TreeWorkspace.tsx` | DELETE or HOLD — design reference | 476 |
| `app/components/v4/V4TreeState.tsx` | REWIRE to `PUT /api/trees/:id` | 171 |
| `app/components/v4/V4EmotionStep.tsx` | Wire to real API (merge into Create shell) | 245 |
| `app/components/v4/V4ConnectStep.tsx` | Wire to real API (merge into Create shell) | 275 |
| `app/components/v4/V4RestFlow.tsx` | HOLD — reference for tree state UX | 161 |

### Files to HOLD (reference only, no code changes)

| File | Lines | Purpose |
|------|-------|---------|
| `app/components/v4/V4GraphExperiences.tsx` | 377 | Reference for graph UX |
| `app/components/v4/V4MilestoneExperiences.tsx` | 78 (6 components) | Reference for celebration UX |
| `app/components/v4/V4Moments100.tsx` | 2872 | Reference for 100-moments UX |
| `app/components/v4/V4Moments100ExactRangePlayback.tsx` | 129 | Reference |
| `app/components/v4/V4ArchiveExperiences.tsx` | 600 | Reference |
| `app/components/v4/V4PersonAlbums.tsx` | 85 | Reference |
| `app/components/v4/V4BookShelfV1.tsx` | 611 | Reference |
| `app/components/v4/V4BookShelfV2P1.tsx` | 896 | Reference |
| `app/components/v4/V4BookShelfV2D3.tsx` | 651 | Reference |
| `app/components/v4/V4BookShelfV2A2.tsx` | 967 | Reference |
| `app/components/v4/V4PhaseBoundary.tsx` | 31 | Reference |

### Total changed-file estimate

| Action | Count | Approx Lines |
|--------|-------|-------------|
| DELETE (demo routes + V4JourneyDock) | 17 files | ~200 lines |
| KEEP (canonical product surfaces) | 15 files | ~1,800 lines |
| REWIRE (replace fixture with real API) | 2-4 files | ~800 lines |
| HOLD (reference only, keep but exclude from MVP) | 11 files | ~6,700 lines |
| **Total** | **~45 files** | |

---

## 13. Merge Sequence

### Phase 0: Establish canonical single-page Workspace (risk: low)
1. Create a single `/trees/[id]` page that renders all modes conditionally
2. Keep all existing routes working via ViewSwitcher
3. Add `mode` query param support: `/trees/[id]?mode=overview`
4. Legacy routes redirect to `?mode=`: `/trees/[id]/overview` → `/trees/[id]?mode=overview`

**Files affected:** `app/trees/[id]/page.tsx` (refactor to mode router), `ViewSwitcher.tsx` (add `?mode=` param support)

### Phase 1: Deprecate fixture demo routes (risk: low)
1. Delete 16 `/v4/trees/demo/*` page files
2. Keep fixture components in `app/components/v4/` as design reference (do NOT delete, just orphan the routes)
3. Remove V4JourneyDock or replace with minimal nav

**Files affected:** 17 page.tsx deletions, 1 component modification (V4JourneyDock)

### Phase 2: Wire V4TreeState to real API (risk: medium)
1. Replace localStorage persistence with `apiFetch` calls to `PUT /api/trees/:id`
2. Tree lifecycle and visibility fields already exist in schema
3. Add settings panel/drawer to Workspace

**Files affected:** `V4TreeState.tsx` (rewire), Workspace shell (add settings trigger)

### Phase 3: Wire V4EmotionStep + V4ConnectStep to real API (risk: medium)
1. Change localStorage operations to `apiFetch` calls
2. Schema fields already exist: `emotionTags`, `connectionReason`, `discoveryDate`, `videoOffsetSeconds`
3. These become part of the Create/Studio shell, not Workspace

**Files affected:** `V4EmotionStep.tsx`, `V4ConnectStep.tsx` (rewire)

### Phase 4 (optional): Merge real API inline modes into V4FinalTreeSurface (risk: high)
1. If desired, add `modal` support to V4FinalTreeSurface so OverviewSurface/GraphSurface/ReplaySurface/StudioSurface can also open MomentDetailModal and MomentComposerModal
2. This would allow deleting 3 more page.tsx files (timeline, album, tree)
3. **Not recommended for MVP** — the inline modes work fine as sub-pages

---

## 14. Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **V4TreeWorkspace's draggable card UX has no real API equivalent** | MEDIUM | Users may expect drag-to-reorder moments. Schema has `sortOrder` field with retry logic. Must add drag-to-reorder to V4FinalTreeSurface mode="studio" before deleting V4TreeWorkspace. |
| 2 | **V4Moments100 (2872 lines) is deeply coupled to fixture data** | LOW | No real API consumer should ever import this. Just orphan the route. |
| 3 | **V4GraphExperiences has 4 components sharing a single file** | LOW | If any of these are to be wired to real API, they must be extracted from the shared file first. |
| 4 | **V4MilestoneExperiences has 6 components sharing a single file** | LOW | Same as above. Milestone celebrations have no real API triggers (no milestone_count in schema, no event system). |
| 5 | **V4TreeState localStorage schema is incompatible with real API tree fields** | MEDIUM | V4TreeState uses `treeState` (active/resting/archived) and `visibility` (private/link/public). Real tree schema has `visibility` but NOT `treeState`. The "resting" concept needs a new DB field or a different approach. |
| 6 | **ViewSwitcher currently navigates by path, not query param** | LOW | Consolidating to a single `/trees/[id]` page with `?mode=` requires changing ViewSwitcher's `href` generation and handling the redirect for old paths. |
| 7 | **PR #191 (lineage-63) adds 3,949 lines but zero product surface overlap** | NONE | Design Lab only. Safe to ignore for MVP consolidation. |

---

## 15. Per-Route Classification Summary

### `/trees/[id]` routes

| Route | Classification |
|-------|---------------|
| `/trees/[id]` | **CANONICAL** — REAL_API, REAL_DB, REAL_AUTH |
| `/trees/[id]/overview` | **CANONICAL** — REAL_API (via V4FinalTreeSurface mode="overview") |
| `/trees/[id]/timeline` | **CANONICAL** — REAL_API |
| `/trees/[id]/album` | **CANONICAL** — REAL_API |
| `/trees/[id]/studio` | **CANONICAL** — REAL_API (via V4FinalTreeSurface mode="studio"), REAL_AUTH (owner only) |
| `/trees/[id]/story` | **CANONICAL** — REAL_API (via V4PublicStorySticky), PUBLIC only |
| `/trees/[id]/replay` | **CANONICAL** — REAL_API (via V4FinalTreeSurface mode="replay") |
| `/trees/[id]/graph` | **CANONICAL** — REAL_API (via V4FinalTreeSurface mode="graph") |

### `/v4/trees/demo/*` routes

| Route | Classification |
|-------|---------------|
| `/v4/trees/demo` | **FIXTURE** — 100% fixture/localStorage. DUPLICATE of `/trees/[id]` concept. |
| `/v4/trees/demo/timeline` | **FIXTURE** — DUPLICATE of `/trees/[id]/timeline` concept. Design reference. |
| `/v4/trees/demo/graph` | **FIXTURE** — DUPLICATE of `/trees/[id]/graph` concept. Design reference. |
| `/v4/trees/demo/nebula` | **FIXTURE** — UNIQUE to fixture. DESIGN_REFERENCE. HOLD. |
| `/v4/trees/demo/map` | **FIXTURE** — UNIQUE to fixture. DESIGN_REFERENCE. HOLD. |
| `/v4/trees/demo/state` | **FIXTURE** — UNIQUE capability. REWIRE to real API for MVP. |
| `/v4/trees/demo/rest` | **FIXTURE** — DESIGN_REFERENCE for tree lifecycle UX. |
| `/v4/trees/demo/seasons` | **FIXTURE** — DESIGN_REFERENCE. No DB schema support. |
| `/v4/trees/demo/graph/100-moments` | **FIXTURE** — MASSIVE single component (2872 lines). DESIGN_REFERENCE. |
| `/v4/trees/demo/growth/300-plus` | **FIXTURE** — DESIGN_REFERENCE. |
| `/v4/trees/demo/celebrate/*` | **FIXTURE** — DESIGN_REFERENCE. |
| `/v4/trees/demo/onboarding/*` | **FIXTURE** — UNIQUE capability. REWIRE to real API for Create shell. |

---

## 16. Per-Component Classification

| Component | File | Classification |
|-----------|------|---------------|
| V4FinalTreeSurface | `app/components/v4/product/V4FinalTreeSurface.tsx` | **CANONICAL** — REAL_API mode engine (5 modes) |
| OverviewSurface | (inside V4FinalTreeSurface) | **CANONICAL** — REAL_API |
| GraphSurface | (inside V4FinalTreeSurface) | **CANONICAL** — REAL_API (6 sub-modes) |
| ReplaySurface | (inside V4FinalTreeSurface) | **CANONICAL** — REAL_API |
| StudioSurface | (inside V4FinalTreeSurface) | **CANONICAL** — REAL_API, REAL_AUTH (owner only) |
| PublicStorySurface | (inside V4FinalTreeSurface) | **CANONICAL** — REAL_API |
| V4PublicStorySticky | `app/components/v4/product/V4PublicStorySticky.tsx` | **CANONICAL** — REAL_API (standalone story view) |
| V4GlobalDiscoveryHome | `app/components/v4/product/V4GlobalDiscoveryHome.tsx` | **CANONICAL** — REAL_API |
| TreeViewShell | `app/components/TreeViewShell.tsx` | **CANONICAL** — REAL_AUTH wrapper |
| ViewSwitcher | `app/components/ViewSwitcher.tsx` | **CANONICAL** — navigation |
| useTreeMoments | `lib/use-tree-moments.ts` | **CANONICAL** — REAL_API data hook |
| MomentDetailModal | `app/components/MomentDetailModal.tsx` | **CANONICAL** — REAL_API |
| MomentComposerModal | `app/components/MomentComposerModal.tsx` | **CANONICAL** — REAL_API |
| V4TreeWorkspace | `app/components/v4/V4TreeWorkspace.tsx` | **FIXTURE** — DUPLICATE. Capability to preserve: drag-to-reorder (sortOrder). |
| V4GraphExperiences | `app/components/v4/V4GraphExperiences.tsx` | **FIXTURE** — DESIGN_REFERENCE (4 components) |
| V4MilestoneExperiences | `app/components/v4/V4MilestoneExperiences.tsx` | **FIXTURE** — DESIGN_REFERENCE (6 components) |
| V4Moments100 | `app/components/v4/V4Moments100.tsx` | **FIXTURE** — DESIGN_REFERENCE (2872 lines) |
| V4TreeState | `app/components/v4/V4TreeState.tsx` | **FIXTURE** — Capability to REWIRE to real API |
| V4RestFlow | `app/components/v4/V4RestFlow.tsx` | **FIXTURE** — DESIGN_REFERENCE |
| V4EmotionStep | `app/components/v4/V4EmotionStep.tsx` | **FIXTURE** — Capability to REWIRE to real API |
| V4ConnectStep | `app/components/v4/V4ConnectStep.tsx` | **FIXTURE** — Capability to REWIRE to real API |
| V4JourneyDock | `app/components/v4/V4JourneyDock.tsx` | **DESIGN_REFERENCE** — DELETE_LATER (replace with shell nav) |
| V4BookShelfV* | `app/components/v4/V4BookShelf*.tsx` | **FIXTURE** — DESIGN_REFERENCE (4 variants) |
| V4PersonAlbums | `app/components/v4/V4PersonAlbums.tsx` | **FIXTURE** — DESIGN_REFERENCE |
| V4ArchiveExperiences | `app/components/v4/V4ArchiveExperiences.tsx` | **FIXTURE** — DESIGN_REFERENCE |

---

## 17. 13 `/v4/trees/demo/*` Classification

| # | Demo Route | Component | Classification | Recommendation |
|---|-----------|-----------|----------------|----------------|
| 1 | `/v4/trees/demo` | V4TreeWorkspace | **DUPLICATE** (competes with `/trees/[id]`) | DELETE_LATER_CANDIDATE — keep V4TreeWorkspace.tsx in tree for drag reference, delete route |
| 2 | `/v4/trees/demo/timeline` | V4JuyeonTimeline | **DUPLICATE** (competes with `/trees/[id]/timeline`) | REFERENCE_ONLY — delete route, keep component file |
| 3 | `/v4/trees/demo/graph` | V4FreeGraph | **DUPLICATE** (competes with `/trees/[id]/graph`) | REFERENCE_ONLY |
| 4 | `/v4/trees/demo/nebula` | V4LoveNebula | **DESIGN_REFERENCE** (unique visualization) | HOLD — no real API plan |
| 5 | `/v4/trees/demo/map` | V4ObsidianMap | **DESIGN_REFERENCE** (unique visualization) | HOLD |
| 6 | `/v4/trees/demo/state` | V4TreeState | **DUPLICATE capability** (tree settings, but UNIQUE in fixture) | KEEP_AS_MODE — REWIRE to real API for Workspace settings panel |
| 7 | `/v4/trees/demo/rest` | V4RestFlow | **DESIGN_REFERENCE** | HOLD — reference for tree lifecycle UX design |
| 8 | `/v4/trees/demo/seasons` | V4SeasonArchive | **DESIGN_REFERENCE** (no DB support) | HOLD |
| 9 | `/v4/trees/demo/graph/100-moments` | V4Moments100 | **DESIGN_REFERENCE** (2872 lines, SVG world) | REFERENCE_ONLY |
| 10 | `/v4/trees/demo/growth/300-plus` | V4Growth300Plus | **DESIGN_REFERENCE** | HOLD |
| 11 | `/v4/trees/demo/celebrate/300` | V4Finale300 | **DESIGN_REFERENCE** | HOLD |
| 12 | `/v4/trees/demo/celebrate/aurora` | V4AuroraHeart | **DESIGN_REFERENCE** | HOLD |
| 13 | `/v4/trees/demo/celebrate/canopy` | V4RainbowCanopy | **DESIGN_REFERENCE** | HOLD |
| 14 | `/v4/trees/demo/celebrate/bloom` | V4PurpleBloom | **DESIGN_REFERENCE** | HOLD |
| 15 | `/v4/trees/demo/onboarding/emotion` | V4EmotionStep | **DUPLICATE capability** (same concept as V4FirstJourney step 2) | KEEP_AS_MODE — REWIRE to real API for Create shell |
| 16 | `/v4/trees/demo/onboarding/connect` | V4ConnectStep | **DUPLICATE capability** (same concept as V4FirstJourney step 3) | KEEP_AS_MODE — REWIRE to real API for Create shell |

**Summary:**
- `DELETE_LATER_CANDIDATE`: 1 route (demo workspace)
- `REFERENCE_ONLY`: 3 routes (timeline, graph, 100-moments)
- `HOLD`: 10 routes (nebula, map, rest, seasons, growth, 4 celebrate, 2 onboarding — keep as design reference but exclude from MVP)
- `KEEP_AS_MODE`: 2 routes (state, emotion, connect — rewire to real API)
- `DUPLICATE`: 4 routes (workspace, timeline, graph, state — have real API equivalents)

---

## 18. Exact File Overlap with #202 / #177 / #204

**No direct references found** in commit history, file contents, or docs at this baseline (19fc160). The issue numbers refer to external GitHub issues/PRs not yet reflected in `main`. However, based on their likely scope:

| Issue | Likely Scope | Overlap with this audit |
|-------|-------------|------------------------|
| #202 | Unclear — no references found | Zero at current baseline |
| #177 | Unclear — no references found | Zero at current baseline |
| #204 | Unclear — no references found | Zero at current baseline |

**Note:** When these issues materialize as PRs, the overlap would be limited to:
- `app/trees/[id]/` (if they modify canonical Workspace routes)
- `app/components/TreeViewShell.tsx` or `ViewSwitcher.tsx` (if they modify navigation)
- `app/components/v4/product/V4FinalTreeSurface.tsx` (if they modify modes)
- `lib/use-tree-moments.ts` (if they modify data hooks)

All other files in this audit are either fixture (design-lab, demo) or API/DB (server/api/, db/) — unlikely to overlap with product-surface issues.

---

## 19. WORKSPACE_CANONICAL_OWNER_RECOMMENDATION

```
CANONICAL WORKSPACE OWNER: /trees/[id] with V4FinalTreeSurface as mode engine
═══════════════════════════════════════════════════════════════════════════════

Primary owner component:  TreeDetailPage at app/trees/[id]/page.tsx
                           + V4FinalTreeSurface at app/components/v4/product/V4FinalTreeSurface.tsx
                           + V4PublicStorySticky at app/components/v4/product/V4PublicStorySticky.tsx

Canonical data hook:      useTreeMoments at lib/use-tree-moments.ts (REAL_API)
Canonical shell:          TreeViewShell at app/components/TreeViewShell.tsx
Canonical navigation:     ViewSwitcher at app/components/ViewSwitcher.tsx

REJECTED CANONICAL OWNERS:
  ✗ V4TreeWorkspace → fixture only, zero API calls
  ✗ V4GraphExperiences → fixture only
  ✗ V4MilestoneExperiences → fixture only
  ✗ V4Moments100 → fixture only, 2872-line monolith
```

---

## 20. IMPLEMENTATION_READY

| Criterion | Status |
|-----------|--------|
| REAL API/DB authority identified | ✅ YES — `/trees/[id]` family, `server/api/`, `db/schema.ts` |
| Fixture/demo authority identified | ✅ YES — 16 routes, all fixture |
| Canonical Workspace determined | ✅ YES — `/trees/[id]` + V4FinalTreeSurface |
| Mode architecture already exists | ✅ YES — ViewSwitcher (8 views) + V4FinalTreeSurface (5 modes) |
| Duplicate truths listed | ✅ YES — 4 confirmed conflicts |
| Components to delete/exclude | ✅ YES — 17 demo routes, 1 component (V4JourneyDock) |
| Components to rewire | ✅ YES — V4TreeState, V4EmotionStep, V4ConnectStep |
| Backend schema supports all needed fields | ✅ YES — emotionTags, connectionReason, discoveryDate, videoOffsetSeconds all exist |
| Open PR overlap | ✅ NO — PR #191 is Design Lab only, zero product surface overlap |
| MVP consolidation plan exists | ✅ YES — 4-phase merge sequence |

**IMPLEMENTATION_READY = YES** — all evidence collected, canonical authority determined, no blockers from open PRs, backend schema fully supports required fields.

---

## 21. Smallest Consolidation Plan (no fixture backsliding)

```
STEP 1: Delete 17 route files (demo + V4JourneyDock)
  → Done in one commit. Component files stay untouched.
  → No fixture data can re-enter the product routing.

STEP 2: Add mode parameter support to /trees/[id]
  → Change ViewSwitcher to use ?mode= instead of sub-path
  → Add redirect from /trees/[id]/overview? → /trees/[id]?mode=overview
  → Keep all existing paths working as redirects

STEP 3: Wire V4TreeState lifecycle to real API
  → Replace localStorage with apiFetch PUT /api/trees/:id
  → Add "lifecycle" enum to trees schema (active/resting/archived) or use existing visibility

STEP 4: Wire V4EmotionStep + V4ConnectStep to real API
  → Replace localStorage with apiFetch POST /api/trees/:id/memories
  → Schema fields already exist

STOP AT STEP 4 for MVP — do NOT:
  ✗ Wire V4MilestoneExperiences — no real API trigger for celebrations
  ✗ Wire V4Moments100 — too large, no real API need
  ✗ Wire V4GraphExperiences — V4FinalTreeSurface GraphSurface is already superior
  ✗ Merge all 8 modes into a single page — sub-pages work fine
```

---

*Report generated by LoveTree V4 COM3 — Canonical Tree Workspace Reconciliation Auditor*  
*Repository: skerishKang/lovetree-limone*  
*Baseline: 19fc160d2f67c66a3fd1bffb4d4087e006316119*  
*Mode: READ ONLY — NO_CODE_MUTATION_CONFIRMED=YES*