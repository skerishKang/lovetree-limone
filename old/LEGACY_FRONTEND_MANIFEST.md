# LEGACY FRONTEND MANIFEST

> Established: 2026-08-28
> Generation: OLD
> Purpose: Declare ownership of all historical LoveTree frontend areas

---

## 1. App Router Pages (`app/`)

| Path | Description |
|------|-------------|
| `app/page.tsx` | Root landing page |
| `app/layout.tsx` | Root layout |
| `app/globals.css` | Global styles |
| `app/flow.css` | Flow-specific styles |
| `app/tree-pages.css` | Tree page styles |
| `app/chatgpt-auth.ts` | ChatGPT auth integration |
| `app/gateway/page.tsx` | Gateway entry page |
| `app/my-trees/page.tsx` | My Trees listing |
| `app/trees/[id]/` | Individual tree pages (dynamic route) |
| `app/legacy/` | Legacy component wrappers |

## 2. Product Generations

### V2 (`app/v2/`)
- `app/v2/page.tsx` — V2 home
- `app/v2/community/` — V2 community view
- `app/v2/my-trees/` — V2 my trees
- `app/v2/trees/` — V2 tree pages

### V3 (`app/v3/`)
- `app/v3/page.tsx` — V3 home
- `app/v3/community/` — V3 community view
- `app/v3/my-trees/` — V3 my trees
- `app/v3/subjects/` — V3 subjects
- `app/v3/trees/` — V3 tree pages

### V4 / Next (`app/v4/`)
- `app/v4/page.tsx` — V4 home
- `app/v4/layout.tsx` — V4 layout
- `app/v4/cinematic/` — Cinematic experiences
- `app/v4/community/` — V4 community
- `app/v4/entry/` — V4 entry flow
- `app/v4/journey/` — V4 journey
- `app/v4/memory-biosphere/` — Memory biosphere
- `app/v4/subjects/` — V4 subjects
- `app/v4/trees/` — V4 tree pages

## 3. Design Lab (`app/design-lab/`)

| Path | Description |
|------|-------------|
| `app/design-lab/page.tsx` | Design Lab entry |
| `app/design-lab/capabilities/` | Experience capabilities |
| `app/design-lab/drive-track-18-electric-aurora/` | Drive Track 18 Electric Aurora |
| `app/design-lab/lineages/` | Design lineages |
| `app/design-lab/source-families/` | Source families |
| `app/design-lab/source-tracks/` | Source tracks |

## 4. Components (`app/components/`)

### Shared Components
- `EmailAuthForm.tsx` — Email authentication form
- `MomentComposerModal.tsx` — Moment composer modal
- `MomentContextActions.tsx` — Moment context actions
- `MomentDetailModal.tsx` — Moment detail modal
- `MomentThumbnail.tsx` — Moment thumbnail
- `TreeViewShell.tsx` — Tree view shell
- `ViewSwitcher.tsx` — View switcher

### Moment Presentation
- `app/components/moment-presentation/` — Living glass moment cards, galleries, inspectors

### Product Components
- `app/components/product/` — Design lineage overview, variant explorer, capability library, product gateway

### Generation-Specific Components
- `app/components/v2/` — V2-specific components (AlbumView, CommunityView, DiaryView, GrowthTree, Home, MomentEditor, MyTrees, StoryView, TreeCreateFlow)
- `app/components/v3/` — V3-specific components
- `app/components/v4/` — V4-specific components (Landing, FirstJourney, OrbitMorphTemplate, BookShelf variants, CommunityDiscovery, JourneyDock, TreeWorkspace, etc.)

## 5. Shared Libraries (`lib/`)

### Core Infrastructure
- `lib/api.ts` — API client
- `lib/auth.tsx` — Auth provider
- `lib/auth-errors.ts` — Auth error handling
- `lib/auth-token-provider.ts` — Auth token provider
- `lib/firebase.ts` — Firebase configuration
- `lib/first-tree-create-client.ts` — First tree creation
- `lib/tree-types.ts` — Tree type definitions
- `lib/moment-model.ts` — Moment model
- `lib/moment-url.ts` — Moment URL handling
- `lib/use-moment-url.ts` — Moment URL hook
- `lib/use-tree-moments.ts` — Tree moments hook

### Design System
- `lib/design-lab.ts` — Design lab utilities
- `lib/design-lineages.ts` — Design lineages
- `lib/design-intake/` — Design intake system
- `lib/design-runtime/` — Design runtime
- `lib/experience-capabilities.ts` — Experience capabilities
- `lib/experience-capability-registry.ts` — Capability registry
- `lib/experience-capability-audit-batch1.ts` — Audit batch 1
- `lib/experience-capability-audit-batch2.ts` — Audit batch 2
- `lib/experience-runtime/` — Experience runtime

### Lineage Source Implementations
- `lib/lineage-52/` — Lineage 52
- `lib/lineage-52-v3-source.ts` — Lineage 52 V3 source
- `lib/lineage-53-source56.ts` — Lineage 53 Source 56
- `lib/lineage-53-v2-source.ts` — Lineage 53 V2 source
- `lib/lineage-54-petal-runner-source.ts` — Lineage 54 Petal Runner
- `lib/lineage-55-moonlit-blossom-*` — Lineage 55 Moonlit Blossom (assets, controller, data, source)
- `lib/lineage-56-crystal-memory-source.ts` — Lineage 56 Crystal Memory
- `lib/lineage-57-*` — Lineage 57 (assets, character controller, living character source)
- `lib/lineage-58-*` — Lineage 58 (videofigure assets, videofigure source)
- `lib/lineage-59/` — Lineage 59
- `lib/lineage-60/` — Lineage 60
- `lib/lineage-63/` — Lineage 63
- `lib/lineage-64/` — Lineage 64
- `lib/lineage-67-v24/` — Lineage 67 V24

### Source Track Implementations
- `lib/source-codex-13/` — Source Codex 13
- `lib/codex14/` — Source Codex 14
- `lib/source-codex-15/` — Source Codex 15
- `lib/source-track-17/` — Source Track 17
- `lib/source-track-18/` — Source Track 18
- `lib/source-track-35/` — Source Track 35
- `lib/source-track-36/` — Source Track 36
- `lib/source-track-38/` — Source Track 38
- `lib/source-track-47/` — Source Track 47
- `lib/source-track-57-living-glass.ts` — Source Track 57 Living Glass
- `lib/source-track-58-living-memory-pinboard.ts` — Source Track 58 Living Memory Pinboard
- `lib/source-track-74/` — Source Track 74
- `lib/sourceTrack24V1DonorNative.ts` — Source Track 24 V1 Donor Native
- `lib/living-media-sphere-v3/` — Living Media Sphere V3

### Other
- `lib/drive-track-18-electric-aurora/` — Drive Track 18 Electric Aurora
- `lib/graph/` — Graph utilities
- `lib/intent-path-prototype.ts` — Intent path prototype
- `lib/media-inspection-prototype.ts` — Media inspection prototype
- `lib/memory-anatomy.ts` — Memory anatomy
- `lib/narrative-moment-assembly.ts` — Narrative moment assembly
- `lib/question-lens-prototype.ts` — Question lens prototype
- `lib/template-platform/` — Template platform
- `lib/track-62-v11/` — Track 62 V11
- `lib/v4-orbit-product.ts` — V4 orbit product
- `lib/v4-orbit-selection.ts` — V4 orbit selection
- `lib/videofigure-turntable.ts` — Videofigure turntable

## 6. Design Intake (`design-intake/`)

Source family manifests, source track manifests, design scaffolds, and coverage tracking.

## 7. Static HTML Files (Root)

These are standalone HTML reference/prototype files at the repository root:

- `dashboard.html`
- `preview.html`
- `lovetree-community-discovery-v1.html`
- `lovetree-diary-flow-v1.html`
- `mindmap.html`, `mindmap-v2.html`, `mindmap-final.html`
- `relovetree-canvas.html`, `relovetree-record.html`
- `step2.html`, `step3.html`
- `tree-import.html`, `tree-visual-v2.html`

## 8. Tests (`tests/`)

732+ test files covering API contracts, auth, browse UI, design fidelity, source faithfulness, community queries, asset integrity, and more. These test the existing legacy implementation.

## 9. NOT Legacy (Shared with NEW)

These areas are **shared** between OLD and NEW and remain at root level:

- `db/` — Database schema (CORE)
- `drizzle/` — Migrations (CORE)
- `server/api/` — Backend API (CORE)
- `worker/` — Cloudflare Worker (CORE)
- `package.json`, `next.config.ts`, `tsconfig.json` — Build config (ROOT)
- `public/` — Static assets (ROOT)
- `scripts/` — Build/deploy scripts (ROOT)
