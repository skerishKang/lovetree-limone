# MVP001 Productization Backlog

Issue: #596  
Status: `PLANNING`  
Target progression: `Technical MVP -> Productized Alpha -> Data Alpha -> Beta Candidate -> Closed Beta`

## Operating rule

Each slice must remain independently reviewable. Do not combine Source visual changes, adapter changes, backend/schema changes, and release/deployment changes in one PR unless the issue explicitly authorizes that coupling.

Every implementation PR must report:

```text
CURRENT_MAIN
BASE_SHA
HEAD_SHA
SOURCE_IDS_USED
SOURCE_S0_S4_STATUS
SOURCE_VISUAL_FILES_MUTATED
ADAPTER_FILES_MUTATED
MVP_COMPOSITION_FILES_MUTATED
BACKEND_AUTHORITY_CHANGE
DB_AUTHORITY_CHANGE
AUTH_AUTHORITY_CHANGE
PRODUCTION_MUTATION
```

## Slice A — Contract lock

**Goal:** turn the audit docs into executable contracts without touching Product Sources.

Scope:

- semantic context schema;
- bridge envelope validation;
- allowed Source IDs/event types;
- URL parse/serialize contract;
- fail-closed validation tests.

Expected files: shell/productization contract + tests only.

Acceptance:

```text
SOURCE_VISUAL_FILES_MUTATED = NO
BACKEND_AUTHORITY_CHANGE = NO
DB_AUTHORITY_CHANGE = NO
invalid bridge messages fail closed
URL round-trip tests pass
```

## Slice B — Shell Product Orchestrator, fixture-only bridge

**Goal:** prove shell-owned semantic continuity before binding any real Source.

Scope:

- shell-owned canonical context;
- frame session lifecycle;
- `SOURCE_READY -> SOURCE_INIT` handshake;
- fixture/test iframe that emits selection/navigation events;
- back/forward restoration;
- active-frame origin/source/session validation.

Do not instrument SRC056/057/058/060/064 yet.

Acceptance:

- Tree and Memory context survive iframe replacement;
- stale frame events rejected;
- old frames cannot mutate new context;
- no tokens/secrets in bridge payloads;
- shell teardown behavior remains bounded.

## Slice C — Existing API read client

**Goal:** connect Product orchestrator to existing read APIs without Source writes.

Scope:

- Tree read;
- Memory list/detail read;
- API loading/error/401/404 handling;
- auth-token attachment through Product auth boundary;
- bounded read models/projections.

No DB/schema change.

Acceptance:

- no direct Source -> API call;
- shell/backend read state is canonical;
- unreachable/inaccessible Tree fails closed;
- selected Memory validated against Tree.

## Slice D — SRC057 read-only adapter

**Why first:** best direct fit to current `memories` schema.

Goal:

- initialize SRC057 from one canonical selected Memory plus neighboring/path context;
- emit `MEMORY_SELECTED` / `NAVIGATE` back to shell;
- preserve accepted Source visual semantics.

Acceptance:

- demo data is not treated as durable authority;
- canonical title/note/emotion/media/privacy/WHY NEXT render correctly;
- source/product visual parity reviewed;
- no writable control reports false success.

## Slice E — SRC058 read-only adapter

Goal:

- canonical Tree/Memory board projection;
- selection and open-Memory handoff;
- relationship reason rendering from current parent model;
- no persisted add/edit/layout writes yet.

Acceptance:

- same `treeId`/`memoryId` as SRC057;
- read-only controls have explicit disabled/non-persistent behavior if writes are not yet connected;
- no local demo mutation is presented as server persistence.

## Slice F — SRC064 entry/resume adapter

Goal:

- select/open current Tree;
- resume Memory;
- first Memory;
- navigate into board/detail while preserving canonical identity.

Acceptance:

- `TREE_SELECTED` and `MEMORY_SELECTED` map to canonical IDs;
- `continue` does not depend on ephemeral Source state;
- reload/deep-link produces deterministic resume behavior.

## Slice G — SRC056 relationship projection

Default first-beta policy: **derive from `parentId + connectionReason`**, no new relationship table.

Goal:

- map actual Tree Memories into relationship/path presentation;
- select canonical Memory;
- navigate to Memory detail/explore.

Acceptance:

- all displayed canonical edges correspond to real parent relations unless explicitly marked view-derived;
- cross/support/bridge presentation edges cannot accidentally become DB writes;
- sparse Trees have reviewed behavior.

If this cannot preserve the Source presentation without misleading users, stop and open a bounded Product/Source extension decision instead of inventing fake graph authority.

## Slice H — SRC060 exploration projection

Goal:

- map actual Tree Memories/derived relations into deep exploration;
- search/filter canonical fields;
- select/open the same canonical Memory IDs;
- map historical handoffs to authorized MVP001 navigation.

Acceptance:

- 0/1/small/medium/large Tree states tested;
- no assumption that real users have 1,000 Memories;
- derived clusters/bridges explicitly non-durable unless backed by canonical relations;
- continuous canvas runtime remains bounded to active frame.

## Slice I — Full read-only Productized Alpha gate

Goal: one real readable Tree completes all five steps.

Journey:

```text
SRC064 select/resume Tree/Memory
 -> SRC058 board
 -> SRC056 relationships
 -> SRC057 exact Memory detail
 -> SRC060 deep exploration
```

Acceptance:

- same Tree identity end-to-end;
- selected Memory continuity end-to-end;
- URL/back-forward restoration;
- auth/404/network/empty handling;
- source/product parity reviewed on desktop + mobile;
- exact-head CI green.

Only after this slice is accepted should write integration begin.

## Slice J — SRC057 canonical update writes

Goal:

- bind media/content editing to existing Memory update API;
- authorized writes only;
- reconcile server response into shell and Source projection.

Acceptance:

- 401/404/validation/network failures visible;
- no optimistic success without server confirmation policy;
- stale/retry behavior defined;
- existing URL validation remains enforced.

## Slice K — SRC058 Memory create/update/connect writes

Goal:

- create Memory;
- edit Memory;
- connect parent + WHY NEXT;
- map undo semantics explicitly.

Reuse existing APIs and `clientKey`/sort-order safety where applicable.

Acceptance:

- no duplicate create on uncertain retry;
- same-Tree parent validation enforced server-side;
- UI state reconciles to canonical server data;
- failed writes do not remain visually committed as if durable.

## Slice L — Board presentation authority decision

This is a Product decision gate, not automatically a schema PR.

Choose exactly one:

```text
EPHEMERAL
PER_USER_PERSISTED
SHARED_TREE_PERSISTED
MIXED (user prefs + shared Memory placement)
```

If persistence is required, create a dedicated DB/API migration PR with explicit rollback and compatibility evidence.

## Slice M — Collaboration decision

Default first-beta scope: single owner.

If closed beta requires shared family editing, implement in a separate bounded track:

- `tree_members` / invitations / roles;
- centralized authorization policy;
- route/API tests for owner/editor/member/viewer;
- invitation lifecycle;
- private Tree access regression.

Do not mix this into the bridge implementation.

## Slice N — Relationship graph decision

Default first-beta scope: single-parent relation.

Only introduce first-class multi-edge relationship storage if real Product behavior requires it. If adopted, define coexistence/supersession with `parentId` before migration.

## Slice O — Media upload decision

Default first-beta scope: external URLs / YouTube / image URL / text note.

If upload is required, treat object storage, validation, lifecycle, quota and deletion as a separate subsystem. Do not store binary media in the existing Memory row.

## Slice P — Beta release controls

Goal:

- MVP001-specific read/write flags;
- optional closed-beta allowlist;
- safe disable/rollback path;
- no global API consumer regression.

No production enablement in the implementation PR itself unless separately authorized.

## Slice Q — Beta hardening

Required areas:

- CSP / iframe / bridge security;
- XSS/URL handling;
- accessibility;
- mobile performance/memory;
- Source large inline asset behavior;
- API latency/error budget;
- frontend/server observability;
- privacy/data deletion/export procedures;
- migration backup/restore evidence if DB changed.

## Slice R — Beta Candidate gate

A Beta Candidate must demonstrate:

```text
PRODUCT_SEMANTIC_CONTINUITY = PASS
AUTH_READ_PATH = PASS
AUTHORIZED_WRITE_PATH = PASS (if writes in scope)
SOURCE_PRODUCT_PARITY = PASS
DESKTOP_BROWSER_E2E = PASS
MOBILE_BROWSER_E2E = PASS
SECURITY_REVIEW = PASS
ACCESSIBILITY_BLOCKERS = NONE
PERFORMANCE_BLOCKERS = NONE
OBSERVABILITY = READY
ROLLBACK_DISABLE_PATH = TESTED
DB_MIGRATION_GAP = NONE or VERIFIED
PRIVACY_OPERATIONAL_GAP = NONE
```

## Slice S — Closed Beta

Only after Beta Candidate acceptance:

- enable for bounded real users;
- monitor errors/latency/funnel;
- collect Product usability findings separately from Source fidelity findings;
- retain a one-step disable/rollback path;
- do not broaden to public beta merely because the closed-beta deployment is technically stable.
