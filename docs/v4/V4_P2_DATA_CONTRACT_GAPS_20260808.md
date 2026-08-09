# V4 P2 Data Contract Gaps

**Date:** 2026-08-08  
**Track:** A — Product Contract Integration  
**Status:** P1 audit output / documentation only  
**P1 schema migration:** NONE

## 1. Purpose and boundary

This document records data-contract gaps that are important to the LoveTree product spine but are deliberately **not** schema-migrated in A-track P1.

P1 is limited to server/API privacy and Browse contracts. It does not introduce destructive migrations, Production writes, or new visual behavior.

The following P0 compatibility contract remains authoritative until a later approved migration:

```text
Memory.timestamp = YYYY-MM-DD product date in the current runtime
video playback offset = sourceUrl?t=<seconds>s
```

`Memory.timestamp` must not be repurposed as a video playback position.

---

## 2. Gap summary

| Gap | Current field/state | Target semantic | Recommended field | Priority |
|---|---|---|---|---|
| Connection reason | `memories.parentId` stores topology; no durable reason field | Human reason explaining why one Moment led to the next | `connectionReason` nullable text | HIGH / P2 |
| Dedicated video offset | Playback offset embedded in `sourceUrl?t=<seconds>s` | Numeric playback position independent of source identity | `videoOffsetSeconds` nullable integer | HIGH / P2 |
| Durable canvas x/y | Client/local visual placement only; no DB coordinates | Stable workspace placement across browser/session | `canvasX`, `canvasY` nullable numeric fields | MEDIUM-HIGH / P2 |
| Discovery / record date | `memories.timestamp` stores a `YYYY-MM-DD` product date; `createdAt` is system persistence time | Explicit user discovery date, with record-date semantics separated if later required | `discoveryDate` date; optional later `recordDate` date | HIGH / P2 |

---

## 3. Connection reason

### Current field

- `memories.parentId` durably records which prior Memory/Moment a child is connected to.
- The current schema has no dedicated field for the human-readable relationship reason selected or written in V4 connection UX.

### Overloaded meaning

Without a dedicated field, there is pressure to place a connection reason into `memo`, `title`, or another Memory-content field.

That would overload Moment content with edge semantics. `memo` should remain the note explaining why the Moment itself mattered; `parentId` should remain topology only.

### Target semantic

A durable edge-level explanation such as:

```text
댓글에서 추천받아 찾아봤어요
이 무대를 보고 다음 인터뷰까지 찾아봤어요
```

The value describes **why the child follows the parent**, not what the child Memory contains.

### Recommended field

```text
memories.connection_reason -> API connectionReason
```

Recommended type: nullable text/string.

The semantic belongs on the child Memory because the current relationship model stores the incoming edge through `parentId` on that child.

### API impact

Add optional `connectionReason` to:

- Memory create request
- nested Tree Memory create request
- Memory update request
- Memory detail/list responses

Validation should trim input and apply a bounded maximum length.

### DB impact

Additive nullable text column on `memories`.

No new relationship table is required for the current one-parent model. If LoveTree later supports multiple typed edges between the same Moments, a normalized edge table should be reconsidered instead of extending the child row indefinitely.

### Migration requirement

Additive migration required. No destructive rewrite is required.

Existing rows should remain `NULL`; P2 must not invent reasons from existing `memo` text.

### Backwards compatibility

- `NULL` means “not recorded / legacy connection”.
- Existing clients can ignore the additive response field.
- New clients must not infer a reason from `memo` when `connectionReason` is absent.

### Priority

**HIGH / P2.** It is a core Connected Love Path semantic currently represented only in transient/local UX.

---

## 4. Dedicated video offset

### Current field

P0 preserves exact YouTube position by canonical deep link:

```text
sourceUrl?t=<seconds>s
```

Example:

```text
https://www.youtube.com/watch?v=ScMzIvxBSi4&t=42s
```

`memories.timestamp` is separately validated as `YYYY-MM-DD` and is not a video position.

### Overloaded meaning

`sourceUrl` currently carries both:

1. source identity/location; and
2. playback position.

This works for P0 persistence but couples media source normalization to playback-state semantics.

### Target semantic

Store a source URL and an exact playback offset as independent concepts.

### Recommended field

```text
memories.video_offset_seconds -> API videoOffsetSeconds
```

Recommended type: nullable non-negative integer.

### API impact

Add optional `videoOffsetSeconds` to Memory create/update/read contracts.

During compatibility transition:

- API may accept the numeric field when present;
- readers should prefer `videoOffsetSeconds`;
- readers should fall back to parsing the existing `sourceUrl?t=<seconds>s` form;
- P0 writers may continue emitting the deep-link representation until a coordinated cutover.

### DB impact

Additive nullable integer column on `memories`.

Recommended validation:

```text
videoOffsetSeconds >= 0
```

A DB check constraint may be added if the migration plan confirms compatibility with existing migration tooling.

### Migration requirement

Additive migration required.

A best-effort backfill may parse recognized YouTube `t=` values from existing URLs, but backfill is not required for correctness because URL fallback remains available. No destructive rewrite of `sourceUrl` is required.

### Backwards compatibility

Transitional read rule:

```text
videoOffsetSeconds ?? parseVideoOffset(sourceUrl)
```

Until a later approved cutover, keep the P0 contract:

```text
sourceUrl?t=<seconds>s
```

Do not overload `timestamp` with video seconds.

### Priority

**HIGH / P2.** Exact scene position is part of a remembered Moment and should eventually be first-class data.

---

## 5. Durable canvas x/y

### Current field

No canonical DB field stores V4 workspace coordinates.

Current durable relationship/order fields are:

- `memories.parentId` — relationship topology
- `memories.sortOrder` — deterministic sequence/order

Visual placement remains client/local state in current rich workspace experiences.

### Overloaded meaning

Neither `parentId` nor `sortOrder` can safely represent spatial position. Encoding x/y into localStorage or incidental UI state makes placement browser-specific and non-durable.

### Target semantic

Persist a user-curated Memory position so the same Tree workspace can restore the same arrangement across refresh, browser, and authenticated session.

### Recommended field

Minimal P2 candidate:

```text
memories.canvas_x -> API canvasX
memories.canvas_y -> API canvasY
```

Recommended DB type: nullable numeric/double precision values.

If future product requirements introduce multiple independent layouts per Tree, viewport-specific arrangements, or collaborative layouts, P2 should re-evaluate a separate layout entity rather than prematurely expanding these two fields.

### API impact

Add optional `canvasX` and `canvasY` fields to Memory read/update contracts. Create may accept them but should not require them.

Coordinate updates should remain owner-authorized server writes.

### DB impact

Add two nullable numeric columns to `memories`, or adopt a dedicated layout table only if the multi-layout requirement is approved before implementation.

### Migration requirement

Additive migration required. No backfill is required.

`NULL` means “no curated position; use deterministic/automatic layout”.

### Backwards compatibility

- Existing rows remain valid with `NULL` coordinates.
- Existing clients ignore additive fields.
- New clients must render a stable automatic fallback when coordinates are null.
- Do not derive coordinates from `parentId` or `sortOrder` and persist those guesses as authoritative data without an explicit migration decision.

### Priority

**MEDIUM-HIGH / P2.** Required when durable Tree workspace curation becomes a release gate; not required for P1 privacy/Browse correctness.

---

## 6. First-class discovery date / record date

### Current field

Current runtime contract:

```text
memories.timestamp = YYYY-MM-DD
```

`server/api/validate.ts` validates this value as a calendar date.

Current system persistence time:

```text
memories.createdAt
```

is a server/system timestamp and should not be treated as an editable product date.

### Overloaded meaning

The field name `timestamp` is semantically ambiguous because it can be mistaken for:

- video playback time;
- a general event timestamp;
- discovery date;
- record/journal date.

P0 currently uses it as the user-facing discovery/record date because that is the only compatible date field.

### Target semantic

At minimum, make the user-entered discovery date explicit:

```text
discoveryDate = the calendar day the user discovered/experienced the Moment
```

Keep:

```text
createdAt = immutable/system persistence time
```

If product design later requires a separately editable journal/record date distinct from discovery date, introduce that as another explicit semantic rather than overloading either `createdAt` or video offset.

### Recommended field

Primary:

```text
memories.discovery_date -> API discoveryDate
```

Recommended DB type: PostgreSQL `date`.

Optional later field only if product semantics require it:

```text
memories.record_date -> API recordDate
```

### API impact

P2 should introduce `discoveryDate` in Memory create/update/read contracts.

Compatibility period:

- new readers prefer `discoveryDate`;
- fall back to legacy `timestamp` when needed;
- old clients may continue writing a validated `timestamp` during the transition;
- server normalization must avoid conflicting dual values.

### DB impact

Additive `date` column for `discovery_date`.

Only add `record_date` if product semantics explicitly require discovery and journaling dates to diverge.

### Migration requirement

Additive migration plus optional safe backfill:

- parse only already-valid `YYYY-MM-DD` values from `timestamp`;
- copy them into `discovery_date`;
- keep legacy `timestamp` through a compatibility window;
- defer any destructive drop/rename until all readers and writers have migrated.

### Backwards compatibility

Transitional read rule:

```text
discoveryDate ?? timestamp
```

The old `timestamp` field must continue to mean a date during the transition. It must never be reinterpreted as video seconds.

### Priority

**HIGH / P2.** This removes a core semantic ambiguity while preserving existing records safely.

---

## 7. Recommended P2 sequencing

1. Lock additive API contracts and field names in tests/documentation.
2. Add `connectionReason` and `videoOffsetSeconds` with compatibility readers.
3. Add `discoveryDate`, backfill only valid legacy date values, retain `timestamp` compatibility.
4. Add durable canvas coordinates only when workspace persistence behavior is product-approved.
5. Run schema migration only in an isolated non-production database first.
6. Validate old-client/new-server and new-client/old-data compatibility.
7. Obtain explicit Production migration/deploy approval before any Production DDL or data write.

P1 does none of these schema changes.
