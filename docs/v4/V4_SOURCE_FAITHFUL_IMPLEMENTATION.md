# LoveTree V4 source-faithful implementation

## Status

```text
execution_issue: #30
starting_main: 590d52ae929fcc483bcfe2f2871a5d03a34ddf16
branch: feat/v4-source-faithful-integration
product_status: IN_PROGRESS
local_validation: NOT_RUN_BY_POLICY
preview_deployment: NONE
```

V4 is a separate product candidate. Existing V1, V2 and V3 remain unchanged.

## Product-owner correction embodied by V4

The supplied HTML files are completed design assets. They are not an inspiration pool to be flattened into a generic product shell.

V4 therefore follows these rules:

1. Visible layout, palette, typography, card geometry, texture, flower/branch treatment, animation and modal depth come from each source HTML.
2. Integration happens through route, state and data continuity. Distinct source screens are not made visually identical.
3. React may normalize state, accessibility and reusable mechanics only.
4. V3 components and styles are not visual dependencies of V4.
5. An HTML file stored under `old/reference/**` is not implemented until its design is reachable in `/v4/**`.
6. The four separately supplied archive HTML files are mandatory full-screen product experiences.
7. Local execution, full tests, browser acceptance and Preview deployment occur only after all implementation phases are complete.

## Source coverage

The canonical machine-readable list is:

```text
app/components/v4/v4-source-manifest.ts
```

It contains exactly 23 LoveTree UI/UX HTML sources. Every entry has:

- exact source filename
- V4 route
- product role
- required visual and interaction elements
- explicit `planned` or `implemented` status
- separate-supply designation where applicable

The contract test is:

```text
tests/v4-source-faithful-contract.test.mjs
```

It prevents:

- omission of one of the 23 files
- loss of one of the four separately supplied archive files
- accidental import of V3 visual code
- iframe-only delivery
- declaring the v5/v6 workspace implemented while it is still a boundary route

## Phase 1 — entry and first branch

### Implemented source ports

| Source | V4 route | Preserved mechanics |
| --- | --- | --- |
| `lovetree-complete-manga-refinement(4).html` | `/v4`, `/v4/trees/new` | paper/plant landing, branch cards, tree-name modal, Escape/backdrop close, discovery form, live result preview |
| `lovetree-step2-emotion-refined(6).html` | `/v4/trees/demo/onboarding/emotion` | four-step progress, connected video card, exact timestamp, -5/+5 seconds, emotion presets/custom input, 140-character memo, date, visibility, success/edit state |
| `lovetree-step3-connect-next-video(6).html` | `/v4/trees/demo/onboarding/connect` | two-card connection board, SVG branch, live next-card preview, relation reasons, 140-character memo, success state, continue-from-next flow |

### Data continuity

Phase 1 uses V4-owned browser fixture keys only:

```text
lovetree-v4-tree-name
lovetree-v4-discovery
lovetree-v4-emotion
lovetree-v4-connection
```

No existing API, database, authentication, schema or migration is changed.

### Explicit unfinished boundary

`/v4/trees/demo` currently exists only to prevent a broken post-onboarding link. It labels itself as temporary and is not counted as the v5/v6 workspace implementation. It must be replaced during Phase 2.

## Remaining implementation order

1. `growing-tree-v6` workspace with all retained v5 drag/diary mechanics
2. rest and pause/publicity lifecycle screens
3. node graph, relationship map, nebula and timeline
4. person albums
5. four separately supplied archive screens
6. community discovery
7. 300 finale, optional celebration themes, 300+ growth and seasons
8. final local validation, browser acceptance and isolated V4 Preview deployment

## Frozen scope

Until the frontend source ports are complete, do not modify:

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

## Current validation claim

No runtime, build, browser or visual acceptance claim is made at this stage. Only repository-level source inspection and contract creation have occurred. Final execution validation is intentionally deferred to the single local-validation phase requested by the product owner.
