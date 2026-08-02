---
status: PROPOSED_ARCHITECTURE_CLARIFICATION
authority: Issue #16 and PR #25
version: 0.1
effective_date: pending independent approval
reviewed_main_sha: 9b991409ccf017fbdd1b6c2750d1e6bb247048d2
---

# LoveTree V3 Domain Model — Implementation Clarifications

## 1. Authority and purpose

This document is a normative companion to `V3_DOMAIN_MODEL_DECISION.md` for PR #25.

It closes implementation ambiguities found by comparing the proposed V3 model with the current main schema and V1/V2 API behavior at `9b991409ccf017fbdd1b6c2750d1e6bb247048d2`.

Where this clarification conflicts with an earlier sentence in `V3_DOMAIN_MODEL_DECISION.md`, this clarification controls. Both documents remain proposed until Issue #16 receives an independent architecture verdict and the approved authority is merged.

This change remains documentation-only. It does not modify schema, migrations, API handlers, authentication, UI, Worker configuration, Preview, or Production.

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
- ownership transfer, if later approved, is a dedicated transaction that updates `ownerId` and both owner memberships atomically;
- `collaborationMode = solo` permits only the owner membership;
- switching from collaborative to solo requires all non-owner memberships to be removed first;
- removed memberships are excluded from authorization but retained for audit;
- official status does not grant membership and membership does not grant official status.

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
9. per-Tree Connection serialization is sufficient under concurrent writes.

Required final verdict remains exactly one of:

```text
V3_DOMAIN_MODEL_APPROVED
```

or

```text
CHANGES_REQUIRED
```
