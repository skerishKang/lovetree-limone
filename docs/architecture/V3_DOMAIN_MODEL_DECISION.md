---
status: PROPOSED_ARCHITECTURE_DECISION
authority: Issue #16
version: 0.1
effective_date: pending independent approval
source_main_sha: 9b991409ccf017fbdd1b6c2750d1e6bb247048d2
---

# LoveTree V3 Canonical Domain Model Decision

## 1. Purpose and authority

This document defines the implementation-ready shared-core model for LoveTree V3 while preserving V1/V2 compatibility.

Authority order:

1. `docs/product/LOVETREE_PRODUCT_SPEC.md`
2. this approved architecture decision after review and merge
3. version-specific implementation contracts
4. Issues and PR execution contracts
5. supporting analyses and prototypes

Inputs reviewed:

- `docs/product/LOVETREE_PRODUCT_SPEC.md`
- `docs/product/PRODUCT_DOCUMENT_HIERARCHY.md`
- `docs/v3/V3_HTML_TSX_INTEGRATION_ANALYSIS.md`
- PR #11 draft `V3_PRODUCT_CONTRACT.md`, `V3_SHARED_CORE_GAPS.md`, and V3 preview types at `3532d689ee841eccdf92ce069cc0ac603b1e4c02`
- current `db/schema.ts` and API contracts at main `9b991409ccf017fbdd1b6c2750d1e6bb247048d2`

This decision is architecture/documentation only. It does not itself modify schema, migrations, API handlers, UI code, or deployments.

## 2. Canonical terminology

### Tree

A subject-centered collection representing the accumulated journey around a person, work, trip, study, relationship, or other subject.

### Moment

The primary product unit: a remembered occurrence in which the user's heart or attention moved. A Moment may reference a video, image, article, song, book, performance, offline event, or no external source at all. The source is evidence and context; it is not the product unit.

### Connection

A stored directed explanation of why one Moment led to another. It is not an emotion tag, not merely a parent pointer, and not an inferred visual edge without persisted meaning.

The physical legacy table may remain named `memories` during compatibility migration, but the canonical domain/API/UI term is **Moment**.

## 3. Entity relationships

```text
User 1 ── * Tree
Tree 1 ── * Moment
Tree 1 ── * Connection
Moment 1 ── * Connection (from)
Moment 1 ── * Connection (to)
Tree 1 ── * TreeMembership
Tree 1 ── * DerivedTreeSource
Tree 1 ── * MilestoneEvent
```

A Tree is presented visually as a tree, but its canonical structure is a directed causal graph. A Moment may have multiple incoming and outgoing Connections. Self-links and cycles are invalid.

## 4. Tree field catalog

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `ownerId` | text, non-null | none | ultimate owner |
| `clientKey` | text, nullable | null | idempotent create compatibility |
| `treeType` | `personal | official | collaborative`, non-null | `personal` | approved equivalent to fan/official/collaborative |
| `subjectType` | `person | work | travel | study | relationship | other`, nullable during migration | null | required for new V3 writes |
| `subjectName` | text, nullable during migration | null | required for new V3 writes |
| `title` | text, non-null | none | user-facing Tree title |
| `description` | text, nullable | null | canonical Tree summary; current physical `memo` may remain as compatibility storage initially |
| `coverMomentId` | text, nullable | null | preferred cover derived from a Moment |
| `coverUrl` | text, nullable | null | uploaded/external fallback |
| `coverAlt` | text, nullable | null | accessibility text |
| `visibility` | `private | unlisted | public`, non-null | new V3 API: `private` | existing rows retain their current value |
| `status` | `draft | active | archived | deleted`, non-null | existing rows: `active` | lifecycle and soft deletion |
| `createdAt` | timestamptz, non-null | DB now | database lifecycle only |
| `updatedAt` | timestamptz, non-null | DB now | database lifecycle only |
| `publishedAt` | timestamptz, nullable | null | first public publication |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

### Tree type rules

- `personal`: ordinary user-created Tree, including fan journeys and non-fan subjects.
- `official`: server/admin-assigned only; users cannot self-declare it.
- `collaborative`: uses explicit membership and role checks.

Collaborative Trees use `tree_memberships(treeId, userId, role, createdAt, updatedAt)` with `role = owner | editor | viewer`. `ownerId` remains the ultimate owner.

## 5. Moment field catalog

The first migration must not destructively rename the physical `memories` table.

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `treeId` | text, non-null | none | owning Tree |
| `clientKey` | text, nullable | null | retry/idempotency compatibility |
| `title` | text, non-null | generated or supplied | non-empty in V3 API |
| `recordDate` | date, nullable | null | user's remembered/recorded date |
| `sourceType` | controlled text, nullable | null | source is optional |
| `sourceUrl` | text, nullable | null | submitted URL |
| `sourceCanonicalUrl` | text, nullable | null | normalized canonical URL |
| `sourceTitle` | text, nullable | null | external content title, distinct from Moment title |
| `sourceProvider` | text, nullable | null | YouTube, Instagram, publisher, offline, etc. |
| `sourceExternalId` | text, nullable | null | provider identifier |
| `sourceAttribution` | text, nullable | null | approved author/channel/creator display attribution |
| `thumbnailUrl` | text, nullable | null | canonical thumbnail field |
| `startSeconds` | integer, nullable | null | media interval start |
| `endSeconds` | integer, nullable | null | media interval end |
| `primaryEmotion` | text, nullable | null | representative emotion |
| `emotionTags` | string array/json array, non-null | `[]` | emotional states only |
| `memo` | text, non-null | empty | user-authored narrative |
| `visibility` | `inherit | private | unlisted | public`, non-null | new V3 API: `inherit` | effective access cannot exceed Tree access |
| `memoVisibility` | `private | tree | public`, non-null | new V3 API: `private` | independent memo exposure control |
| `sortOrder` | integer, non-null | migration-assigned | deterministic ordering |
| `canvasX` | integer, nullable | null | optional layout coordinate |
| `canvasY` | integer, nullable | null | optional layout coordinate |
| `status` | `active | archived | deleted`, non-null | existing rows: `active` | lifecycle |
| `createdAt` | timestamptz, non-null | DB now | database creation time only |
| `updatedAt` | timestamptz, non-null | DB now | database update time only |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

Approved source categories for new writes describe evidence/media, not subjects:

```text
youtube, video, song, audio, image, article, book, social,
performance, event, offline, text, link, other
```

Legacy enum values such as `person` and `travel` remain readable during migration but are not offered by the new V3 writer.

## 6. Connection field catalog

Add a first-class `connections` entity.

| Field | Type / nullability | Default | Decision |
|---|---|---|---|
| `id` | text, non-null | generated | stable identity |
| `treeId` | text, non-null | none | owning Tree |
| `fromMomentId` | text, non-null | none | directed source Moment |
| `toMomentId` | text, non-null | none | directed target Moment |
| `relationType` | controlled text, non-null | none | relation taxonomy, not emotion taxonomy |
| `relationLabel` | text, non-null | none | human-readable causal reason |
| `relationMemo` | text, nullable | null | fuller explanation |
| `relationEmotionBefore` | text, nullable | null | emotional state before transition |
| `relationEmotionAfter` | text, nullable | null | emotional state after transition |
| `sortOrder` | integer, non-null | assigned | deterministic outgoing-edge order |
| `createdById` | text, non-null | actor | collaborative audit/ownership |
| `status` | `active | deleted`, non-null | `active` | soft deletion |
| `createdAt` | timestamptz, non-null | DB now | lifecycle timestamp |
| `updatedAt` | timestamptz, non-null | DB now | lifecycle timestamp |
| `deletedAt` | timestamptz, nullable | null | soft deletion marker |

### Connection constraints

1. `fromMomentId != toMomentId`.
2. Both endpoints must belong to `treeId`; use composite keys/FKs such as `(tree_id, id)` rather than application-only checks.
3. The actor must be the owner or an editor of the Tree.
4. Only one active directed edge per `(treeId, fromMomentId, toMomentId)` unless a later approved decision permits parallel edges.
5. The service layer rejects a write that creates a cycle.
6. `custom` requires a trimmed non-empty `relationLabel`; placeholder values such as `직접 입력` are invalid persisted meanings.
7. Relation/source/discovery categories cannot be written into `primaryEmotion` or `emotionTags`.

`relationType` remains an application-managed dictionary rather than a PostgreSQL enum so product language can evolve without destructive enum migrations.

Initial categories:

```text
comment_follow, fan_recommendation, curiosity, skill_check,
personality_check, same_work, direct_search, reaction_confirmation,
return_after_rest, custom, other
```

## 7. Visibility and access-control matrix

Effective access is the intersection of Tree, Moment, and memo policy. A child entity never broadens its parent.

| Context | Tree | Moment | Memo |
|---|---|---|---|
| owner | all non-purged | all non-purged | all non-purged |
| editor | member-authorized | member-authorized | member-authorized |
| viewer member | membership-authorized | effective Tree/Moment access | effective memo access |
| unlisted link viewer | unlisted/public Tree only | `inherit`, `unlisted`, or `public` subject to Tree | `tree` or `public` |
| anonymous public | public Tree only | effective public Moment only | public memo only |
| community index/card | public Tree only | public Moment only | public memo only; `tree` memo excluded |
| derivation | public Tree and public Moment only | public only | public-only fields and approved attribution |

Rules:

- Private Tree: owner and authorized members only, regardless of Moment flags.
- Unlisted Tree: link-authorized detail; no public indexing.
- Public Tree: anonymously readable subject to child policy.
- Moment `inherit`: follows Tree visibility.
- Moment `private`: owner/editor only.
- Moment `unlisted`: available only in authorized/unlisted Tree context and excluded from public indexes.
- Moment `public`: public only when the Tree is also public.
- Memo `private`: owner/editor only.
- Memo `tree`: visible in full Tree detail to an already authorized Tree viewer, but excluded from community cards, search indexes, exports, and derivation payloads.
- Memo `public`: included only when the effective Tree and Moment are public.

Authorization predicates must run before community joins and aggregates. An index or social-count row is not authorization.

## 8. Lifecycle and deletion

- Default deletion is soft deletion.
- Soft-deleting a Tree immediately removes it and all children from normal reads; child rows remain for recovery/audit until a separately authorized purge.
- Soft-deleting a Moment soft-deletes all incident Connections in the same transaction.
- Restoring a Moment does not automatically restore Connections; reconnection is explicit.
- Hard purge may use FK cascade only after retention/restore policy authorizes it.
- Derivation live references use nullable FKs plus approved attribution snapshots so source purge does not erase lawful attribution history and does not expose newly private content.

## 9. Community and derivation

Use a first-class `derived_tree_sources` relation rather than overloading Tree memo or keywords.

Fields:

```text
id
derivedTreeId
sourceTreeId nullable
sourceMomentId nullable
sourceUrlSnapshot nullable
sourceTitleSnapshot nullable
attributionSnapshot nullable
createdById
createdAt
```

A derivation can be created only from an effectively public source Tree and public source Moment. Snapshot only information approved for public display at derivation time. If the source later becomes private or deleted, the derived Tree remains, the live link is suppressed, and only the approved attribution snapshot remains.

Ownership boundaries:

- likes, comments, saves, and reports belong to the acting account;
- moderation status belongs to the target content and moderator workflow;
- saves are private user state unless explicitly shared;
- reports are never exposed through public product responses;
- public serializers omit owner IDs, memberships, private memo, moderation, and internal audit fields.

## 10. Milestones

Moment and Connection counts are derived from active canonical rows. Mutable count truth is not persisted solely for milestone qualification.

Persist only idempotent milestone event and acknowledgement state:

```text
treeId
milestoneKey
ruleVersion
triggerMomentId nullable
triggerConnectionId nullable
qualifiedAt
acknowledgedAt nullable
dismissedAt nullable
replay metadata if approved
idempotency key
```

Rules:

- refresh, retries, and multiple tabs cannot create duplicate events;
- deleting a triggering Moment does not erase a historically earned event, although current counts may fall;
- backfilled histories must not force old celebrations on first login; prior qualifying events are inserted as historical/already acknowledged;
- the 300th Moment is dismissible and replayable and never a payment wall.

## 11. Existing-schema collision map

| Legacy field | Collision | Decision |
|---|---|---|
| `memories.timestamp` | may mean date, DB time, or media position | preserve untouched initially; never blindly map |
| `memories.parentId` | structural pointer without causal meaning | compatibility projection only; canonical relation is Connection |
| `trees.artist` | may be subject name | migrate conservatively toward `subjectName` |
| `trees.memo` | Tree description | distinguish from Moment memo and relation memo in APIs |
| `memories.source` | title/provider ambiguity | split into explicit source fields |
| `memories.thumbnail` | URL field with legacy name | canonical name becomes `thumbnailUrl` |
| `groupName` | organizational grouping | not a substitute for `subjectName` |
| current `public` defaults | unsafe for new private-first flow | preserve existing rows; new V3 API sends explicit safe defaults |

## 12. Migration and backfill strategy for Issue #19

1. Add fields and tables only; do not rename or drop in the first migration.
2. Existing Trees: `treeType=personal`, `status=active`; derive `subjectName` conservatively from `artist`, then `groupName`, then `title`; use `subjectType=other` when deterministic mapping is unavailable.
3. Existing Moments: `status=active`; preserve current visibility; set memo visibility to preserve existing effective exposure (`private -> private`, `unlisted -> tree`, `public -> public`).
4. Do not infer `recordDate` or media intervals from ambiguous `timestamp` except strict, independently reviewed patterns; otherwise leave new fields null and preserve the legacy value.
5. Backfill `thumbnailUrl` from `thumbnail` and explicit source fields only where semantics are unambiguous.
6. For each valid same-tree `parentId`, create one `legacy_parent` Connection with label `기존 연결`. Missing or cross-tree parents are migration exceptions and must be reported.
7. Keep `parentId` readable/writable for V1/V2 during transition. New V3 writes create Connections; a compatibility adapter may project one designated primary incoming Connection back to `parentId` until V1/V2 migration is complete.
8. Add deterministic `sortOrder` per Tree using existing created order without changing IDs.
9. Validate clean install and upgrade on an isolated database. Production remains untouched.

## 13. API and normalized read-model implications

- Keep existing V1/V2 `/api/memories` behavior compatible.
- Add canonical Moment and Connection contracts behind version-neutral mappers.
- Recommended routes:

```text
/api/trees/:treeId/moments
/api/trees/:treeId/connections
```

- Do not expose physical table names in V3 UI contracts.
- Server validation is authoritative for ownership, visibility, media intervals, safe URLs, relation taxonomy, same-tree constraints, and cycle prevention.
- All V3 lenses receive one normalized payload:

```ts
{
  tree,
  moments,
  connections,
  permissions,
  derivedSources,
  milestoneState
}
```

Growth tree, timeline, diary, story, album/archive, map, nebula, community, and milestones must not maintain separate persisted arrays.

## 14. Mandatory invariants

- `recordDate`, DB timestamps, and media seconds remain separate typed fields.
- `startSeconds >= 0`.
- `endSeconds` cannot exist without `startSeconds`.
- `endSeconds >= startSeconds`.
- A Moment may be source-less, but its canonical title must be meaningful or generated deterministically.
- Emotion fields contain emotional states only.
- Connections are directed, same-tree, non-self, acyclic, and ownership-validated.
- Effective child visibility never exceeds Tree visibility.
- Public/community joins cannot reveal private memo, private Moment existence, ownership/member data, moderation data, or private derivation sources.
- Every V3 view reads the same normalized entities.

## 15. V1/V2 compatibility assessment

The decision is backward-compatible only if Issue #19 follows an additive migration sequence.

- Existing IDs remain unchanged.
- Existing `trees` and `memories` remain readable and writable.
- Existing endpoints retain current response shapes.
- V3 adapters map legacy rows into the normalized model without treating fixture-only fields as production truth.
- `parentId` remains during transition but is no longer the canonical causal model.
- No existing row is silently made more public or more private during backfill.
- Ambiguous `timestamp` values remain untouched until independently classified.

## 16. Open questions and recommended decisions

### Partial/unknown remembered dates

Recommendation: Phase 1 stores nullable full dates only. Partial date precision is out of scope and requires a separate approved field before implementation.

### Multiple parallel Connections between the same two Moments

Recommendation: disallow initially. Use one Connection with relation label/memo. Revisit only with demonstrated product need.

### Automatic cycle handling

Recommendation: reject the mutation; never silently reorder or remove existing Connections.

### Official Tree verification

Recommendation: `treeType=official` is server/admin controlled. Verification workflow and organization ownership are separate future decisions.

### Restoring deleted Connections

Recommendation: do not auto-restore when a Moment returns. Require explicit reconnection.

## 17. Out of scope for this documentation PR

- Drizzle schema edits or migrations
- API/runtime implementation
- UI refactoring
- Preview or Production deployment
- final emotion/relation copywriting beyond initial controlled dictionaries
- payment/reward implementation
- recommendation ranking implementation

## 18. Downstream issue mapping

- #18: use the normalized read model only; do not invent persistence fields.
- #19: implement additive schema, constraints, backfill, and isolated DB validation.
- #20: implement auth/API/CRUD adapters and V1/V2 compatibility.
- #21: implement public reads, engagement, derivation, reporting, and moderation boundaries.
- #22: implement derived counts plus persisted idempotent milestone events.
- #23: independently review authorization, privacy, accessibility, performance, and resilience.

## 19. Approval gate

This document remains proposed until an independent architecture review confirms:

- field types, nullability, and defaults preserve existing rows;
- same-tree and ownership constraints are implementable;
- visibility is representable without application-only assumptions;
- migration and API compatibility are complete;
- no fixture-only concept is treated as production truth.

Required verdict:

```text
V3_DOMAIN_MODEL_APPROVED
```

Issue #16 remains open until this document is independently approved and merged, and downstream Issues reference the merged authority.
