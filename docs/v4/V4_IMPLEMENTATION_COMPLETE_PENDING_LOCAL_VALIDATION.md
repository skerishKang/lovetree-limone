# LoveTree V4 — all source ports complete, pending final local validation

## Current state

```text
repository: skerishKang/lovetree-limone
execution_issue: #30
draft_pr: #31
base_main: 590d52ae929fcc483bcfe2f2871a5d03a34ddf16
branch: feat/v4-source-faithful-integration
source_designs: 23 / 23 ported
unique_source_routes: 22
journey_dock: installed across /v4/**
local_validation: NOT RUN
browser_acceptance: NOT RUN
preview_deployment: NONE
merge: NOT AUTHORIZED
```

This document supersedes the earlier phase-status section in
`docs/v4/V4_SOURCE_FAITHFUL_IMPLEMENTATION.md`.

The earlier document remains the design-preservation policy and execution history.
This document is the canonical current implementation-status record.

## Meaning of “ported”

For this V4 branch, `ported` means:

- the supplied HTML is represented by a reachable `/v4/**` React/TSX screen;
- its defining layout, visual language and interaction model have a dedicated implementation;
- it is not counted merely because an HTML file exists under `reference/**`;
- it is not delivered as an iframe;
- V3 visual components and styles are not reused;
- the screen is reachable through the persistent V4 journey dock.

It does **not** yet mean:

- TypeScript compilation has passed;
- the full repository test suite has passed;
- pixel or motion comparison against the source HTML has passed;
- all browser interactions have passed;
- a Cloudflare Preview has been deployed.

Those claims belong only to the final local-validation phase.

## Canonical source state

```text
raw source definitions:
app/components/v4/v4-source-manifest.ts

implemented source IDs:
app/components/v4/v4-implemented-sources.ts

canonical derived registry:
app/components/v4/v4-source-registry.ts
```

The canonical registry requires:

```text
V4 source count = 23
implemented source ID count = 23
unimplemented source count = 0
```

## Implemented product journey

### 1. Entry and first branch

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| Complete manga refinement | `/v4` | warm paper/plant landing, tree-name modal, first discovery form, live result preview |
| Step 2 emotion refined | `/v4/trees/demo/onboarding/emotion` | connected video card, exact timestamp, ±5 seconds, emotion/custom input, memo/date/visibility, success state |
| Step 3 connect next video | `/v4/trees/demo/onboarding/connect` | two-card board, SVG branch, relation reasons, live next-card preview, continue-from-next flow |

### 2. Daily growth and lifecycle

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| Growing tree v5 draggable notes | `/v4/trees/demo` | draggable memory cards, live branch recomputation, diary sync, delete/reparent, zoom/fit |
| Growing tree v6 fullscreen add | `/v4/trees/demo` | three-column workspace, fullscreen mode, same composer in fullscreen drawer |
| Rest and return flow | `/v4/trees/demo/rest` | active/resting transition, preserved records, rest note, return note, quieter tree state |
| Tree pause issue state | `/v4/trees/demo/state` | independent tree status, visibility, issue moments and private notes |

### 3. Graph and time exploration

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| Node graph prototype | `/v4/trees/demo/graph` | draggable nodes, in/out handles, direct connections, minimap, inspector, video modal |
| Obsidian graph | `/v4/trees/demo/map` | dark relationship map, search, emotion filter, organic/radial/timeline layouts, inspector |
| Love nebula | `/v4/trees/demo/nebula` | full-screen emotional nebula, actual 100/300/1000 point density, clusters, selected detail |
| Juyeon timeline | `/v4/trees/demo/timeline` | date chapters, date strip, alternating chronology cards, synchronized media detail |

### 4. Person albums and mandatory separately supplied archives

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| Person albums | `/v4/subjects` | search, subject filters, summary statistics, subject cards and archive entry |
| Motion archive | `/v4/subjects/demo/motion` | wave/orbit/vinyl/diagonal layouts, card selection, vinyl extraction, viewer, keyboard navigation |
| Liquid orbit gallery | `/v4/subjects/demo/orbit` | drag rotation, wheel navigation, keyboard navigation, wave/orbit/free/diagonal modes, bottom dock, detail viewer |
| Accordion album archive | `/v4/subjects/demo/accordion` | 3D book shelf, album opening, accordion panels, selected track, synchronized large viewer |
| Folding person archive | `/v4/subjects/demo/folding` | person-book shelf, page-burst transition, track selection, video/memo two-page spread, playback stop on close |

The four separately supplied files above are first-class product screens, not reference-only files.

### 5. Community discovery

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| Community discovery v2 | `/v4/community` | search, emotion filter, sorting, up-to-three quick comparison, large preview, read-only full tree |

Additional integrated public-tree route:

```text
/v4/community/trees/demo
```

It provides pan, zoom and fit controls without edit or private-note controls.

### 6. Completion, celebration and continued growth

| Source design | V4 route | Defining preserved experience |
| --- | --- | --- |
| 300 moments finale | `/v4/trees/demo/celebrate/300` | 300-point growth replay, moment popovers, heart/flower/tree composition, 300th planting, completion modal |
| Aurora particle heart | `/v4/trees/demo/celebrate/aurora` | particle heart, orbit rings, energy slider, palette changes, particle burst |
| Rainbow memory canopy | `/v4/trees/demo/celebrate/canopy` | category focus, growth replay/progress, 300 leaves, pan/zoom/fit, restart growth |
| Purple bloom graph | `/v4/trees/demo/celebrate/bloom` | 300 selectable petals, synchronized detail, progress replay, re-bloom and fit actions |
| Growing tree 300+ freegraph | `/v4/trees/demo/growth/300-plus` | actual 301+ continuation, free drag, minimap, pan/zoom, add drawer, 500/750/1000 markers |
| Growing tree season archive | `/v4/trees/demo/seasons` | protected archived season, continuing active season, next-season name/date/sentence/theme, representative-memory link |

## Integrated navigation

Every `/v4/**` page is wrapped by:

```text
app/v4/layout.tsx
app/components/v4/V4JourneyDock.tsx
app/styles/v4/journey-dock.css
```

The dock connects the 22 unique source routes without replacing or visually flattening the individual source designs.

## Scope safety

This branch intentionally contains V4-owned files plus V4 documentation and tests.
It must not change:

```text
app/page.tsx
app/v2/**
app/v3/**
app/components/v2/**
app/components/v3/**
app/styles/v3/**
lib/**
db/**
drizzle/**
server/api/**
worker/**
wrangler configuration
```

No API, authentication, database, schema or migration is added in this frontend source-port phase.
V4 currently uses fixture data and V4-only browser storage where continuity is needed.

## Contract tests added

```text
tests/v4-source-faithful-contract.test.mjs
tests/v4-complete-integration-contract.test.mjs
```

They statically enforce:

- all 23 exact source filenames;
- all four separately supplied archives;
- all unique source route files;
- persistent V4 journey navigation;
- no V3 visual dependency;
- no iframe delivery shortcut;
- source-specific interaction markers;
- no protected backend/auth import from V4 pages.

## Single final local-validation gate

Run only after this implementation branch is frozen.

### Repository and dependency gate

```bash
git fetch origin --prune
git checkout --detach <EXACT_PR_31_HEAD>
git status --short
node --version
npm --version
npm ci
```

Expected starting condition:

```text
worktree clean
exact detached head equals PR #31 head
native Linux filesystem preferred
```

### Static and build gate

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

No command may be skipped or converted into a warning-only claim.

### Browser route gate

Open every route below at desktop, tablet and mobile widths:

```text
/v4
/v4/trees/new
/v4/trees/demo/onboarding/emotion
/v4/trees/demo/onboarding/connect
/v4/trees/demo
/v4/trees/demo/rest
/v4/trees/demo/state
/v4/trees/demo/graph
/v4/trees/demo/map
/v4/trees/demo/nebula
/v4/trees/demo/timeline
/v4/subjects
/v4/subjects/demo
/v4/subjects/demo/motion
/v4/subjects/demo/orbit
/v4/subjects/demo/accordion
/v4/subjects/demo/folding
/v4/community
/v4/community/trees/demo
/v4/trees/demo/celebrate/300
/v4/trees/demo/celebrate/aurora
/v4/trees/demo/celebrate/canopy
/v4/trees/demo/celebrate/bloom
/v4/trees/demo/growth/300-plus
/v4/trees/demo/seasons
```

Required technical results:

```text
HTTP/render success for every route
console errors = 0
page errors = 0
failed assets = 0
horizontal overflow = 0 except intentional pan/zoom canvases
invalid nested interactive elements = 0
duplicate DOM IDs = 0
```

### Interaction gate

At minimum, verify:

- landing modal, Escape/backdrop close and discovery continuity;
- timestamp ±5, emotions, visibility and onboarding success states;
- two-card connection and post-success navigation;
- workspace drag, branch recomputation, delete/reparent, zoom/fit, fullscreen and drawer;
- rest/return and independent state/visibility/private-note persistence;
- free graph drag/connect/minimap/video modal;
- map search/filter/layout;
- nebula 100/300/1000 density and cluster selection;
- timeline date/detail synchronization;
- people search/filter and archive entry;
- all four mandatory archive interaction models;
- community compare, preview and read-only public tree pan/zoom;
- all 300 celebration controls;
- 301+ drag/add/minimap and season creation.

### Source-design comparison gate

For every supplied HTML, capture:

```text
source HTML at desktop + mobile
matching V4 route at the same viewport
```

Compare:

```text
layout hierarchy
color and material character
typography scale
card and panel geometry
animation and transition character
primary interaction sequence
full-screen versus embedded spatial treatment
```

V4 must be rejected if a source design was flattened into a generic card/dashboard treatment.

## Allowed final outcomes

```text
V4_FINAL_LOCAL_VALIDATION_PASS
V4_FINAL_CHANGES_REQUIRED
```

Only `V4_FINAL_LOCAL_VALIDATION_PASS` permits an isolated V4 Preview deployment request.
It does not authorize Production deployment or merge by itself.
