# LoveTree Large Tree Editor Architecture — 300 → 1K → 5K Moments

**Issue:** #172  
**Cross-repository import Epic:** `skerishKang/LoveBud#4024`  
**Shared platform authority:** `skerishKang/LoveBud#4004`  
**Read authority input:** `skerishKang/LoveBud#4028`  
**Domain/order input:** `skerishKang/LoveBud#4026`  
**E2E gate:** `skerishKang/LoveBud#4031`  
**Runtime inputs:** #141, #160, #162  
**Status:** Pre-implementation editor/view architecture. No canonical `/v4` adoption authorized by this document alone.  
**Audited baseline:** `eaaf8ebac7823604592439be98ca43e88da80bce`  
**Last updated:** 2026-08-14

---

## 1. Product decision

One LoveTree may contain:

```text
up to 5,000 Moments
```

Do **not** automatically split a source collection into many Trees merely because the UI cannot render it.

Scale is a presentation/runtime problem, not a reason to change semantic Tree identity.

Core invariant:

```text
5,000 canonical Moments in one Tree
!=
5,000 heavyweight DOM cards, images, iframes and edge labels mounted simultaneously
```

---

## 2. Canonical data boundary

This repository must not create a second writable Tree/Memory/Connection authority.

Consume the shared platform contract from LoveBud/#4004:

```text
canonical Tree
canonical ordered Moments (`sort_order` convergence direction)
canonical Connections
bounded ordered Moment windows
sequence/version authority
```

Presentation may derive:

```text
viewport groups
LOD buckets
clusters
bridge candidates
layout positions
semantic-zoom summaries
search result projections
```

but those are view/runtime state unless a separate product authority promotes them.

Preserve #160:

```text
Node = Moment
Edge = Connection
Cluster = view-only aggregation
Bridge Moment = derived view property
```

---

## 3. Scale modes

The renderer should adapt behavior by size without changing the domain model.

### Mode S — 1 to 300 Moments

Goal: full-feature editing with modest virtualization.

Allowed:

- broad local Moment cache;
- many lightweight visual nodes;
- richer labels in focused regions;
- direct manipulation/editor affordances.

Still avoid mounting an iframe/player for every video Moment.

### Mode L — 301 to 1,000 Moments

Goal: large-Tree exploration.

Required:

- ordered API windows;
- windowed full-detail DOM;
- semantic zoom or equivalent information-density reduction;
- search/direct jump;
- cluster/overview projection where appropriate;
- local/selected Connection emphasis.

#160 already proves a distinct 1,000-node synthetic canvas-3D exploration concept, but it is design evidence rather than 1K canonical production proof.

### Mode XL — 1,001 to 5,000 Moments

Goal: massive collection exploration/editing without whole-tree heavyweight hydration.

Required:

- Tree shell first;
- lightweight overview/LOD first;
- bounded Moment windows from shared read API;
- aggressive label/thumbnail/media suppression outside focus;
- viewport/selection-driven data fetch;
- bounded canonical Connection rendering;
- semantic zoom/search/minimap/direct jump;
- stable selection even when detail windows evict.

---

## 4. Shared runtime primitives to reuse

From #141:

### P1 — Interaction Authority / Gesture Arbiter

Own:

- tap vs drag;
- pointer capture;
- touch scroll priority;
- wheel ownership;
- pointercancel;
- keyboard equivalents.

No large-tree view should invent a second conflicting pointer system merely because it uses canvas/WebGL/DOM.

### P4 — Canonical Selection Synchronizer

Single selected Moment authority across:

```text
overview
canvas/graph
list/search
minimap
inspector
media player
```

Selected Moment identity survives unmount/remount of its visual surface.

### P5 — Responsive Detail Surface

Desktop inspector / mobile drawer owns detailed Moment content.

The graph itself does not need 5,000 accessible full-card DOM nodes if the inspector/list alternative exposes the semantic state correctly.

### P6 — Media Authority

Selected-only audible playback.

Large-tree rule:

```text
active YouTube iframe/player authority <= 1
```

unless a later explicit compare/multi-play product capability is approved.

Background nodes use thumbnails/posters/markers only.

### P7 — Motion / Accessibility Policy

Semantic zoom and camera/graph motion must respect reduced motion.

### P9 — QA harness

Reuse one shared evidence format for viewport, input, accessibility, console and visual review.

---

## 5. Rendering tiers remain view-specific

Do not force every large Tree into WebGL.

Valid implementations may include:

- virtualized DOM/list/card surfaces;
- Canvas 2D;
- software-projected canvas 3D as in #160;
- CSS3D/DOM spatial surfaces;
- true WebGL where justified.

Choose based on product job.

Large-tree architecture standardizes **data/selection/media/windowing/LOD contracts**, not one visual renderer.

---

## 6. Data loading model

Assume shared API authority equivalent to `LoveBud#4028`:

```text
GET Tree shell
→ momentCount
→ momentSequenceVersion

GET bounded ordered Moment window
→ default ~100
→ max ~250
→ cursor or fromOrder range
```

### First paint

Do not wait for every Moment.

Recommended sequence:

```text
Tree shell
→ current overview/first window
→ first interactive selection/search
→ adjacent prefetch only after primary UI is usable
```

### Detail cache

Maintain a bounded client-side LRU/window cache.

Initial architecture target:

```text
3–5 nearby ordered windows
```

Exact byte/object cap is frozen after Gate A measurement.

Eviction never clears canonical selected Moment identity; it only removes cached detail and can re-fetch later.

---

## 7. Direct jump

A user must be able to reach Moment 4,700 without scrolling through 4,699 cards.

Inputs:

- search result;
- minimap/overview click;
- source/order position;
- cluster selection;
- direct Moment link/ref.

Flow:

```text
resolve canonical sort_order / Moment ID
→ fetch bounded window around target
→ update P4 selection
→ move renderer/camera/scroll focus
→ open inspector on demand
```

Do not hydrate all preceding Moments.

---

## 8. Semantic zoom information hierarchy

Reuse #160's principle that zoom changes **meaning/information density**, not only size.

### L0 — Whole Tree

Show:

- Tree mass/shape;
- derived cluster masses or broad regions;
- selected/important markers;
- bounded aggregate corridors;
- almost no individual labels.

### L1 — Region / Cluster

Show:

- cluster anchor Moments;
- selected neighboring clusters;
- Bridge Moment candidates/actual connected bridges;
- limited canonical Connection skeleton;
- more local labels.

### L2 — Moment Field

Show:

- individual lightweight Moment nodes/cards for current region;
- selected/local canonical Connections;
- thumbnails selectively;
- no mass media activation.

### L3 — Inspect/Edit

Show:

- full selected Moment;
- media/source/date/emotion/keywords;
- canonical Connections/WHY NEXT;
- editing actions;
- AI suggestions later as a separate layer.

Not every view needs 3D zoom, but every 5K view needs an equivalent information-density strategy.

---

## 9. Lightweight overview representation

For Mode XL, overview objects must be cheap.

Possible representation:

```text
Moment ref
sort_order
small type/category state
x/y(/z) derived position
selected/cluster/bridge flags
```

Avoid in overview:

- full memo text;
- iframe/player;
- comments/reactions;
- large-resolution image;
- all source metadata;
- long Connection reason text.

If all 5,000 lightweight points can be drawn efficiently in canvas/WebGL under the benchmark, that is allowed. The prohibition is on 5,000 heavyweight surfaces, not on 5,000 tiny visual marks.

---

## 10. DOM/card virtualization

Any list/card editor surface must window full DOM detail.

Recommended initial design budget before benchmarking:

```text
desktop mounted full-detail Moment surfaces: target <= 200
mobile mounted full-detail Moment surfaces: target <= 80
```

These are starting engineering budgets, not final immutable product numbers. Gate A measurements must freeze or revise them explicitly before implementation is declared complete.

Use spacer/window virtualization rather than rendering 5K full cards and hiding them with CSS.

---

## 11. Media budget

Hard initial rule:

```text
active video/audio player = selected media only
```

For YouTube-derived Trees:

- overview: no iframe;
- offscreen detail: no active iframe;
- selected inspector/detail: create/load player as needed;
- selection change: pause/destroy/reuse previous player according to P6;
- visibility/offscreen: pause;
- decode/load error: fallback to safe poster/link behavior.

This keeps 5K source videos from turning into 5K network/media workloads.

---

## 12. Thumbnail/image loading

Thumbnails are also bounded.

Rules:

- lazy load near viewport/focus;
- low-resolution/appropriate provider thumbnail for overview/card;
- avoid preloading 5K images at initial shell;
- cancel/ignore stale loads after rapid jumps;
- preserve layout dimensions to reduce shift;
- use source availability/fallback states.

Gate measurements must record total image requests/bytes during first usable interaction and deep jump.

---

## 13. Connection rendering

Do not draw a full spaghetti graph by default.

At Mode XL:

### Whole Tree

Show only:

- aggregate/derived cluster corridors;
- selected path/Connection summary;
- explicitly important/filtered canonical relationships.

### Region

Show:

- Connections within active region;
- Bridge Moment incoming/outgoing canonical edges;
- bounded neighbor context.

### Selected Moment

Show:

- direct canonical Connections;
- WHY NEXT/reason on demand;
- local neighborhood expansion.

Canonical Connection data may be fetched by selected/window/viewport scope rather than all edges at Tree open.

#162 remains a routing/renderer capability input.

---

## 14. AI relationship overlay

LoveBud #4030 defines a future intelligence layer.

UI must reserve distinct states:

```text
canonical Connection
AI suggested relationship
source/order relationship
```

They must not share indistinguishable styling/interactions.

Default candidate behavior:

- AI relation appears only when user enables/reviews suggestions;
- candidate can be accepted/dismissed;
- accepted action becomes canonical Connection through shared API;
- AI overlay can be hidden without changing canonical graph;
- 5K candidate rendering remains bounded to current region/selection/top-K.

No all-pairs suggestion edges on screen.

---

## 15. Cluster model

Clusters are presentation-derived by default.

Candidate grouping inputs:

- canonical Connections;
- user tags/subjects/emotions;
- source metadata;
- later AI semantic grouping;
- temporal segments.

Do not persist `Cluster` solely to render a 5K Tree.

If the user explicitly creates a named semantic group/branch in the future, that is a separate canonical product decision.

---

## 16. Selection persistence across windows

P4 selection authority stores canonical Moment ID, not local DOM index.

If selected Moment detail is evicted:

```text
selection remains
renderer keeps lightweight selected marker if available
inspector may retain last safe detail or show loading
re-entry fetches target window/detail
```

Do not reset to Moment 0 when a virtualization window changes.

---

## 17. Sequence changes / editor concurrency

Shared read contract uses a Moment sequence version.

If a stale editor window detects sequence change:

```text
stop applying local positional assumptions
→ refresh shell/version
→ re-resolve selected Moment by ID
→ fetch its new order window
```

Do not silently apply reorder against stale positions.

Optimistic UI may exist only if server conflict behavior is explicit and rollback/reconciliation is implemented.

---

## 18. Search model

Large Tree search is first-class navigation.

Search should return bounded hits with enough positioning to jump:

```text
Moment ID
sort_order
safe title/thumbnail snippet
match category
sequence version
```

Search results are not a second selected state; selecting a result updates P4.

Future AI semantic search may share this navigation surface but remains a distinct search mode.

---

## 19. Minimap / overview navigation

A minimap may represent all 5K lightweight positions or derived regions.

It must support:

- current viewport/window indication;
- selected Moment indication;
- direct region jump;
- keyboard/search alternative;
- no requirement to render full labels.

On mobile, minimap can collapse into a compact scrubber/search/jump control rather than consume the canvas.

---

## 20. Mobile behavior

At 390×844 and 320×720 where claimed:

- no permanent wide inspector;
- P5 drawer/bottom sheet owns detail;
- selected Moment remains visible/contextual when drawer opens;
- graph/list gestures must not steal normal page scroll unintentionally;
- touch targets remain accessible;
- direct search/jump is prominent because long manual traversal is expensive;
- full canvas controls have keyboard/semantic alternative on devices that support it;
- no horizontal overflow.

Mode XL mobile may use a simpler 2D/cluster/list projection rather than force a desktop 3D editor into a phone.

---

## 21. Accessibility

Canvas/WebGL pixels cannot be the only semantic interface.

Large-tree view must expose an accessible companion model, such as:

- current/selected region list;
- search result list;
- selected Moment inspector;
- previous/next/direct-connected navigation;
- cluster list where clusters are shown;
- announcements for semantic selection changes where appropriate.

Keyboard users must be able to reach/search/select a Moment without reproducing 3D pointer gestures.

Reduced motion:

- suppress cinematic fly-to where necessary;
- use short/fade/direct focus transition;
- keep semantic level changes understandable.

---

## 22. Error/empty/loading states

Large-tree UI must distinguish:

```text
Tree shell loading
window loading
empty Tree
import still processing
window fetch retryable failure
sequence changed / refresh required
source media unavailable
permission/visibility failure
```

Do not blank the entire Tree because one distant window or thumbnail fails.

---

## 23. Import-progress integration

For #4027 imports, owner may open target Tree before completion.

UI clearly shows:

```text
Importing… 1,250 / 5,000
```

and uses only persisted/available windows.

Rules:

- no public sharing controls while import is incomplete unless canonical policy explicitly allows a completed subset workflow;
- counts/status come from shared backend, not client guesses;
- selection on already-imported Moment remains usable;
- newly committed windows can appear without reloading every previous object.

---

## 24. Publication preflight integration

LoveBud #4029 owns policy.

Editor provides owner-facing review UI for:

```text
public embeddable
public link-only
unlisted review
private/unavailable
unknown/retry
```

Do not tell the user that publishing the LoveTree publishes their private YouTube playlist.

Correct mental model:

> The source playlist remains unchanged. Publication controls this LoveTree and its eligible Moments.

---

## 25. Performance measurement profile

Before Gate A is marked implementation-ready, freeze a reproducible benchmark profile:

```text
browser version
hardware class
viewport
network profile
fixture seed/count
renderer/view ID
exact commit SHA
```

Measure:

- shell response bytes;
- first window bytes;
- time to first usable interaction;
- time to selected detail;
- deep jump latency;
- mounted full-detail surfaces;
- active media elements;
- total initial image requests/bytes;
- JS heap/memory trend where available;
- render/pan/zoom responsiveness;
- long-task count where available;
- console/page errors.

Do not define success from FPS alone.

---

## 26. Initial numeric budgets to validate at Gate A

These are provisional engineering budgets that must be measured and then frozen/revised explicitly:

```text
active audible/video player: <= 1
mounted full-detail Moment surfaces desktop: <= 200
mounted full-detail Moment surfaces mobile: <= 80
ordered API window: <= 250
initial UI must not require fetching all 5K full Moments
initial UI must not request all 5K thumbnails
```

No hard wall-clock latency budget is declared until the benchmark profile is fixed, because local/Preview/production/network conditions differ materially.

Once Gate A baseline is accepted, Gate B/C must meet the frozen budgets or document a reviewed revision.

---

## 27. Gate A — 300 Moments

PASS requires:

- shared ordered read integrated;
- search/direct jump;
- canonical selection P4;
- P6 selected-only media;
- desktop/mobile virtualization budgets measured;
- no horizontal overflow;
- reduced motion;
- keyboard/focus alternative;
- no console/page errors;
- reorder/sequence conflict behavior correct;
- exact count/order verified with LoveBud #4031.

---

## 28. Gate B — 1,000 Moments

PASS additionally requires:

- semantic zoom/region reduction or equivalent proven;
- #160 1K lessons reused where applicable;
- full-detail DOM remains bounded;
- deep jump works across many windows;
- selection survives repeated cache eviction;
- Connection rendering remains local/derived rather than whole-graph spaghetti;
- memory trend stable enough for continued interaction;
- mobile remains usable without desktop-only 3D assumptions.

---

## 29. Gate C — 5,000 Moments

PASS additionally requires:

- one Tree identity retained;
- first usable UI independent of full 5K hydration;
- lightweight overview/cluster or equivalent navigation proven;
- no 5K full-detail DOM;
- no 5K media/player activation;
- no 5K initial thumbnail storm;
- deep jump near final positions;
- repeated selection/window eviction stable;
- sequence refresh after reorder stable;
- publication review works on exception/summary model rather than 5K manual card scan;
- AI layer, if enabled, remains top-K/region bounded;
- cross-repo #4031 backend/UI/privacy gates PASS.

Canonical `/v4` adoption requires separate exact-head review after this evidence.

---

## 30. Design-family integration

This architecture does not choose one winner among all current/new LoveTree designs.

Each Lineage answers:

```text
What is its Product Job?
What scale mode does it support?
What lightweight overview exists?
What is its semantic-zoom hierarchy?
How does it consume P1/P4/P5/P6/P7/P9?
How does it direct-jump/search?
How are canonical vs derived edges shown?
What is its mobile fallback?
```

A beautiful design that requires 5K heavyweight cards fails Mode XL even if its visual fidelity is excellent.

---

## 31. Non-goals

- no backend/API/DB implementation in this architecture PR;
- no second writable data store;
- no forced WebGL migration;
- no 5K full-card DOM;
- no 5K iframe/player creation;
- no persistent Cluster entity from #160;
- no automatic AI Connections;
- no source-order edges promoted to Connections;
- no canonical `/v4` route replacement;
- no Production deploy;
- no mutation of sibling Drive originals.

---

## 32. Implementation split after approval

Recommended future slices:

1. shared large-tree data adapter + P4 selection integration;
2. virtualized ordered list/card reference surface at 300;
3. search/direct jump + sequence-change recovery;
4. P6 media lifecycle hardening;
5. semantic-zoom/overview adapter reusing #160 where appropriate;
6. bounded Connection projection;
7. mobile/accessibility alternative;
8. Gate A evidence;
9. Gate B evidence;
10. Gate C evidence;
11. only then evaluate canonical product-route adoption.

No single giant “5K editor” PR.

---

## 33. Architecture verdict

```text
ONE_TREE_5K = SUPPORTED_ARCHITECTURAL_TARGET
AUTO_SPLIT_TREE_BY_SIZE = NO
FULL_5K_HEAVY_HYDRATION = PROHIBITED
ORDERED_API_WINDOWS = REQUIRED
SEMANTIC_ZOOM_OR_EQUIVALENT_LOD = REQUIRED_FOR LARGE MODES
CANONICAL_SELECTION = SINGLE AUTHORITY
ACTIVE_MEDIA_PLAYER = SELECTED-ONLY, <= 1 INITIAL BUDGET
CLUSTER = VIEW_DERIVED
BRIDGE_MOMENT = VIEW_DERIVED
AI_SUGGESTION != CANONICAL_CONNECTION
SOURCE_ORDER != CANONICAL_CONNECTION
MOBILE_CAN_USE SIMPLER PROJECTION
SCALE_GATES = 300 → 1000 → 5000
CANONICAL_V4_ADOPTION = NOT_YET AUTHORIZED
SOURCE_IMPLEMENTATION = NOT_YET PERFORMED
```
