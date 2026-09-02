# MVP001 Semantic Bridge Contract

Issue: #596  
Status: `DRAFT_CONTRACT_ONLY`  
Source visual mutation authorized: `NO`

## 1. Purpose

This contract defines how the MVP001 shell, Product adapters, and the five parity-locked Source surfaces exchange **semantic state and events** without making Source-owned presentation code the backend/data authority.

The contract is intentionally framework-neutral. MVP001 may remain an isolated-static/vanilla shell while the backend remains the existing Worker/API stack.

## 2. Authority boundaries

```text
DATABASE / API
  owns durable Tree/Memory/Product data

MVP001 PRODUCT ORCHESTRATOR
  owns active semantic context, loading/error state, URL restoration

SOURCE ADAPTER
  owns mapping between canonical data/events and one Source presentation

SOURCE SURFACE
  owns visual geometry, rendering, interaction presentation and accepted Source behavior
```

A Source must never become the durable authority merely because it currently contains demo arrays or editable prototype controls.

## 3. Context schema

Minimum MVP001 context:

```json
{
  "schemaVersion": 1,
  "mvpId": "MVP001",
  "contextRevision": 1,
  "currentStep": "entry",
  "treeId": null,
  "selectedMemoryId": null,
  "selectedRelationshipId": null,
  "navigationOrigin": "shell",
  "viewer": {
    "state": "unknown",
    "uid": null
  }
}
```

### Rules

- `treeId` is the primary journey identity after a Tree is selected.
- `selectedMemoryId`, when present, must belong to `treeId` after backend/read-model validation.
- `selectedRelationshipId` remains nullable until MVP001 explicitly adopts a first-class relationship-edge model.
- `contextRevision` increments when the shell commits a semantic context change.
- Source-local IDs must never be mistaken for canonical DB IDs unless the adapter explicitly maps them.
- Auth tokens must **not** be serialized into bridge messages or URL state.

## 4. URL restoration contract

Recommended canonical URL shape for Productized Alpha:

```text
/mvp/01?step=<step>&tree=<treeId>&memory=<memoryId>
```

Optional future field:

```text
&relationship=<relationshipId>
```

### URL rules

- Unknown `step` -> fail safe to `entry`.
- Invalid/missing `tree` -> shell may show entry/empty state; it must not invent a Tree.
- `memory` without a valid readable `tree` -> ignore/fail closed.
- `memory` not belonging to `tree` -> ignore/fail closed after API validation.
- Private IDs may appear in the browser URL only if the Product privacy model accepts that exposure. Otherwise use opaque IDs or an alternate restoration token.
- Browser back/forward updates the shell context first, then mounts/initializes the Source.

## 5. Bridge envelope

Every semantic message must use a versioned envelope:

```json
{
  "protocol": "lovetree.mvp.bridge",
  "protocolVersion": 1,
  "mvpId": "MVP001",
  "sourceId": "SRC057",
  "frameSessionId": "opaque-per-mount-id",
  "messageId": "opaque-id",
  "type": "MEMORY_SELECTED",
  "contextRevision": 7,
  "payload": {}
}
```

### Mandatory validation

The receiver must reject a message unless all of the following are true:

- exact expected `protocol`;
- supported `protocolVersion`;
- exact `mvpId`;
- allowed `sourceId` for the active frame;
- exact current `frameSessionId`;
- allowed `type`;
- payload schema passes validation;
- sender window equals the active Source frame where browser messaging is used;
- sender origin equals the expected same origin.

Do not use `postMessage(..., "*")` for Product bridge traffic.

## 6. Lifecycle events

### `SOURCE_READY`

Source adapter -> shell after the Source DOM/runtime and adapter are ready to receive initial canonical projection.

Payload:

```json
{
  "capabilities": ["select-memory", "open-memory"],
  "sourceRuntimeVersion": "source-specific-version"
}
```

### `SOURCE_INIT`

Shell -> Source adapter after `SOURCE_READY`.

Payload:

```json
{
  "context": {},
  "projection": {},
  "permissions": {
    "canRead": true,
    "canCreate": false,
    "canUpdate": false,
    "canDelete": false
  }
}
```

### `SOURCE_DISPOSE`

Shell lifecycle signal before unmount when useful. Source teardown must still be safe if this message is not delivered because the iframe can be removed abruptly.

## 7. Core semantic events

### `TREE_SELECTED`

```json
{
  "treeId": "canonical-tree-id"
}
```

Expected producer: primarily SRC064 adapter.

### `MEMORY_SELECTED`

```json
{
  "memoryId": "canonical-memory-id",
  "selectionReason": "user|path|resume|first|search|next"
}
```

### `RELATIONSHIP_SELECTED`

Only enabled if/when a canonical relationship ID exists.

```json
{
  "relationshipId": "canonical-relationship-id",
  "fromMemoryId": "...",
  "toMemoryId": "..."
}
```

### `NAVIGATE`

```json
{
  "targetStep": "memory",
  "memoryId": "optional-canonical-memory-id",
  "origin": "SRC058.openMoment"
}
```

Allowed MVP001 targets:

```text
entry
board
relationships
memory
explore
```

Historical Track handoffs embedded in Sources must not directly navigate to old Product routes. The adapter either maps them to an authorized MVP001 target or reports them as unsupported.

### `DATA_UPDATED`

Used only after a successful canonical backend mutation or confirmed optimistic mutation policy.

```json
{
  "entity": "memory",
  "id": "canonical-id",
  "serverRevision": "optional"
}
```

### `ERROR`

```json
{
  "code": "READ_FAILED",
  "recoverable": true,
  "operation": "load-tree",
  "requestId": "optional-server-request-id"
}
```

Do not pass raw secrets, bearer tokens, database URLs, or unrestricted server error bodies.

## 8. Command events for writable slices

Writable commands should be adapter -> shell/orchestrator requests, not direct Source -> DB writes.

### `CREATE_MEMORY_REQUEST`

Payload maps only to canonical API-supported fields. The shell/API layer decides auth, validation, idempotency and error handling.

### `UPDATE_MEMORY_REQUEST`

Must include canonical `memoryId` and a bounded field patch.

### `SET_CONNECTION_REQUEST`

For the current single-parent model:

```json
{
  "memoryId": "child-id",
  "parentId": "parent-id-or-null",
  "connectionReason": "..."
}
```

If MVP001 later adopts first-class multi-edge relationships, this command must be superseded/versioned rather than silently changing semantics.

### `UPDATE_PRESENTATION_REQUEST`

Reserved for persisted board/layout preferences after Product authority is decided. Do not write presentation state into `memories` ad hoc.

## 9. Source capability matrix

| Source | Input projection | Primary emitted events | Write candidates |
|---|---|---|---|
| SRC064 | Tree summary + resume/first/index Moments | `TREE_SELECTED`, `MEMORY_SELECTED`, `NAVIGATE` | none initially |
| SRC058 | Tree + Moments + relation projection + board presentation | `MEMORY_SELECTED`, `NAVIGATE` | create/update Memory, set connection, presentation |
| SRC056 | Tree relationship/path projection | `MEMORY_SELECTED`, `RELATIONSHIP_SELECTED?`, `NAVIGATE` | none initially |
| SRC057 | selected Memory + nearby/path Memories | `MEMORY_SELECTED`, `NAVIGATE` | update media/content |
| SRC060 | exploration graph projection | `MEMORY_SELECTED`, `RELATIONSHIP_SELECTED?`, `NAVIGATE` | none initially |

Read-only adapters should be completed before writable adapters.

## 10. Projection model principle

The adapter does not have to pass raw DB rows to the Source. It should create bounded presentation projections.

Example Memory projection:

```json
{
  "id": "memory-id",
  "title": "...",
  "note": "...",
  "emotion": ["..."],
  "date": "...",
  "source": {
    "type": "youtube",
    "url": "...",
    "thumbnail": "...",
    "label": "...",
    "videoOffsetSeconds": 12
  },
  "visibility": "private",
  "connection": {
    "parentId": "...",
    "reason": "..."
  }
}
```

A relationship/exploration projection may contain view-derived cluster/path IDs. Such IDs must be namespaced and explicitly marked non-durable unless backed by a canonical DB record.

## 11. Adapter implementation seam

The parity-locked Source files under `src/03_sources/**` remain unchanged.

Productization should introduce adapter/runtime glue outside Source authority. The implementation must explicitly document whether it uses:

- shell-side same-origin instrumentation;
- a Product runtime host/wrapper;
- a generated product-runtime derivative with data/event hooks; or
- another bounded mechanism.

Whichever method is chosen, it must satisfy:

```text
SOURCE_AUTHORITY_MUTATION = NONE
SOURCE_VISUAL_SEMANTICS_CHANGED = NO
ADAPTER_CONTRACT_TESTED = YES
SOURCE_PRODUCT_PARITY_REVIEWED = YES
```

If canonical data cannot be injected without changing Source-owned logic, stop and create a bounded owner-authorized Source extension task rather than silently modifying the Source capsule.

## 12. State restoration sequence

Recommended shell flow:

```text
1. parse URL
2. resolve auth state
3. validate/load Tree
4. validate/load selected Memory if present
5. commit canonical context
6. create active Source iframe
7. establish frameSessionId / bridge listener
8. wait SOURCE_READY
9. send SOURCE_INIT with projection + permissions
10. Source renders/rehydrates selection
11. Source emits semantic events
12. shell updates context + URL and/or performs API actions
13. on step transition, dispose iframe but retain canonical context
```

## 13. Failure behavior

- Bridge protocol mismatch -> fail closed, show shell-level integration error.
- API 401 -> auth/session flow; do not leave writable Source controls pretending success.
- API 403/404 -> remove/clear inaccessible selection safely.
- API 5xx/network -> preserve last confirmed canonical context and expose retry.
- Source runtime error -> shell may remount Source; it must not silently duplicate writes.
- Mutation response uncertain -> use existing idempotency/client-key contracts where available.

## 14. Testing contract

Minimum automated coverage before S6 acceptance:

```text
invalid origin rejected
wrong sourceId rejected
stale frameSessionId rejected
unknown message type rejected
invalid payload rejected
SOURCE_READY -> SOURCE_INIT handshake
Tree context survives frame replacement
Memory selection survives step transition
browser back/forward restores semantic state
memory/tree mismatch fails closed
historical route handoff cannot escape to unauthorized OLD route
```

Writable slices additionally require API authorization, idempotency, retry/failure and visual-state reconciliation tests.
