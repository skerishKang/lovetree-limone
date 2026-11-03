# COM3 MVP Shell Assembly — Repository Report

**Date:** 2026-08-15
**Auditor:** LoveTree V4 Local Worker — COM3 Shell Assembly Agent
**Working directory:** D:\work\lovetree-limone
**Mode:** READ ONLY — NO_CODE_MUTATION_CONFIRMED=YES

---

## 1. Current `main` Baseline

| Property | Value |
|----------|-------|
| Framework | Next.js 16 / React 19 / TypeScript |
| Runtime | Cloudflare Worker (`lovetree-limone`) |
| Database | Neon PostgreSQL via Drizzle ORM |
| Auth | Firebase Auth (`relovetree` Project) |
| Product families | 3 active generations: V4 (Next), V3 (Legacy), V2 (Legacy) |
| Design Lab (R&D) | 7 lineages, 5 capabilities, separate from product |
| Total route files | 74 page.tsx across all surfaces |

---

## 2. Route Inventory (Relevant to MVP)

### Route Surface Matrix

| Route | Component | Data Source | MVP Shell Candidate | Notes |
|-------|-----------|-------------|---------------------|-------|
| `/` | ProductGateway | STATIC | ENTRY | Product family selector (V4 vs Legacy) |
| `/v4` | V4Landing | REAL_API + LOCAL_STATE | **ENTRY** | Landing + first moment creation + auth |
| `/v4/journey` | V4FirstJourney + FidelityBridge | LOCAL_STATE only (localStorage) | **CREATE** | Guided 4-step onboarding wizard. **No real API calls.** |
| `/v4/trees/demo` | V4TreeWorkspace | FIXTURE + LOCAL_STATE | **WORKSPACE** | Tree graph + diary + composer. **No real API. Fixture data.** |
| `/v4/trees/demo/timeline` | V4JuyeonTimeline | FIXTURE | WORKSPACE | Timeline mode of demo tree |
| `/v4/trees/demo/state` | V4TreeState | FIXTURE + LOCAL_STATE | → merge into WORKSPACE | Tree lifecycle settings — should be panel |
| `/v4/trees/demo/rest` | V4RestFlow | FIXTURE | → merge into WORKSPACE | Rest/Idle UI — should be state mode |
| `/v4/trees/demo/graph` | V4FreeGraph | FIXTURE | → merge into WORKSPACE | Graph visualization mode |
| `/v4/trees/demo/map` | V4ObsidianMap | FIXTURE | → merge into WORKSPACE | Map visualization mode |
| `/v4/trees/demo/nebula` | V4LoveNebula | FIXTURE | → merge into WORKSPACE | Nebula visualization mode |
| `/v4/trees/demo/seasons` | V4SeasonArchive | FIXTURE | → merge into WORKSPACE | Seasonal grouping mode |
| `/v4/trees/demo/growth/300-plus` | V4Growth300Plus | FIXTURE | → merge into WORKSPACE | Milestone — should be modal |
| `/v4/trees/demo/celebrate/*` | 4 celebration pages | FIXTURE | → merge into WORKSPACE | Celebrations — should be modal |
| `/v4/trees/demo/onboarding/*` | V4EmotionStep, V4ConnectStep | FIXTURE | → merge into CREATE | Disconnected onboarding steps |
| `/v4/community` | V4GlobalDiscoveryHome | **REAL_API** | WORKSPACE | Community browse (🟢 real data) |
| `/v4/community/trees/[id]` | V4PublicTree | **REAL_API** | WORKSPACE | Public tree view (🟢 real data) |
| `/v4/subjects` | V4PersonAlbums | FIXTURE | → merge into WORKSPACE | Person/Subject albums |
| `/v4/cinematic` | V4CinematicV6International | FIXTURE | DESIGN_LAB_ONLY | Cinematic experience — not MVP |
| `/my-trees` | MyTreesPage | **REAL_API** | WORKSPACE | User's tree list (🟢 real data) |
| `/trees/[id]` | TreeDetailPage (canonical) | **REAL_API** | WORKSPACE | Legacy tree detail (🟢 real data, production) |
| `/trees/[id]/overview` | V4FinalTreeSurface (mode=overview) | **REAL_API** | WORKSPACE | 🟢 Production tree overview |
| `/trees/[id]/timeline` | TimelinePage | **REAL_API** | WORKSPACE | 🟢 Production timeline view |
| `/trees/[id]/album` | AlbumPage | **REAL_API** | WORKSPACE | 🟢 Production album view |
| `/trees/[id]/studio` | V4FinalTreeSurface (mode=studio) | **REAL_API** | WORKSPACE | 🟢 Production studio mode |
| `/trees/[id]/story` | V4PublicStorySticky | **REAL_API** | WORKSPACE | 🟢 Production share/story view |
| `/trees/[id]/replay` | V4FinalTreeSurface (mode=replay) | **REAL_API** | WORKSPACE | 🟢 Production replay mode |
| `/trees/[id]/graph` | V4FinalTreeSurface (mode=graph) | **REAL_API** | WORKSPACE | 🟢 Production graph mode |
| `/v2/*`, `/v3/*`, `/legacy` | Legacy pages | VARIES | EXCLUDED | Historical — not in MVP scope |
| `/design-lab/*` | Lineage revisions, capabilities | FIXTURE | EXCLUDED | R&D — not in MVP scope |

---

## 3. Capability Inventory

### Real / Production-Ready Capabilities (🟢 KEEP)

| Capability | Location | Type |
|------------|----------|------|
| **Firebase Auth** | `lib/auth.tsx`, `server/api/auth.ts` | REAL_API |
| **Tree CRUD** | `server/api/trees.ts`, `lib/use-tree-moments.ts` | REAL_API |
| **Memory CRUD** | `server/api/memories.ts`, `lib/use-tree-moments.ts` | REAL_API |
| **Tree + First Memory creation** | `server/api/trees.ts` (POST `/api/trees/with-first-memory`) | REAL_API |
| **Community browse** | `server/api/trees.ts` (community routes), V4GlobalDiscoveryHome | REAL_API |
| **Social (likes, views, reactions)** | `server/api/social.ts` | REAL_API |
| **Comments** | `server/api/comments.ts` | REAL_API |
| **Drizzle ORM schema** | `db/schema.ts` (10 tables, 5 enums) | REAL_DB |
| **apiFetch client** | `lib/api.ts` | REAL_API |
| **Canonical types** | `lib/tree-types.ts`, `lib/moment-model.ts` | CANONICAL |
| **V4FinalTreeSurface** | `app/components/v4/product/V4FinalTreeSurface.tsx` (5 modes) | REAL_API |
| **TreeViewShell** | `app/components/TreeViewShell.tsx` | CANONICAL |
| **ViewSwitcher** | `app/components/ViewSwitcher.tsx` | CANONICAL |
| **Access control** | `server/api/access.ts` | CANONICAL |
| **Input validation** | `server/api/validate.ts` | CANONICAL |
| **Memory contract** | `server/api/memory-contract.ts` | CANONICAL |

### Fixture / Prototype-Only Capabilities (🟡 Needs Real API Wiring)

| Capability | Location | Risk |
|------------|----------|------|
| **V4FirstJourney (4-step wizard)** | `app/components/v4/V4FirstJourney.tsx` | Entirely localStorage. No API. Hardcoded demo tree name. |
| **V4TreeWorkspace** | `app/components/v4/V4TreeWorkspace.tsx` | Entirely localStorage. Hardcoded INITIAL_MOMENTS. No API. |
| **V4TreeState (lifecycle)** | `app/components/v4/V4TreeState.tsx` | Fixture + localStorage only |
| **V4EmotionStep** | `app/components/v4/V4EmotionStep.tsx` | No API wiring |
| **V4ConnectStep** | `app/components/v4/V4ConnectStep.tsx` | No API wiring |
| **V4PersonAlbums** | `app/components/v4/V4PersonAlbums.tsx` | Fixture data only |
| **All V4 demo graph/map/nebula/seasons** | `app/components/v4/V4*.tsx` | Fixture data only |

### Design Lab / R&D Only (🔴 EXCLUDE from MVP)

| Capability | Location |
|------------|----------|
| All lineage revisions (52–61) | `app/design-lab/lineages/*` |
| Question Lens | `design-lab/capabilities/question-lens` |
| Narrative Assembly | `design-lab/capabilities/narrative-assembly` |
| Memory Anatomy | `design-lab/capabilities/memory-anatomy` |
| Media Inspection | `design-lab/capabilities/media-inspection` |
| Intent to Path | `design-lab/capabilities/intent-to-path` |
| V4Cinematic | `app/v4/cinematic/page.tsx` |
| All Experience Capability registries | `lib/experience-capability-*.ts` |

---

## 4. Real vs Fixture Matrix

| Feature | Real API | Fixture | Local State | DB Schema |
|---------|----------|---------|-------------|-----------|
| Tree list (my-trees) | ✅ `GET /api/trees` | | | ✅ `trees` |
| Tree detail (canonical) | ✅ `GET /api/trees/:id` | | | ✅ `trees` |
| Memory list | ✅ `GET /api/trees/:id/memories` | | | ✅ `memories` |
| Memory CRUD | ✅ POST/PUT/DELETE | | | ✅ `memories` |
| Tree + first memory creation | ✅ `POST /api/trees/with-first-memory` | | `localStorage.clientKey` | ✅ both tables |
| Community browse | ✅ `GET /api/community/trees` | | | ✅ both tables |
| Social (likes, views) | ✅ `POST /api/trees/:id/like` | | | ✅ `treeLikes`, `treeSocialCounts` |
| Comments | ✅ POST/GET/DELETE | | | ✅ `comments`, `treeComments` |
| V4TreeWorkspace (demo) | | ✅ `INITIAL_MOMENTS` | ✅ `localStorage` | |
| V4FirstJourney | | ✅ hardcoded demo data | ✅ `localStorage` | |
| V4TreeState | | ✅ fixture states | ✅ `localStorage` | |
| V4 demo visualizations | | ✅ fixture data | | |
| V4PersonAlbums | | ✅ fixture data | | |
| Design Lab pages | | ✅ fixture data | | |
| V4Cinematic | | ✅ fixture cinematic | | |

**Key finding:** The V4 demo surfaces (V4TreeWorkspace, V4FirstJourney) are 100% fixture/localStorage. They have NO real API connectivity. The canonical `/trees/[id]` surfaces are 100% real API. The V4Landing's "첫 순간 심기" flow is the only place that creates real trees and memories via the API.

---

## 5. Proposed 2-Shell Model

### Shell A: ENTRY (Landing + First Moment Creation)
- Routes: `/`, `/v4`
- Capabilities:
  - Product gateway (redirect to V4)
  - V4Landing hero + name tree modal
  - YouTube URL entry + first moment creation
  - Firebase Auth (Google + email)
- Real API: POST `/api/trees/with-first-memory`
- **Gap:** No guided onboarding wizard (V4FirstJourney's 4-step discover→emotion→connect→growth is lost)

### Shell B: WORKSPACE (View + Community + My Trees + Studio)
- Routes: `/my-trees`, `/v4/community`, `/v4/community/trees/[id]`, `/trees/[id]/*`, `/v4/trees/demo` (replace fixture with real API)
- Capabilities:
  - My Trees list
  - Tree detail (all modes: overview, timeline, album, studio, story, replay, graph)
  - Community browse + public tree view
  - Moment composer + detail modals
  - ViewSwitcher navigation
- Real API: All tree/memory/social/comment APIs
- **Gap:** The V4TreeWorkspace fixture component must be either (a) replaced with V4FinalTreeSurface, or (b) rewired to real API. All demo views (graph, map, nebula, etc.) must be merged as modes.

### Verdict on 2-Shell: ⚠️ TIGHT BUT POSSIBLE

- **Pro:** Eliminates the need for a separate page for onboarding wizard; first moment creation happens inline on Entry.
- **Con:** The V4FirstJourney guided wizard UX is completely lost. The V4Landing's creation flow is minimal (1 URL + 1 note). There is no "emotion tagging," "connect next video," or "growth view" in the V4Landing.
- **Con:** V4TreeWorkspace's drag-and-drop card editor + branch visualization must be integrated as a mode within V4FinalTreeSurface or the canonical tree page.
- **Verdict:** Technically possible but UX-compromised for the creation flow.

---

## 6. Proposed 3-Shell Model ✅ (RECOMMENDED)

### Shell 1: ENTRY (Landing / Auth / Gateway)
- **Route:** `/v4` (single page)
- **Purpose:** Pre-auth landing, product introduction, "첫 순간 심기" entry point
- **Includes:**
  - V4Landing hero + sample moments visualization
  - Name tree modal
  - First moment creation (YouTube URL + note + date)
  - Firebase Auth (Google + Email)
  - Navigation to Community and My Trees
- **Real API:** Auth + `POST /api/trees/with-first-memory`
- **State:** Minimal — `localStorage` for `clientKey` and `lastTreeId`
- **Pages to merge into this shell:** `/`, `/gateway`, `/v4`

### Shell 2: STUDIO / CREATE (Guided Moment Creation)
- **Route:** `/v4/create` or `/v4/journey`
- **Purpose:** Full guided onboarding wizard for creating rich moments
- **Includes:**
  - V4FirstJourney's 4-step flow (discover → emotion → connect → growth) → but **rewired to REAL_API**
  - Emotion tagging (V4EmotionStep)
  - Connect next moment (V4ConnectStep)
  - Moment card preview + editing
- **Real API (needs wiring):** `POST /api/trees/with-first-memory`, `POST /api/trees/:id/memories`
- **State:** Replace localStorage persistence with real API calls
- **Critical gap:** V4FirstJourney is currently 100% localStorage. MVP must wire it to REAL_API or replace with V4Landing's inline creation flow.

### Shell 3: WORKSPACE (Tree View + Community + My Trees + Studio)
- **Route:** `/trees/[id]` + `/my-trees` + `/v4/community`
- **Purpose:** View, explore, edit, share trees
- **Includes:**
  - `/my-trees` — user's tree list
  - `/trees/[id]` — tree detail (canonical, with ViewSwitcher for modes)
  - `/trees/[id]/overview` — V4FinalTreeSurface mode=overview
  - `/trees/[id]/timeline` — timeline view
  - `/trees/[id]/album` — album gallery
  - `/trees/[id]/studio` — V4FinalTreeSurface mode=studio (for arranging moments)
  - `/trees/[id]/story` — public share view
  - `/trees/[id]/replay` — guided playback
  - `/trees/[id]/graph` — graph visualization
  - `/v4/community` — community browse
  - `/v4/community/trees/[id]` — public tree view
- **Real API:** All existing tree/memory/social/comment endpoints
- **Merged as modes (not separate pages):**
  - Graph/Map/Nebula/Seasons → view modes within Workspace
  - V4TreeState (lifecycle settings) → panel/drawer within Workspace
  - V4RestFlow → tree state mode
  - Milestone celebrations (300, aurora, bloom, canopy) → modals triggered from Workspace
  - V4PersonAlbums → integrated into album mode
- **Navigation:** TreeViewShell + ViewSwitcher (already exists at `/trees/[id]`)

### Verdict on 3-Shell: ✅ SAFEST

- **Pro:** Each shell has a distinct user paradigm (Entry=discover, Studio/Create=author, Workspace=view/manage)
- **Pro:** Minimal UX compromise — the guided creation wizard is preserved
- **Pro:** Workspace already has ViewSwitcher and V4FinalTreeSurface with mode support
- **Pro:** Entry shell is already deployed with real API integration
- **Con:** Higher surface area (3 shells vs 2)
- **Con:** Requires Studio/Create to be rewired from localStorage to real API

---

## 7. Reuse List

### Components to KEEP (real API, production-grade)

| Component | File | Used In |
|-----------|------|---------|
| TreeViewShell | `app/components/TreeViewShell.tsx` | Workspace shell |
| ViewSwitcher | `app/components/ViewSwitcher.tsx` | Workspace navigation |
| V4FinalTreeSurface | `app/components/v4/product/V4FinalTreeSurface.tsx` | Tree detail (overview, studio, replay, graph) |
| V4GlobalDiscoveryHome | `app/components/v4/product/V4GlobalDiscoveryHome.tsx` | Community browse |
| V4PublicTree | `app/components/v4/V4CommunityDiscovery.tsx` | Public tree view |
| V4Landing | `app/components/v4/V4Landing.tsx` | Entry shell (creates tree + first moment via API) |
| MomentDetailModal | `app/components/MomentDetailModal.tsx` | Moment detail overlay |
| MomentComposerModal | `app/components/MomentComposerModal.tsx` | Moment creation overlay |
| MomentThumbnail | `app/components/MomentThumbnail.tsx` | Moment thumbnail in lists |
| EmailAuthForm | `app/components/EmailAuthForm.tsx` | Auth entry |
| V4PublicStorySticky | `app/components/v4/product/V4PublicStorySticky.tsx` | Public share view |

### Components to REWIRE (replace localStorage with real API)

| Component | File | Required Action |
|-----------|------|-----------------|
| V4FirstJourney | `app/components/v4/V4FirstJourney.tsx` | Replace localStorage state with apiFetch calls. Use `POST /api/trees/with-first-memory` for tree creation and `POST /api/trees/:id/memories` for moments. |
| V4TreeWorkspace | `app/components/v4/V4TreeWorkspace.tsx` | Replace fixture INITIAL_MOMENTS + localStorage with real API data from `useTreeMoments` hook. Or replace with V4FinalTreeSurface entirely. |
| V4TreeState | `app/components/v4/V4TreeState.tsx` | Wire to real API (tree update endpoint) |
| V4PersonAlbums | `app/components/v4/V4PersonAlbums.tsx` | Wire to real memories API with album grouping |
| V4EmotionStep | `app/components/v4/V4EmotionStep.tsx` | Merge into V4FirstJourney or Create shell |
| V4ConnectStep | `app/components/v4/V4ConnectStep.tsx` | Merge into V4FirstJourney or Create shell |

### Components to MERGE (absorb into Workspace as modes/panels)

| Component | File | Merge Strategy |
|-----------|------|----------------|
| V4RestFlow | `app/components/v4/V4RestFlow.tsx` | Tree state mode in Workspace |
| V4FreeGraph | `app/components/v4/V4GraphExperiences.tsx` | Graph visualization mode (already exists in V4FinalTreeSurface mode=graph) |
| V4ObsidianMap | `app/components/v4/V4ArchiveExperiences.tsx` | Map visualization tab |
| V4LoveNebula | `app/components/v4/V4MilestoneExperiences.tsx` | Nebula visualization tab |
| V4SeasonArchive | `app/components/v4/V4BookShelfV1.tsx` | Seasonal archive mode |
| V4Moments100 | `app/components/v4/V4Moments100.tsx` | Milestone celebration modal |
| V4Growth300Plus | `app/components/v4/V4RestFlow.tsx` | Milestone celebration modal |
| Celebration variants | `app/components/v4/V4PhaseBoundary.tsx` | Celebration modals |
| V4TreeState (lifecycle) | `app/components/v4/V4TreeState.tsx` | Settings panel/drawer |
| V4JourneyDock | `app/components/v4/V4JourneyDock.tsx` | **Delete.** Replace with shell-level navigation |

### Components to EXCLUDE from MVP

| Component | File | Reason |
|-----------|------|--------|
| V4CinematicV6International | `app/components/v4/cinematic/V4CinematicV6International.tsx` | Design Lab / cinematic experience — not MVP |
| All Design Lab pages | `app/design-lab/*` | R&D surface |
| All Legacy v2/v3 pages | `app/v2/*`, `app/v3/*` | Historical |
| ProductGateway | `app/components/product/ProductGateway.tsx` | MVP should route directly to V4 |
| All Experience Capability registries | `lib/experience-capability-*.ts` | Design tracking, not runtime |

### Reusable Capabilities (lib/) to KEEP

| File | Purpose |
|------|---------|
| `lib/api.ts` | HTTP client with Bearer token |
| `lib/auth.tsx` | Auth context + provider |
| `lib/firebase.ts` | Firebase initialization |
| `lib/tree-types.ts` | Canonical TreeRecord, MemoryRecord types |
| `lib/moment-model.ts` | CanonicalMoment, view projections |
| `lib/moment-url.ts` | URL state management |
| `lib/use-tree-moments.ts` | Primary data hook |
| `lib/use-moment-url.ts` | URL sync for moments |

---

## 8. Backend Dependencies

### Required for ALL shells (non-negotiable)

| Dependency | Status | Notes |
|------------|--------|-------|
| Neon PostgreSQL | ✅ Live | Production DB running |
| Drizzle ORM | ✅ Live | `db/schema.ts` — 10 tables |
| Cloudflare Worker | ✅ Live | `worker/index.ts` — routes API |
| Firebase Auth | ✅ Live | `relovetree` project |
| `server/api/trees.ts` | ✅ Live | Tree CRUD + community |
| `server/api/memories.ts` | ✅ Live | Memory CRUD |
| `server/api/social.ts` | ✅ Live | Likes, views |
| `server/api/comments.ts` | ✅ Live | Comments |

### Required for Studio/Create Shell (needs wiring)

| Dependency | Status | Notes |
|------------|--------|-------|
| `POST /api/trees/with-first-memory` | ✅ Live | Already used by V4Landing |
| `POST /api/trees/:id/memories` | ✅ Live | Already used by canonical tree page |
| Emotion tag storage | ✅ Live | `emotionTags` column on memories table |
| Connection reason storage | ✅ Live | `connection_reason` column (added in migration 0003) |
| Video offset storage | ✅ Live | `video_offset_seconds` column (migration 0003) |
| Discovery date storage | ✅ Live | `discovery_date` column (migration 0003) |

**Critical finding:** The Create shell's needed API endpoints ALREADY EXIST. The V4FirstJourney component simply doesn't call them — it stores everything in localStorage. The data model supports all fields (emotionTags, connection_reason, video_offset_seconds, discovery_date).

---

## 9. Gaps

### Gap 1: V4FirstJourney has no real API connectivity
- **Severity:** CRITICAL (for 3-shell model)
- **Fix:** The 4-step wizard must use `apiFetch` instead of localStorage. The `POST /api/trees/with-first-memory` endpoint already supports creating a tree + first memory atomically. Subsequent moments can use `POST /api/trees/:id/memories`.
- **Available API surface:** `connection_reason`, `emotionTags`, `video_offset_seconds`, `discovery_date` are already in the schema.

### Gap 2: V4TreeWorkspace is fixture-only with no API
- **Severity:** HIGH (for Workspace shell)
- **Fix:** Two options: (a) Replace V4TreeWorkspace with V4FinalTreeSurface (mode="studio") which is already API-backed, or (b) wire V4TreeWorkspace to `useTreeMoments` hook.
- **Note:** V4FinalTreeSurface mode="studio" already exists at `/trees/[id]/studio` and works with real data.

### Gap 3: No shared navigation between shells
- **Severity:** MEDIUM
- **Fix:** The current V4JourneyDock provides navigation to 29 demo pages. MVP needs a simpler nav: "My Trees", "Community", profile/auth. The TreeViewShell already has this pattern.

### Gap 4: V4Landing's creation flow is minimal compared to V4FirstJourney
- **Severity:** MEDIUM
- **Fix:** If using 2-shell model, V4Landing's discovery form needs enrichment (emotion selection, connection builder). If using 3-shell model, V4Landing stays minimal and redirects to Studio/Create for richer onboarding.

### Gap 5: Community browse has performance concerns
- **Severity:** LOW
- **Observation:** V4GlobalDiscoveryHome fetches trees then hydrates each with individual memory API calls (N+1). An MVP should add a server-side join or batch endpoint.

### Gap 6: No tree update API called from V4TreeState
- **Severity:** MEDIUM
- **Fix:** `server/api/trees.ts` already has `PUT /api/trees/:id` — V4TreeState's lifecycle + visibility settings should call this.

---

## 10. Recommendations

### RECOMMENDATION: 3-Shell Model

```
ENTRY (/v4)          STUDIO (/v4/create)      WORKSPACE (/trees/[id], /my-trees, /v4/community)
│                    │                         │
├─ Landing hero      ├─ Step 1: Discover       ├─ My Trees list
├─ Name tree modal   ├─ Step 2: Emotion        ├─ Tree detail (overview)
├─ First moment URL  ├─ Step 3: Connect        ├─ Timeline view
├─ Firebase Auth     ├─ Step 4: Growth View    ├─ Album gallery
│                    │                         ├─ Studio mode (edit/arrange)
│                    │                         ├─ Story mode (share)
│                    │                         ├─ Replay mode
│                    │                         ├─ Graph mode
│                    │                         ├─ Community browse
│                    │                         ├─ Public tree view
│                    │                         └─ Moment composer/detail modals
```

### Rationale

| Criterion | 2-Shell | 3-Shell |
|-----------|---------|---------|
| UX completeness for creation | ❌ Loses guided wizard | ✅ Preserves 4-step flow |
| Surface area | ✅ 2 shells | ⚠️ 3 shells |
| API wiring effort | ⚠️ High (rewire V4TreeWorkspace + merge V4FirstJourney) | ⚠️ Medium (rewire V4FirstJourney only) |
| Component reuse | ⚠️ Must reconcile V4TreeWorkspace vs V4FinalTreeSurface | ✅ V4FinalTreeSurface already canonical |
| Demo route migration | ⚠️ 11 demo routes need merging | ✅ Same effort |
| Risk of regression | HIGH (significant UX changes) | MEDIUM (preserves existing UX) |

### MVP Assembly Sequence

1. **Phase 0 — Establish canonical shell navigation**
   - Delete V4JourneyDock or replace with simple topbar
   - Unify navigation across Entry → Studio → Workspace

2. **Phase 1 — ENTRY shell (already works)**
   - Route: `/v4` → V4Landing (existing, real API)
   - Already production-grade

3. **Phase 2 — WORKSPACE shell (mostly works)**
   - Route: `/trees/[id]` + `/my-trees` + `/v4/community`
   - Keep TreeViewShell + ViewSwitcher
   - Replace V4TreeWorkspace fixture with V4FinalTreeSurface (mode="studio")
   - Merge all demo visualization routes as modes within V4FinalTreeSurface
   - Wire V4TreeState to real API
   - Add N+1 fix for community browse

4. **Phase 3 — STUDIO/CREATE shell (needs API wiring)**
   - Route: `/v4/create` or `/v4/journey`
   - Keep V4FirstJourney UX but replace all localStorage with real API calls
   - Use existing `POST /api/trees/with-first-memory` for initial creation
   - Use `POST /api/trees/:id/memories` for subsequent moments
   - Schema already supports emotionTags, connection_reason, video_offset_seconds, discovery_date

---

## 11. Answers to Core Questions

### Q: 실제 top-level 사용자 화면이 2개로 가능한가?
**가능하지만 UX 손실이 큼.** V4Landing에 이미 first moment 생성이 있어서 Entry + Workspace 2-shell은 technically possible. 하지만 V4FirstJourney의 guided 4-step onboarding wizard가 완전히 사라지고, V4Landing의 minimal form (URL + note + date)으로 대체됨. Emotion tagging, connection reason, growth view 등이 누락됨.

### Q: 3개가 더 안전한가?
**YES.** 3-shell이 더 안전함. 이유:
- 각 shell이 명확히 다른 사용자 패러다임을 가짐 (발견 → 저작 → 관리)
- V4FirstJourney의 UX를 보존하면서 Studio/Create shell에서 API만 교체하면 됨
- Workspace shell은 이미 V4FinalTreeSurface + ViewSwitcher로 mode 기반 아키텍처가 갖춰짐
- V4Landing의 real API creation flow을 그대로 Entry shell에 재사용 가능

### Q: 별도 페이지로 둘 필요가 없는 기능은 무엇인가?
- **V4TreeState (lifecycle 설정)** → Workspace의 settings panel/drawer
- **V4RestFlow** → Workspace의 tree state mode
- **V4FreeGraph, V4ObsidianMap, V4LoveNebula** → Workspace의 graph visualization mode (V4FinalTreeSurface mode=graph가 이미 존재)
- **V4SeasonArchive** → Workspace의 seasonal grouping mode
- **Milestone celebrations (300, bloom, canopy, aurora)** → Workspace에서 트리거되는 modal
- **V4Moments100, V4Growth300Plus** → Workspace milestone celebration widget
- **V4PersonAlbums** → Workspace album mode에 통합
- **V4EmotionStep, V4ConnectStep** → Studio/Create shell에 통합 (별도 페이지 불필요)
- **V4JourneyDock** → 제거 (shell 네비게이션으로 대체)

### Q: Viewer/Library/Orbit/Share를 Workspace mode로 합칠 수 있는가?
**YES, 이미 합쳐져 있음.** `/trees/[id]/*` 라우트들은 V4FinalTreeSurface (mode=overview/studio/replay/graph) + V4PublicStorySticky (story/share)로 mode 기반 아키텍처를 이미 갖추고 있음. Orbit/Bookshelf/Accordion/Folding 같은 album variant는 fixture 수준이며, MVP에서는 이 중 하나의 canonical album mode만 선택하면 됨.

### Q: First Moment/Create/Edit를 Studio mode로 합칠 수 있는가?
**Partial YES.** V4FinalTreeSurface mode="studio"가 이미 Edit 용도로 존재. 하지만 First Moment creation (onboarding wizard)은 별도의 UX 패러다임이므로 Studio mode로 합치는 것은 비권장. First Moment는 Entry shell (간단) 또는 Studio/Create shell (guided wizard)에서 처리하는 것이 적절.

### Q: 현재 구현 중 버려서는 안 될 핵심 capability는 무엇인가?
1. **REAL_DB schema** (`db/schema.ts`) — 10 tables, 전체 데이터 모델
2. **REAL_API server routes** (`server/api/trees.ts`, `memories.ts`, `social.ts`) — production API
3. **Firebase Auth** (`lib/auth.tsx`, `server/api/auth.ts`) — authentication
4. **useTreeMoments hook** (`lib/use-tree-moments.ts`) — primary data hook
5. **V4FinalTreeSurface** (`app/components/v4/product/V4FinalTreeSurface.tsx`) — production tree surface (5 modes)
6. **TreeViewShell + ViewSwitcher** — canonical tree page shell and navigation
7. **Canonical types** (`lib/tree-types.ts`, `lib/moment-model.ts`) — data contracts
8. **apiFetch** (`lib/api.ts`) — HTTP client

### Q: MVP assembly 시 가장 위험한 중복/충돌은 무엇인가?
1. **🔴 CRITICAL: V4FirstJourney vs V4Landing creation flow** — 같은 목적(첫 순간 생성)을 완전히 다른 방식으로 구현. V4FirstJourney는 localStorage, V4Landing은 real API. Merge 시 localStorage logic을 전면 폐기하고 API로 교체해야 함.

2. **🔴 CRITICAL: V4TreeWorkspace (fixture) vs V4FinalTreeSurface (real API)** — 같은 "tree workspace" 개념을 완전히 다른 컴포넌트로 구현. V4TreeWorkspace는 drag-and-drop card editor가 있고, V4FinalTreeSurface는 mode 기반 5개 뷰가 있음. 둘 중 하나를 canonical로 선택하고 나머지는 폐기 또는 재구성해야 함.

3. **🟡 HIGH: Multiple navigation systems** — V4JourneyDock (29 routes), V4Landing nav (community + person albums), TreeViewShell nav (my trees + community + profile). MVP 통합 navigation이 필요.

4. **🟡 HIGH: Demo-only routes vs Production routes** — `/v4/trees/demo/*` (11 fixture routes)와 `/trees/[id]/*` (7 real API routes)가 병존. MVP는 demo routes를 production routes로 migration 해야 함.

5. **🟡 MEDIUM: V4TreeState lifecycle logic** — localStorage에만 저장되며 real API tree update endpoint를 호출하지 않음. MVP에서 real API wiring 필요.

---

## 12. Summary Table

| Aspect | Finding |
|--------|---------|
| **Recommended model** | 3-Shell (Entry + Studio/Create + Workspace) |
| **Can we ship 2-shell?** | Yes, but UX-compromised (loses guided onboarding wizard) |
| **Real API coverage** | Tree/Memory CRUD, Auth, Comments, Social, Community — ✅ all exist |
| **Fixture pages to replace** | V4TreeWorkspace, V4FirstJourney, V4TreeState, all demo visualizations |
| **Pages to delete/merge** | V4JourneyDock, all `/v4/trees/demo/*` sub-routes (merge into Workspace modes) |
| **Pages to keep as-is** | `/v4` (Entry), `/my-trees`, `/trees/[id]/*`, `/v4/community`, `/v4/community/trees/[id]` |
| **Pages to exclude** | `/v2/*`, `/v3/*`, `/design-lab/*`, `/v4/cinematic` |
| **CRITICAL blocker** | V4FirstJourney is 100% localStorage — must be rewired to real API |
| **Key reuse** | V4FinalTreeSurface, TreeViewShell, ViewSwitcher, useTreeMoments, apiFetch |
| **Backend gaps** | Community browse N+1 query; no batch endpoint for hydration |
| **NO_CODE_MUTATION_CONFIRMED** | YES — report is read-only evidence |

---

*Report generated by LoveTree V4 Local Worker — COM3 Shell Assembly Repository Auditor*
*Repository: D:\work\lovetree-limone*
*Mode: READ ONLY — no code, branch, commit, push, or PR changes made*