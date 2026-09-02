# MVP001 Productization Audit

Issue: #596  
Standing architecture: #565  
Technical MVP predecessor: #591  
Audit base: `dd64fc145c738c2c77fd6d147162bb16a11bc17b`

## 1. Executive finding

`/mvp/01` is a valid **Technical MVP**, not yet a Productized Alpha.

The current shell solves composition safety by loading exactly one parity-locked Source surface in an iframe at a time. It preserves visual/runtime isolation, but the shell only owns step navigation. It does not own a shared Tree, Memory, Relationship, Auth, API, or persistence context.

Current state:

```text
PARITY-LOCKED SOURCE
      ↓ isolated iframe
MVP001 shell
      ↓
step-only URL state
```

Target state:

```text
PARITY-LOCKED SOURCE PRESENTATION
      ↑ canonical data / semantic events
SOURCE ADAPTER
      ↑ validated bridge contract
MVP001 PRODUCT ORCHESTRATOR
      ↑
AUTH + API + BACKEND + DB
```

The first productization slice should **retain iframe isolation**. The existing collision audit in #591 established that direct DOM composition is unsafe due duplicated IDs, conflicting root CSS, global listeners, and concurrent animation loops.

## 2. Shell audit

### Current behavior

`public/mvp/01/shell.js` currently:

- defines five ordered steps: `entry`, `board`, `relationships`, `memory`, `explore`;
- stores only `currentStepIndex` and the active iframe reference;
- removes the prior iframe on transition, including its timers, rAF loops, media, and Source-local state;
- stores only `?step=<id>` in browser history;
- recreates the next iframe from a static Source surface URL.

### Productization classification

| Finding | Classification | Required action |
|---|---|---|
| Active iframe is destroyed on step change | `SOURCE_PRESERVE` + `SHELL_FIX` | Keep teardown for runtime hygiene, but persist canonical semantic context outside the iframe |
| URL contains only `step` | `SHELL_FIX` | Add canonical deep-link state such as `tree`, `memory`, and versioned context |
| No Source-to-shell event contract | `SHELL_FIX` | Add validated bridge protocol |
| No shell-side API client/state | `SHELL_FIX` | Add product orchestrator/data loader |
| No Source readiness handshake | `SHELL_FIX` | Add `SOURCE_READY`/initialization handshake |
| No semantic restoration after back/forward | `SHELL_FIX` | Rehydrate context before/after mounting a Source |

### Important design decision

Do **not** keep all five iframes alive merely to preserve state. Several Source surfaces run continuous canvas/rAF/media logic, and #591 already identified the performance/collision risk of concurrent execution. Canonical state belongs in the product shell/backend, not hidden inside inactive Source runtimes.

## 3. SRC064 — Entry Portal

### Observed presentation semantics

`SRC064` is a 40-Moment welcome/orbit surface with actions including:

- `이어 보던 순간`
- `첫 순간으로`
- `내 트리 보기`
- Moment focus
- previous/next Moment
- continue path
- Moment index/filtering
- Story Book handoff

The Source carries a large inline curated-media/demo payload and local interaction state.

### Product role

`SRC064` should become the **entry/resume selector**, not the owner of durable navigation state.

Canonical inputs likely required:

```text
TreeSummary
recent/continue Memory
first Memory
curated/index Memories
optional path hints
viewer authorization state
```

Canonical events likely emitted:

```text
TREE_SELECTED
MEMORY_SELECTED
NAVIGATE(board|memory|relationships)
REQUEST_CONTINUE
REQUEST_FIRST
```

### Audit classification

| Finding | Classification | Note |
|---|---|---|
| 40-Moment local/demo dataset | `ADAPTER_FIX` | Product runtime must receive canonical Memory data or a bounded projection |
| Inline media assets | `SOURCE_PRESERVE` | Keep as fallback/demo authority until media adapter exists |
| Continue/First/My Tree actions are Source-local | `ADAPTER_FIX` | Map to canonical semantic events |
| Visual orbit geometry | `SOURCE_PRESERVE` | Do not redesign during S5/S6 |
| Large script payload (~1.54 MB) | `SOURCE_PRESERVE` + beta performance audit | Optimize only through separately authorized asset/runtime work after parity safety |

## 4. SRC058 — Living Memory Board

### Observed presentation semantics

`SRC058` exposes the richest editing surface of the five:

- pin/add Moment;
- edit existing Moment;
- connect previous/next;
- enter a WHY NEXT connection reason;
- open Moment viewer;
- next Moment;
- replay selected path / cinema replay;
- filters;
- board themes;
- default pin/card styles;
- undo;
- zoom/pan/layout.

### Product role

`SRC058` should be the main **Tree Moment board/editor**.

Canonical inputs likely required:

```text
Tree
Memory[]
Relationship[] or parent/connection projection
board presentation state
viewer permissions
```

Canonical commands/events likely required:

```text
CREATE_MEMORY
UPDATE_MEMORY
DELETE_MEMORY (if exposed later)
SELECT_MEMORY
CREATE_RELATIONSHIP / SET_PARENT_CONNECTION
UPDATE_RELATIONSHIP_REASON
UPDATE_BOARD_PRESENTATION
NAVIGATE(memory|relationships)
```

### Important persistence gap

The current DB already stores core Memory content, ordering, visibility, source/media fields, `parentId`, and `connectionReason`. It does **not** currently model the editable board presentation state visible in SRC058, such as:

- x/y board position;
- pin style;
- card style;
- board theme;
- optional card rotation/size/z-order;
- board viewport/preferences.

This must be explicitly classified before beta:

1. **ephemeral view state** — not persisted;
2. **per-user preference** — persisted outside canonical Memory identity; or
3. **shared Tree presentation state** — persisted and synchronized across users/devices.

For a real multi-device beta, silently dropping board edits on reload is not acceptable.

### Audit classification

| Finding | Classification | Note |
|---|---|---|
| Add/edit controls currently mutate local demo state | `ADAPTER_FIX` | Must become API-backed commands with optimistic/error policy |
| WHY NEXT fits current `connectionReason` for single-parent relation | `ADAPTER_FIX` | Reuse if single-parent model is accepted |
| Board layout/style state has no current DB authority | `BACKEND_DB_GAP` | Product decision required |
| Undo is local | `ADAPTER_FIX` | Define whether undo is UI-local or server compensating action |
| Cinema/path playback | `SOURCE_PRESERVE` | Derive from canonical relationships, do not rewrite presentation |
| Large inline media payload (~494 KB) | `SOURCE_PRESERVE` + performance audit | Not a canonical data store |

## 5. SRC056 — Relationship Overview

### Observed runtime model

`SRC056` does not currently render a backend relationship graph. Its script deterministically generates a synthetic graph from hard-coded cluster definitions, titles, notes, and WHY NEXT text.

It creates six cluster groups with a total of 288 generated Moments and generates:

- primary paths;
- secondary branches;
- contextual/support edges;
- cross links;
- inter-cluster bridges;
- origin reveal edges.

The graph therefore encodes a **presentation/experience model**, not current canonical database relationships.

### Product role

`SRC056` should be the **relationship/path overview** for the currently selected Tree.

### Critical adapter question

Current canonical DB relationships are primarily:

```text
memory.parentId
memory.connectionReason
```

That is a rooted/single-parent relation. SRC056 visually expresses richer multi-path/cross-link topology.

Before implementation, choose one of these contracts:

**A. Derived tree-only projection**  
Keep DB unchanged. Adapter maps `parentId` chains into SRC056 primary/secondary path visuals. Cross/support/bridge edges are visual/derived only and must never be written back as canonical relationships.

**B. First-class relationship graph**  
Introduce a separate relationship-edge model so one Memory can participate in multiple typed relationships. SRC056 can then visualize real graph edges.

Do not infer B merely because the visual prototype contains cross-links.

### Audit classification

| Finding | Classification | Note |
|---|---|---|
| Synthetic 288-node fixture graph | `ADAPTER_FIX` | Must accept a canonical/derived graph projection |
| Seeded geometry/layout | `SOURCE_PRESERVE` | Reuse as deterministic layout algorithm if possible |
| Open Moment | `ADAPTER_FIX` | Emit selected canonical Memory ID |
| Follow path/branch chooser | `ADAPTER_FIX` | Must use canonical or explicitly view-derived path IDs |
| Cross/support/bridge edges | `BACKEND_DB_DECISION` | Decide derived-only vs first-class edge persistence |

## 6. SRC057 — Memory Detail

### Observed presentation semantics

`SRC057` is a detail-card collection with:

- selected Moment detail;
- date/emotion/source/privacy;
- note;
- WHY NEXT;
- media viewer;
- previous/next Moment;
- media link edit form;
- demo-data disclosure.

Its script begins with a hard-coded `moments` array containing inline thumbnail/media fixtures.

### Product role

`SRC057` has the **best direct fit** with the existing canonical `memories` schema.

Current backend fields already cover most of its product data needs:

```text
id
treeId
parentId
connectionReason
title
memo
source
sourceUrl
sourceType
thumbnail
emotionTags
timestamp
discoveryDate
videoOffsetSeconds
sortOrder
visibility
channel metadata
```

### Adapter mapping

Likely direct mappings:

```text
Moment title          <- memory.title
note                  <- memory.memo
emotion               <- memory.emotionTags
source/media          <- memory.source/sourceType/sourceUrl/thumbnail
privacy               <- memory.visibility
WHY NEXT              <- memory.connectionReason
next/prev              <- Tree memory order or path projection
```

Media-link editing can reuse the existing Memory update API after authorization and validation review.

### Audit classification

| Finding | Classification | Note |
|---|---|---|
| Hard-coded demo Moments | `ADAPTER_FIX` | Replace at product boundary with canonical Memory projection |
| Inline media fixtures | `SOURCE_PRESERVE` | Fallback/demo only |
| Media edit UI | `ADAPTER_FIX` | Bind to authorized Memory update |
| Next/prev semantics | `ADAPTER_FIX` | Define canonical order/path semantics |
| Existing visual/detail interaction | `SOURCE_PRESERVE` | High reuse potential |

## 7. SRC060 — Deep Exploration

### Observed runtime model

`SRC060` currently generates a deterministic 3D-like canvas graph from nine hard-coded clusters totaling 1,000 synthetic Moments, plus 24 derived bridge connections. It supports:

- semantic zoom;
- search;
- emotion filter;
- cluster focus;
- Moment inspect;
- Bridge mode;
- full Moment viewer;
- path preview/play;
- handoffs to Book/Connection/Relationship views.

### Product role

`SRC060` should be a **deep exploration projection** of the same canonical Tree/Memory/Relationship state used by the prior MVP steps.

### Critical beta requirement

The adapter must handle real user cardinalities, including:

```text
0 memories
1 memory
2–10 memories
small relationship trees
large trees
```

The current presentation was authored around a dense 1,000-node universe. A real beta cannot assume dense fixture data. Any small-data fallback that changes visual semantics must be separately reviewed as an integration/product behavior, not hidden inside the Source authority.

### Audit classification

| Finding | Classification | Note |
|---|---|---|
| Synthetic 1,000-node graph | `ADAPTER_FIX` | Needs canonical exploration projection |
| 24 synthetic Bridge records | `BACKEND_DB_DECISION` | Derived-only or persisted relationship edges |
| Search/emotion filters | `ADAPTER_FIX` | Bind to canonical Memory fields |
| Track 55/56/59 handoffs | `SHELL_FIX` | Map historical track handoffs into MVP001 semantic navigation where authorized |
| Continuous rAF/canvas | `SOURCE_PRESERVE` + performance audit | Keep one active Source at a time |

## 8. Cross-surface semantic continuity

The five screens can form one coherent product journey if they share the same canonical identities:

```text
SRC064
Select/resume Tree + Memory
      ↓
SRC058
View/edit Moments for that Tree
      ↓ selectedMemoryId
SRC056
See how that same Memory sits in Tree relationships
      ↓ selectedMemoryId / relationship context
SRC057
Inspect/edit that exact Memory
      ↓ selectedMemoryId
SRC060
Explore surrounding Memories/relationships deeply
```

Minimum shell-owned context:

```text
schemaVersion
mvpId
viewer/auth state
treeId
selectedMemoryId
selectedRelationshipId? (only after relationship model decision)
currentStep
navigationOrigin
revision
```

## 9. Code-quality interpretation

The current Source scripts should **not** be judged as failed refactors merely because they contain large fixture arrays, inline media, global state, or monolithic interaction code. Their current accepted purpose is source fidelity after mechanical split.

For productization, findings must be classified:

- `SOURCE_PRESERVE`: odd/monolithic code that is part of accepted Source behavior;
- `ADAPTER_FIX`: fixture/data/event behavior that belongs at the product boundary;
- `SHELL_FIX`: orchestration/navigation/context/API concerns;
- `BACKEND_DB_GAP`: missing durable product authority;
- `SOURCE_DEFECT_REQUIRES_SEPARATE_OWNER_AUTHORIZATION`: actual Source bug that cannot be solved outside the Source without changing visual/interaction semantics.

This classification prevents product integration from turning into an uncontrolled Source rewrite.

## 10. Recommended implementation order

```text
Slice 1  Contract-only: semantic context + bridge schemas
Slice 2  Shell bridge runtime + test fixture Source, no production Source hooks
Slice 3  SRC057 adapter (best DB fit) end-to-end read-only
Slice 4  SRC058 read-only Tree/Memory board projection
Slice 5  SRC064 entry/resume projection
Slice 6  SRC056 relationship projection
Slice 7  SRC060 exploration projection
Slice 8  authenticated writes (SRC057 media + SRC058 create/edit/connect)
Slice 9  board presentation persistence decision/implementation
Slice 10 membership / relationship-edge / media-storage gaps if actually required
Slice 11 Product parity + web verification + independent review
Slice 12 closed-beta readiness gate
```

The first writable beta slice should come **after** read-only semantic continuity works across all five screens. This minimizes DB/API risk while the adapter contract is still being stabilized.
