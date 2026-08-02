---
status: PROPOSED_ARCHITECTURE_CLARIFICATION
authority: Issue #16 and PR #25
version: 0.3
effective_date: pending independent approval
reviewed_main_sha: 9b991409ccf017fbdd1b6c2750d1e6bb247048d2
reviewed_sources:
  - db/schema.ts
  - server/api/access.ts
  - server/api/memories.ts
  - server/api/trees.ts
repair_of_review_comment: 5155876362
---

# LoveTree V3 Domain Model — Implementation Clarifications

## 1. Authority and purpose

This document is a normative companion to `V3_DOMAIN_MODEL_DECISION.md` for PR #25.

It closes implementation ambiguities found by comparing the proposed V3 model with the current main schema and V1/V2 API behavior at `9b991409ccf017fbdd1b6c2750d1e6bb247048d2`.

Where this clarification conflicts with an earlier sentence in `V3_DOMAIN_MODEL_DECISION.md`, this clarification controls. Both documents remain proposed until Issue #16 receives an independent architecture verdict and the approved authority is merged.

This change remains documentation-only. It does not modify schema, migrations, API handlers, authentication, UI, Worker configuration, Preview, or Production.

Canonical rules (field definitions, mutation authority matrix, ownership transfer policy, visibility_mode default, sortOrder transitional contract, memoVisibility classifier, parentId exception projection, mixed-version sequencing) are defined in `V3_DOMAIN_MODEL_DECISION.md`. This document specifies enforcement location, implementation order, and operational detail only.

## 2. Security hardening takes precedence over accidental legacy exposure

The current API does not consistently intersect Tree and Memory visibility:

- `/api/community/memories` filters raw Memory visibility without joining Tree visibility;
- readable Tree-memory routes can return child rows without independently applying Memory visibility;
- current access helpers treat a readable Tree as sufficient for a readable Memory.

Those behaviors are implementation defects, not compatibility promises.

Normative decision:

1. Migration and compatibility work must never make a row more public than its stored Tree and Moment policies permit.
2. A row may become less public when required to enforce the parent-child visibility intersection and eliminate an existing privacy leak.
3. “Preserve existing exposure” means preserve legitimate stored intent, not preserve accidental endpoint overexposure.
4. At the compatibility cutover, every V1/V2/V3 public or community read must join or otherwise authorize the Tree before returning a Moment.
5. Community Memory reads require an active public Tree and an active effectively public Moment.
6. Direct Tree-detail reads may return only Moments authorized for that Tree-viewer context.
7. Public serializers must omit owner IDs, membership rows, private/tree-only memo, moderation data, reports, audit data, and private derivation data.

The sentence “No existing row is silently made more public or more private during backfill” is therefore refined to:

> No row is made more public. Privacy-hardening reductions required to enforce stored parent/child intent are permitted and must be reported as an explicit compatibility change.

## 3. Versioned defaults and Tree lifecycle

Defaults are versioned rather than globally rewritten.

### V1/V2 compatibility writes

- Existing V1/V2 Tree-create routes retain their current request and response shape.
- Their omitted `visibility` default remains `public` until a separately approved legacy behavior change.
- Existing rows retain their stored visibility during backfill.

### V3 writes

- A standalone V3 Tree create defaults to `visibility = private` and `status = draft`.
- A V3 atomic Tree-plus-first-Moment create defaults to `visibility = private` and may become `status = active` only after both rows and the initial read model commit successfully.
- An empty or failed onboarding flow remains a private draft.
- Publishing is an explicit owner-authorized transition to `status = active` and `visibility = public|unlisted`.
- `publishedAt` is set on the first successful transition to active public visibility and is not overwritten by later private/public toggles.
- `archived` and `deleted` Trees cannot be published.

## 4. Legacy DELETE compatibility and hard purge

After lifecycle columns exist:

- V1/V2 DELETE endpoints keep their current HTTP response shape but perform soft deletion by default.
- Tree soft deletion updates Tree lifecycle fields and immediately excludes the Tree and children from normal reads.
- Moment soft deletion updates Moment lifecycle fields and soft-deletes all incident Connections in the same transaction.
- Database `ON DELETE CASCADE` remains a hard-purge mechanism only.
- Hard purge is a separate privileged retention operation and is not exposed through ordinary V1/V2/V3 DELETE routes.

This intentionally changes storage semantics while preserving endpoint shape and user-visible deletion behavior.

## 5. Moving a Moment between Trees

Canonical V3 does not permit changing `Moment.treeId`. Moving a Moment is a separate future product operation, not a normal update field.

The current V1/V2 update API accepts `treeId`, so the compatibility adapter must handle that legacy mutation transactionally instead of allowing graph corruption.

For an authorized legacy move between two Trees owned by the same actor, one transaction must:

1. lock or serialize both Tree scopes in stable Tree-ID order;
2. verify source and destination ownership;
3. clear the source Tree cover relation when it references the moved Moment;
4. soft-delete every active incoming and outgoing Connection incident to the moved Moment;
5. move the Moment to the destination Tree;
6. assign a deterministic destination `sortOrder`;
7. set legacy `parentId` to null unless the same request supplies a valid destination-tree parent;
8. when a valid destination parent is supplied, create the corresponding primary Connection after cycle validation;
9. prevent any derived-source or milestone live reference from being silently reinterpreted as belonging to the destination Tree;
10. return the existing V1/V2 response shape.

If the adapter cannot complete all steps atomically, it must reject the mutation with a stable conflict error rather than partially moving the row.

V3 endpoints never expose `treeId` as an ordinary mutable Moment field.

## 6. Collaborative membership model

`tree_memberships` must be fully specified rather than treated as only a `(treeId, userId, role)` join.

Required fields:

```text
id
treeId
userId
role = owner|editor|viewer
status = active|removed
invitedById nullable
createdAt
updatedAt
removedAt nullable
removedById nullable
```

Required invariants:

- one active membership per `(treeId, userId)`;
- `trees.ownerId` is the ultimate owner and has exactly one active `owner` membership;
- an owner membership cannot be removed or demoted by an editor;
- ordinary membership writes cannot change `trees.ownerId`;
- ownership transfer is a dedicated transaction that updates `ownerId` and both owner memberships atomically (enforcement location: #20 auth/API adapter);
- `collaborationMode = solo` permits only the owner membership;
- switching from collaborative to solo requires all non-owner memberships to be removed first;
- removed memberships are excluded from authorization but retained for audit;
- official status does not grant membership and membership does not grant official status;
- Moment mutation authority is resolved from the actor's active membership role and the Moment's preserved `createdById` per the canonical matrix in the Decision document; member removal revokes authority immediately without rewriting authorship.

Invitations and organization verification remain out of scope; #20 may initially create only already-accepted active memberships through an owner-authorized operation.

## 7. Physical cover relation

The canonical API field remains `coverMomentId`, but the first implementation should not place a cross-table same-Tree composite foreign key directly on `trees`.

Use a separate optional relation:

```text
tree_cover_moments
- treeId primary key, FK trees.id ON DELETE CASCADE
- momentId non-null
- createdAt
- updatedAt
- composite FK (treeId, momentId) -> memories(treeId, id) ON DELETE CASCADE
```

The normalized Tree mapper projects this row as `coverMomentId`.

Consequences:

- a Tree has at most one Moment cover;
- a cross-Tree cover is impossible at the database level;
- hard-purging the Moment removes the cover relation without attempting to null the Tree primary key;
- soft-deleting or privatizing the cover Moment does not delete the relation, but public serializers must fall back to a safe `coverUrl` or generated cover;
- setting a cover remains owner/editor authorized and transactionally validates Moment lifecycle.

## 8. Derived-source integrity

`derived_tree_sources` must enforce source identity explicitly.

Required rules:

- `sourceMomentId` requires `sourceTreeId`;
- when both are present, use a composite FK `(sourceTreeId, sourceMomentId) -> memories(treeId, id)`;
- `derivedTreeId` must not equal `sourceTreeId` for the same derivation row;
- at least one of a live source reference or a non-empty approved attribution snapshot is required;
- creating a derivation requires an active public source Tree and active effectively public source Moment at write time;
- later privacy/deletion suppresses live navigation but does not expose or refresh hidden source payloads;
- source hard purge sets nullable live references to null while retaining only the previously approved minimal snapshot;
- a source Moment cannot be interpreted independently of its source Tree.

## 9. Milestone event and per-user receipt separation

A collaborative Tree requires Tree-level qualification and user-level acknowledgement to be separate.

### `milestone_events`

```text
id
treeId
milestoneKey
ruleVersion
triggerMomentId nullable
triggerConnectionId nullable
qualifiedAt
createdAt
```

- unique one-time event on `(treeId, milestoneKey, ruleVersion)` unless a later rule defines repeatable sequence identity;
- qualification is derived from active canonical rows and persisted idempotently;
- deleting the trigger does not erase the historical event.

### `milestone_receipts`

```text
id
milestoneEventId
userId
acknowledgedAt nullable
dismissedAt nullable
lastReplayedAt nullable
createdAt
updatedAt
```

- unique receipt on `(milestoneEventId, userId)`;
- one collaborator acknowledging or dismissing does not suppress the event for another collaborator;
- backfilled historical events create acknowledged receipts only for users for whom replay suppression is intended;
- anonymous public viewers do not create receipts.

The normalized `milestoneState` is actor-specific and combines Tree-level events with that actor's receipts.

## 10. Connection serialization and primary-path writes

The implementation contract for a Connection mutation is:

1. open a database transaction;
2. acquire a transaction-scoped per-Tree advisory lock derived deterministically from `treeId`, or an independently reviewed equivalent serialization primitive;
3. re-read active endpoints and active graph state inside the transaction;
4. validate ownership/editor authority, same-Tree endpoints, lifecycle, uniqueness, and reachability;
5. insert/update/delete the Connection;
6. maintain the primary incoming edge and legacy `parentId` projection in the same transaction;
7. commit before returning the normalized result.

A client-side or pre-transaction cycle check is not authoritative.

## 11. Source-type enum migration

The current physical `source_type` is a PostgreSQL enum. Issue #19 must:

- append approved values without renaming or deleting legacy values;
- use a migration sequence compatible with the deployed PostgreSQL version and Drizzle tooling;
- not assume all enum alterations can be combined with dependent writes in one transaction;
- deploy schema acceptance before enabling V3 writes that use the new enum values;
- keep `person` and `travel` readable for legacy rows while excluding them from the new V3 writer.

## 12. Unlisted link semantics

For the first compatibility release, `unlisted` retains current possession-of-link semantics. No new share-token table is required by Issues #19 or #20.

- unlisted content is excluded from community indexes and search;
- knowing the direct opaque Tree URL is sufficient to request it;
- authorization still intersects Tree lifecycle, Moment visibility, and memo visibility;
- a future revocable share-token design requires a separate approved decision.

## 13. Required independent review additions

The independent reviewer of PR #25 must additionally verify:

1. privacy-hardening behavior is treated as an intentional compatibility correction rather than preserving current endpoint leaks;
2. V1/V2 Tree defaults and V3 private-draft defaults remain separated;
3. legacy Moment Tree moves cannot orphan or cross-link Connections;
4. membership owner invariants prevent privilege escalation;
5. the separate cover relation is implementable with Drizzle and PostgreSQL composite FKs;
6. derived-source Tree/Moment identity cannot drift;
7. milestone acknowledgement is actor-specific on collaborative Trees;
8. soft-delete endpoint semantics and hard-purge separation are complete;
9. per-Tree Connection serialization is sufficient under concurrent writes;
10. Moment authorship (`createdById`) is server-assigned from authenticated actor + membership, never client-supplied, and mutation authority is deterministic from the membership role matrix;
11. ownership transfer prevents orphaned active collaborative Trees and blocks account deletion when transfer fails;
12. personal solo Tree owner deletion follows an approved soft-delete/retention path without orphaning;
13. official Tree ownership changes are server/admin-authorized only;
14. application user identity is tombstoned rather than hard-purged while references exist;
15. `visibility_mode` physical default is `explicit` and legacy inserts cannot silently flip to `inherit`;
16. `sortOrder` is nullable during migration, legacy inserts succeed without it, and `NOT NULL` applies only after verified drain;
17. the ten-step mixed-version sequencing contract is implementable and rollback-safe;
18. `memoVisibility` backfill uses a deterministic classifier with reported exposure deltas;
19. quarantined `parentId` exceptions project `null` until approved remediation;
20. `recordDate` serializes as `YYYY-MM-DD` and legacy serializers never emit `inherit`;
21. optimistic concurrency uses conditional write on `updatedAt` or version;
22. derived Tree creation is idempotent and deletion does not alter source attribution;
23. milestone counts include derived/imported Moments per the canonical count definition;
24. `stage` and `completionDeclaredAt` are deferred to #22 decision gate and not introduced earlier.

Required final verdict remains exactly one of:

```text
V3_DOMAIN_MODEL_APPROVED
```

or

```text
CHANGES_REQUIRED
```

## 14. Moment authorship enforcement (R1)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §5 Moment field catalog (`createdById`) and §5 Moment mutation authority matrix.

Enforcement location and order:

- Schema (#19): add `createdById` as nullable text column on `memories`; no NOT NULL until step 9 of the sequencing contract.
- API adapter (#20): V3 Moment create handler resolves the authenticated principal, verifies active membership (owner or editor), and assigns `createdById` from the verified identity. Client payload cannot supply or override `createdById`; a payload that attempts to do so is rejected as a contract violation.
- Compatibility read mapper (#20): until backfill completes, the mapper returns the Tree owner as the compatibility author for rows where `createdById IS NULL`. After backfill, the mapper returns the stored value.
- Mutation authority check (#20): every Moment update/delete handler resolves the actor's active membership role and the Moment's `createdById`, then applies the canonical matrix. Removed memberships are rejected before any mutation logic runs.
- Audit (#20): owner-initiated edit/delete of another member's Moment inserts an audit row recording both the acting owner membership and the preserved original `createdById`.

Backfill (#19, step 5): solo Tree Moments backfill `createdById = trees.ownerId`. Collaborative Tree Moments backfill from migration-era actor evidence (audit logs, membership history) using a deterministic resolution approved in the migration evidence report. Rows with no resolvable evidence backfill to the Tree owner with `backfillConfidence = low` recorded in the audit ledger.

## 15. Ownership transfer and account deletion enforcement (R2)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §8 (Personal solo Tree owner deletion, Collaborative Tree ownership transfer, Official Tree ownership, Application user identity retention).

Enforcement location and order:

- Account deletion workflow (#20 or dedicated account-service issue): before completing account deletion, enumerate all Trees where `trees.ownerId = :deletingUserId`.
  - Personal solo Trees: transition each to `status = deleted`, `deletedAt = now()`, insert audit row with `action = tree_soft_delete`, `reasonCode = account_deletion`.
  - Collaborative Trees: execute the ownership-transfer transaction (see below). If any collaborative Tree fails transfer, abort the entire account deletion with a stable error.
  - Official Trees: interrupt the deletion; place the Tree under server-side stewardship review; do not transfer or delete via the user-initiated path.
- Ownership-transfer transaction (#20): one serialized transaction per Tree under the per-Tree advisory lock:
  1. verify the departing account is currently the active owner;
  2. select the new owner from active eligible members (editor seniority default, or explicit owner selection);
  3. update `trees.ownerId`;
  4. update the new owner's membership role to `owner`;
  5. update the departing owner's membership to `status = removed` (account-deletion path) or the approved non-owner role (voluntary transfer);
  6. insert audit row with `action = ownership_transfer`, prior owner, new owner, reason code.
- Tombstone transition (#20 or account-service issue): revoke auth credentials; pseudonymize profile display fields; persist the application user row with a tombstone marker; do not hard-purge while any FK reference exists.
- Hard purge (privileged retention job, separate issue): run only after all dependent reachability conditions are drained or re-referenced per the approved retention procedure.

## 16. `visibility_mode` physical default enforcement (R3)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §5 Moment visibility physical compatibility.

Enforcement location and order:

- Schema (#19, step 1): add `visibility_mode` as nullable text/enum column; no DB default yet.
- Backfill (#19, step 5): set all existing rows to `explicit`.
- Compatibility read/write mapper (#20, step 2-3): legacy V1/V2 writes that touch `visibility` atomically set `visibility_mode = explicit`. V3 writes always send an explicit mode.
- DB default (#19, step 9): after null-count = 0 verification, set the physical column default to `explicit` and apply NOT NULL.
- Legacy serializer (#20): never emits `visibility_mode = inherit`; projects the computed effective visibility as `private|unlisted|public`.

Privacy rationale: a V1/V2 legacy insert that omits `visibility_mode` stores `explicit`, preserving the legacy plain `visibility` semantics. A wrong default (e.g., `inherit`) would silently flip effective visibility for legacy writers that do not know about the field.

## 17. `sortOrder` transitional contract enforcement (R4)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §5 Moment field catalog (`sortOrder`) and §12 `sortOrder` migration contract.

Enforcement location and order:

- Schema (#19, step 1): add `sortOrder` as nullable integer; no unsafe physical default.
- Legacy insert (#20, step 2-4): V1/V2 legacy insert that omits `sortOrder` succeeds and leaves the field null (legacy-unassigned).
- Compatibility read mapper (#20, step 2): orders rows by non-null `sortOrder` ascending first, then null tail by `(createdAt, id)` ascending.
- Backfill (#19, step 5): per Tree, assign deterministic values using Tree-local stable ordering (existing `createdAt`, then existing legacy parent/path, then `id`). Idempotent, batched, retry-safe. Null-count verification before cutover.
- Strict constraint (#19, step 9): apply NOT NULL only after old-server drain and null-count = 0.
- V3 write (#20): always writes explicit `sortOrder` computed inside the per-Tree serialized transaction. Simple `MAX+1` outside the lock is forbidden. Final tiebreaker: `(sortOrder, createdAt, id)`.
- Rollback: nullable column stays during application rollback; older binaries ignore it.

## 18. `parentId` exception projection enforcement (A)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §6 Connection constraints (item 10) and §12 `parentId` malformed-row exception quarantine.

Enforcement location and order:

- Migration (#19, step 6): classify each legacy `parentId` row; insert quarantined rows into the exception registry with the raw legacy value preserved verbatim.
- Compatibility read mapper (#20): for quarantined rows, project `parentId = null` on the legacy API response. Expose `exceptionState`/reason code on the V3 read-model view for operator audit.
- Remediation (#20 or operator workflow): only an owner/editor-authorized Connection create with standard cycle/same-tree validation resolves the exception. The projection becomes deterministic only after an active primary Connection exists.
- Legacy serializer (#20): never invents a synthetic parent; never exposes the raw quarantined value on the public API.

## 19. `memoVisibility` deterministic backfill enforcement (B)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §12 Deterministic `memoVisibility` backfill.

Enforcement location and order:

- Backfill job (#19, step 5): run the priority-ordered classifier over each existing Moment's memo-bearing row. Produce exactly one of `private | tree | public` per row.
- Audit ledger (#19): record per-class counts and prior-vs-new effective exposure deltas. Any row whose public exposure class is reduced is logged as an intentional privacy-hardening change in the migration evidence report.
- Verification (#19, step 7): confirm zero rows remain unclassified; confirm no row was broadened.
- Compatibility read mapper (#20): applies the parent-child security intersection using the backfilled `memoVisibility` value.

## 20. Mixed-version migration enforcement (C)

Canonical rule: `V3_DOMAIN_MODEL_DECISION.md` §12 Mixed-version sequencing contract.

Enforcement location and order:

- #19 implements steps 1, 5, 6, 7, 9 (schema, backfill, quarantine, metrics, strict constraints).
- #20 implements steps 2, 3, 4, 10 (compatibility reads, dual-write, legacy-write contract, V3 persistence enable).
- Step 8 (old-server drain) is an operational gate verified by traffic/version heartbeat before #19 step 9 runs.
- Rollback policy: application rollback at any pre-step-10 point removes binaries/flags; additive columns stay. DB column/table drop is not the default rollback path; any drop requires a separate privileged approval.

## 21. Non-blocking findings enforcement

Canonical rules are in `V3_DOMAIN_MODEL_DECISION.md` §13 (Serialization and concurrency) and §16 (Open questions: Derived Tree idempotency, Derived Tree deletion, Stage and completionDeclaredAt).

Enforcement locations:

- Moment delete + Connection write serialization: #20 Moment delete handler acquires the same per-Tree advisory lock used by Connection mutation before soft-deleting incident Connections.
- Derived Tree idempotency: #21 derivation create handler checks the idempotency key / partial unique constraint on `(derivedTreeId, sourceTreeId, createdById)` before inserting; retries return the existing row.
- Derived Tree deletion: #21 derived-Tree delete handler soft-deletes only the derived row; source attribution snapshot and source Tree/Moment state are not altered.
- `recordDate` serialization: #20 API serializer emits `YYYY-MM-DD`; server validation rejects non-conforming payloads.
- Legacy fields `trees.keywords`, `tree_social_counts`: #19 collision inventory records them as retained legacy display/projection fields; #20 does not expose them as V3 canonical search or engagement sources.
- Optimistic concurrency: #20 V3 update handlers issue conditional writes `WHERE updatedAt = :observed` (or `WHERE version = :observed` if an explicit version field is introduced); non-matching precondition returns `409 Conflict`.
- Milestone count scope: #22 milestone qualification counts include derived/imported Moments per the canonical active-row count definition; the count definition is documented in the #22 implementation contract.
- `stage` and `completionDeclaredAt`: deferred to #22 decision gate; no schema, API, or UI code may introduce them before that gate passes.
