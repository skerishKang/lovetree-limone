# MST UNRESOLVED Governance Census — 108 master rows × CDX / SRC namespaces

> **READ-ONLY CENSUS + RECOMMENDATIONS.** This document inventories unresolved-family
> governance states and records proposals only. It makes **no** governance decision and
> changes **no** existing file. Every recommendation below is a proposal for CENTRAL;
> resolution authority stays with CENTRAL.

| Field | Value |
| --- | --- |
| Program | CLEAN-108 |
| Parent / tracking | `#589` / `#589` (D11) |
| Actor | LOCAL 1 |
| as_of_main | `6b651f93295f53a01d2f75b5b9b874aa0fe26b58` |
| Deliverable | this document only (one new file, draft PR) |
| Files mutated | none (no `record.json`, no `manifest.json`, no ledger, no harness, no workflow, no runtime) |

## 1. Inputs and method

Scanned (read-only):

| Input | Members | Notes |
| --- | --- | --- |
| `src/02_master/MST*/record.json` | 108 records | 109 `src/02_master/` directories; `_template` carries no `record.json` |
| `src/04_codex/CDX*/manifest.json` | 1 capsule (`CDX014`) | `_template` excluded |
| `src/03_sources/SRC*/manifest.json` | 11 capsules | `SRC047 SRC056 SRC057 SRC058 SRC060 SRC062 SRC064 SRC066 SRC068 SRC069 SRC071`; `_template` excluded |
| `design-intake/master-design-coverage.json` | 108 rows | context only: baseline `2026-08-19`, `parent_issue=344`, `tracking_issue=466` |
| `src/02_master/README.md` | contract | context only |

Method: deterministic JSON walk over the scanned files; a string value is captured when it
matches `/UNRESOLVED|HOLD|PENDING/i`. All counts in this document are machine-computed and
reproducible with the commands in §8. Nothing is inferred from a filename, an issue number, or a
numeric equality between namespaces.

Namespace convention followed throughout (see also `src/02_master/README.md` and
`design-intake/master-design-coverage.json#namespace_guards`): `MST` is a legacy master-row
identity, not a Source implementation; `MST` / `SRC` / `CDX` / `LIN` / `TRK` / `FAM` namespaces
are distinct and never aliased by numeric equality.

## 2. Headline counts

### 2.1 `src/02_master/MST*/record.json` (108 records)

| Field | Distribution |
| --- | --- |
| `mapping_status` | `UNRESOLVED` **91** · `SUPERSEDED` 11 · `DUPLICATE_FAMILY` 3 · `CODEX_RESOLVED` 2 · `RESOLVED` 1 |
| `identity_refs` non-empty | **3** (`MST004`, `MST046`, `MST080`) — 105 records are empty |
| `family_ref` | `null` **108 / 108** |
| `relation` non-null | 23 |
| records with ≥1 unresolved-family field | **97** |
| total unresolved-family fields | **129** |

### 2.2 CDX / SRC capsule manifests (12 manifests: 1 `CDX` + 11 `SRC`)

| Field | Distribution |
| --- | --- |
| `duplicate_variant_status` | `UNRESOLVED` **11** (`CDX014` + `SRC047 SRC056 SRC057 SRC058 SRC060 SRC062 SRC064 SRC066 SRC069 SRC071`) · `DUAL_MEDIA_VARIANT` 1 (`SRC068`) |
| other unresolved-family manifest fields | `SRC057` ×2 (`source_contract.adoption=HOLD`, `source_contract.lineage_reservation=HOLD`) · `SRC066` ×1 (`stages_note`, S4 parity HOLD) · `SRC071` ×2 (`source_contract.portal_mapping_status=MAPPING_HOLD`, `source_specific_controls[2]=hold-key`) |

### 2.3 `MST` note-level review states (`mvp_review_state`, all 108 records)

| Family | Count | Members |
| --- | --- | --- |
| contains `hold` | **19** | MST005 MST006 MST007 MST015 MST016 MST017 MST018 MST019 MST020 MST021 MST022 MST054 MST058 MST075 MST086 MST096 MST097 MST098 MST104 |
| contains `pending` | **13** | MST012 MST037 MST040 MST054 MST071 MST072 MST073 MST083 MST084 MST085 MST093 MST094 MST095 |
| `not_reviewed` | 11 | MST010 MST013 MST014 MST032 MST033 MST034 MST035 MST068 MST069 MST070 MST107 |

`MST054` carries both tokens (`hold_source_executable_pending`), so the two families overlap on
exactly one record; distinct affected records = 31.

## 3. Findings by class

Each class lists: current value · blocked decision · disposal options · CENTRAL recommendation ·
citations.

### A. `mapping_status = UNRESOLVED` — 91 records

- **Current value.** 91 of 108 records; `identity_refs` is empty for every one of them. The other
  17 are `SUPERSEDED` (11), `DUPLICATE_FAMILY` (3), `CODEX_RESOLVED` (2), `RESOLVED` (1).
- **Blocked decision.** The contract in `src/02_master/README.md` is explicit: a record must
  "record only explicit evidence-backed typed identity references, or remain `UNRESOLVED`". The
  blocking decision is therefore *evidence*, not effort: which typed namespace member
  (`SRC` / `CDX` / `LIN` / `TRK`) may a master row point at, and on what evidence. `UNRESOLVED`
  is the intended fail-closed steady state, not a defect to be mass-cleared.
- **Options.**
  1. Leave as-is: `UNRESOLVED` stays the default until per-row evidence exists (zero risk, no progress).
  2. Publish an explicit evidence bar (ledger row + merged PR or materialized capsule + S0/S1 authority readback) and resolve only rows that meet it — the `MST080` pattern (§3.B).
  3. Batch-resolve on weaker evidence (e.g. `namespace_type` alone, or `master_id` numeric equality with a Source/Codex id).
- **CENTRAL recommendation.** Option 2. Option 3 would violate the README contract and the
  namespace guardrails; `#536` states the same rule as
  `namespace_rule: numeric equality never aliases SOURCE/CODEX/LINEAGE`.
- **Citations.** `src/02_master/README.md`; `design-intake/master-design-coverage.json`
  (`coverage_state` COVERED 74 / PARTIAL 32 / MISSING 2 — mirrored into `MST` notes).

### B. The three resolved precedents — and the one dangling reference

- **Current value.**
  - `MST080` → `mapping_status=CODEX_RESOLVED`, `identity_refs=[{namespace:CDX, id:CDX014, basis:EXPLICIT_LEDGER_PROVENANCE}]`, plus four `mapping_evidence` notes and `mapping_basis=EXPLICIT_LEDGER_PROVENANCE`. Capsule `src/04_codex/CDX014` exists.
  - `MST046` → `mapping_status=RESOLVED`, `identity_refs=["SRC066"]` (bare string), and a full
    `explicit_ledger_provenance` object: `coverage_row=46`, `coverage_state=COVERED`,
    `manifest_issue=177`, `authority` (`drive_file_id`, filename `현재후보.html`, 166996 bytes,
    SHA-256), `capsule_ref=src/03_sources/SRC066`, `issued_in_lane`, `central_binding`
    (`SRC066_S2 ACCEPT; MST_MAPPING = MST046 evidence-only superseded by this issuance`). The
    `mapping_resolved_by` note cites the `SRC047 → MST098` precedent. Capsule `src/03_sources/SRC066`
    exists and back-references via `master_rows=["MST046"]`.
  - `MST004` → `mapping_status=CODEX_RESOLVED`, `identity_refs=[{namespace:CDX, id:CDX015, basis:EXPLICIT_LEDGER_PROVENANCE}]`, `namespace_type=codex`, `current_main_present=false`. No `explicit_ledger_provenance` object: the only evidence carried is the note set (`github_issue=344`, `coverage_state=PARTIAL`, `source_authority_version=V2 Drive evidence`). **`src/04_codex/` contains only `CDX014`; `CDX015` appears nowhere in the repository except in `MST004/record.json` itself and in this document, which reports on it.** The ledger row (`master_id 4`, "Codex-15 Memory Biosphere") records `github_issue=[344]`, `github_pr=null`, `current_main_present=false`, `coverage_state=PARTIAL`.
- **Blocked decision.** Whether a resolved row must point at a *materialized capsule*, or whether a
  ledger-backed typed reference is sufficient on its own. Secondarily: the resolution evidence is
  carried in three different shapes across the three precedents — `MST080` typed-object
  `identity_refs` + note-level `mapping_basis`/`mapping_evidence` (4 notes); `MST046` bare-string
  `identity_refs` + a structured `explicit_ledger_provenance` object; `MST004` typed-object
  `identity_refs` + notes only. There is no written rule for which shape is canonical.
- **Options.**
  1. Treat `MST004` as resolved-and-waiting: ledger-backed reference is sufficient; materialization of `CDX015` is a separate lane.
  2. Downgrade `MST004` to `UNRESOLVED` until `CDX015` exists in `src/04_codex/` (or until an equivalent evidence bundle is pinned).
  3. Normalize the `identity_refs` shape to the typed object form and record the shape rule in `src/02_master/README.md`.
- **CENTRAL recommendation.** Option 1 + Option 3: keep `MST004` resolved on its ledger basis but
  annotate that its target capsule is not materialized, and standardize `identity_refs` on the typed
  object form (`{namespace, id, basis}`) so `MST046`'s bare-string form is the documented exception
  rather than an accident. Option 2 would erase a decision that is evidence-backed by the ledger row.
- **Citations.** `src/02_master/MST080/record.json`, `src/02_master/MST046/record.json`,
  `src/02_master/MST004/record.json`; `src/04_codex/CDX014/manifest.json` (PR `#635`);
  `src/03_sources/SRC066/manifest.json` (`master_rows=["MST046"]`, PR `#632`).

### C. `family_ref` is null on every record (108 / 108)

- **Current value.** All 108 records. The README requires `family_ref` to stay `null` "until a
  separate evidence-based family allocation".
- **Blocked decision.** A corpus-wide family-allocation policy: whether `FAM` members should be
  allocated at all in this lane, and which evidence would qualify. The ledger's
  `normalized_family_count_working` is 88 against 108 rows, so the family axis already exists in
  the resolver corpus without any `MST` record carrying it.
- **Options.** (1) Keep `family_ref` null corpus-wide and resolve family questions only in the
  resolver ledger. (2) Allocate `family_ref` per record on evidence. (3) Allocate only for the
  3 `DUPLICATE_FAMILY` rows that already declare an anchor.
- **CENTRAL recommendation.** Option 1 for now: the README makes family allocation a separate
  evidence-based decision, and 108 nulls are consistent rather than partial. Revisit only when a
  lane needs `FAM` membership to resolve a concrete decision.
- **Citations.** `src/02_master/README.md`; `design-intake/master-design-coverage.json#summary`
  (`normalized_family_count_working=88`, `total=108`); `#536` / `#527` resolver ledger.

### D. `relation` graph — 23 non-null, 5 open-review superseded rows

- **Current value.** 23 records carry a `relation` (`DUPLICATE_FAMILY→anchor_master`, or
  `SUPERSEDES` / `SUPERSEDED_BY` with `targets[]`). 5 records are `mapping_status=SUPERSEDED`
  while still holding an open review state: `MST018` (`superseded_hold`), `MST093` and `MST094`
  (`pending_native`), `MST096` and `MST097` (`native_backlog_review_hold`). 1
  `DUPLICATE_FAMILY` record (`MST014`) carries `source_freshness=unresolved` plus
  `coverage_state=MISSING`.
- **Blocked decision.** Whether superseded/duplicate rows are *frozen* (terminal, review state
  irrelevant) or *alive* (their review state can still be decided and closed). This is a
  bookkeeping policy decision, not an implementation decision.
- **Options.** (1) Freeze: superseded rows keep their state for provenance only, no further review.
  (2) Keep alive: review states remain actionable on superseded rows. (3) Split: keep the review
  state but require it to reference its anchor row's decision.
- **CENTRAL recommendation.** Option 3, applied only to the 5 affected rows: it preserves
  provenance (Option 1's virtue) while preventing an open review state from silently outliving its
  anchor (Option 2's risk). `MST014` should be carried with its anchor `MST013` rather than
  adjudicated alone, since the pair shares `semantic_identity` and both are `coverage_state=MISSING`.
- **Citations.** `src/02_master/README.md` ("preserve duplicate and superseded relationships from
  the ledger"); `design-intake/master-design-coverage.json` rows 13/14
  (`reconciliation_disposition` `TRUE_MISSING` / `DUPLICATE_FAMILY`).

### E. `duplicate_variant_status = UNRESOLVED` across CDX / SRC (11 of 12 capsules)

- **Current value.** `CDX014` and `SRC047 SRC056 SRC057 SRC058 SRC060 SRC062 SRC064 SRC066 SRC069
  SRC071` are `UNRESOLVED`; `SRC068` is `DUAL_MEDIA_VARIANT` — the only capsule that has been
  adjudicated. No manifest has a `duplicate_variant_note` field, but `SRC068` does document its
  own adjudication inline: `variant_policy=DUAL_MEDIA_VARIANT`, `variant_selector`
  (`selector=mediaVariant`, `allowed_values=[A,B]`, `default=null`, `fail_closed=true`),
  `source_contract.variant_contract` (same selector/values, `fail_closed=true`), and
  `authority.variants` carrying per-variant Drive `drive_file_id`, filename, byte count, SHA-256
  and revision (`A` `68_V3.3.1A_…` 18565 bytes, `B` `68_V3.3.1B_…` 18646 bytes).
- **Blocked decision.** The duplicate-variant rule itself: what counts as one variant, what counts
  as a distinct variant, and what evidence settles it. `SRC068` supplies a concrete precedent — two
  Drive files with distinct SHA-256 behind one selector — but that rule was applied per-capsule and
  never written down corpus-wide, so the other 11 capsules have no documented basis to compare
  against.
- **Options.** (1) Adjudicate capsule-by-capsule as each lane closes. (2) Publish one corpus-wide
  duplicate-variant rule and re-apply it to all 11 in a single pass. (3) Leave `UNRESOLVED` and
  treat it as inert metadata.
- **CENTRAL recommendation.** Option 2: the field is present on all 12 capsules (11 `UNRESOLVED`,
  1 adjudicated), so a single written rule plus one adjudication pass is cheaper than 11 separate
  decisions, and it makes the next capsule's value derivable instead of bespoke. Option 3 keeps a
  governance question invisible in a field that CI never checks.
- **Citations.** `src/04_codex/CDX014/manifest.json`; `src/03_sources/SRC*/manifest.json`;
  `SRC068` (`DUAL_MEDIA_VARIANT`, PRs `#606` split / `#608` S4 parity / `#625` replay).

### F. Worked example — `CDX014` (the D11 instance)

- **Current value.** `duplicate_variant_status=UNRESOLVED` on a capsule whose
  `authority_context_required=true` and whose `authority_context_note` records a Drive rename:
  the authoring-time sibling `12_러브트리_리빙미디어스피어_인터랙티브대문_V1/` became
  `12-1_…` on 2026-08-17, so serving `original/original.html` or `split/index.html` alone from the
  repository path is **not** runtime-equivalent (all 178 media would 404). The capsule pins the
  authoring-time layout in `authority-context.json` with zero URL rewrites and vendors no media
  bytes.
- **Blocked decision.** Whether the rename variant counts as a *duplicate variant* of a named
  authority (adjudicable on Drive evidence) or as a *path-context requirement* (not a duplicate at
  all, and belonging to `authority_context` rather than `duplicate_variant_status`).
- **Options.** (1) Adjudicate `UNRESOLVED → DUAL_VARIANT` on the readback evidence. (2) Keep
  `UNRESOLVED` and move the naming question into `authority_context` only. (3) Add a dedicated
  value such as `PATH_CONTEXT_VARIANT_ONLY` to the field's vocabulary.
- **CENTRAL recommendation.** Option 3 if the vocabulary is open, else Option 2: the rename is a
  *serving-contract* fact (already recorded), not a duplicate-executable fact, and collapsing the
  two questions into one status field is what makes this row hard to close. Either way, no media
  bytes and no URL rewrite may be introduced by the decision.
- **Citations.** `src/04_codex/CDX014/manifest.json` (`authority_context_note`),
  `src/04_codex/CDX014/authority-context.json`, PR `#635`, tracking `#589`.

### G. `SRC057` — `source_contract.adoption=HOLD` + `lineage_reservation=HOLD`

- **Current value.** Both fields `HOLD`, on a capsule whose `duplicate_variant_status` is also
  `UNRESOLVED`. Three independent holds on one record.
- **Blocked decision.** Product adoption (does the Source become canonical for its job?) and
  lineage reservation (may it claim a `LIN` id?) are separate decisions from duplicate-variant
  adjudication, and they are currently serialized behind one another by habit rather by rule.
- **Options.** (1) Decide adoption first, then lineage reservation, then variants.
  (2) Decide variants first, then adoption + reservation together.
  (3) Decide all three explicitly in one CENTRAL pass, recording which evidence each rests on.
- **CENTRAL recommendation.** Option 3 for `SRC057`: three holds on one record is the cheapest
  place to prove the decision order for the other capsules. Lineage reservation should never
  precede adoption, since a reserved `LIN` id implies an adopted identity.
- **Citations.** `src/03_sources/SRC057/manifest.json`; `#589` lane records.

### H. `SRC066` — S4 parity HOLD

- **Current value.** `stages_note` records `source_split_parity_pass=false` because S4 parity is
  HOLD for this lane, while the S3 byte round-trip contract passes independently. `duplicate_variant_status`
  is `UNRESOLVED`; the intake manifest for the same Track (`design-intake/manifests/track-66-first-journey-v1-2.json`)
  was corrected and merged as PR `#633` (D1–D4 metadata defects closed, D5/D7/D8 left for
  Drive-side evidence).
- **Blocked decision.** Release of S4 parity acceptance for the `SRC066` lane, plus the
  duplicate-variant adjudication for the same capsule.
- **Options.** (1) Hold S4 until the parity artifact is adjudicated. (2) Accept S4 on the
  round-trip + acceptance evidence already present, and adjudicate variants separately.
- **CENTRAL recommendation.** Option 2: the `SRC069` precedent (`#589` comment `5551812640`)
  accepted S4 parity against a recorded `evidence/parity/accepted-parity.json` without touching the
  duplicate-variant field, and the intake correction (`#633`) likewise closed metadata defects
  while leaving `D5`/`D7`/`D8` open. Keeping the two questions apart is the established pattern.
- **Citations.** `src/03_sources/SRC066/manifest.json`; `#589` comments `5551812640`,
  `5553007835`; PR `#633`; `design-intake/manifests/track-66-first-journey-v1-2.json`.

### I. `SRC071` — `portal_mapping_status=MAPPING_HOLD` + a `hold-key` control

- **Current value.** `source_contract.portal_mapping_status=MAPPING_HOLD` and
  `source_specific_controls[2]=hold-key`; `duplicate_variant_status=UNRESOLVED`; `master_rows`
  is empty (unlike `SRC066` → `MST046` and `SRC047` → `MST098`).
- **Blocked decision.** Portal mapping (which portal route/namespace the Source maps to) and the
  master-row linkage (`master_rows`) that would let an `MST` record resolve to `SRC071`.
- **Options.** (1) Resolve portal mapping first, then set `master_rows`, then let the `MST` row
  resolve. (2) Set `master_rows` now on ledger evidence and resolve mapping independently.
  (3) Leave both on hold.
- **CENTRAL recommendation.** Option 1, but with the `master_rows` linkage decided explicitly
  (accept or reject) rather than left empty: an empty `master_rows` array is indistinguishable from
  a forgotten one, and it is the only input the `MST` side needs to resolve. `SRC071` itself
  reached main as PR `#624`.
- **Citations.** `src/03_sources/SRC071/manifest.json`; PR `#624`; `#589`.

### J. `MST` note-level open states

- **Current value.**
  - `namespace_type=codex-alias-unresolved` — 4 records: `MST025`, `MST026`, `MST027`, `MST079`.
  - `source_freshness=unresolved` — 2 records: `MST013`, `MST014` (both `coverage_state=MISSING`).
  - `source_authority_version="V1.3 pending executable"` — `MST054`, which also carries
    `mvp_review_state=hold_source_executable_pending` and `source_freshness=high`.
  - `mvp_review_state` with `hold` (19) or `pending` (13), overlapping on `MST054`.
- **Blocked decision.** `namespace_type=codex-alias-unresolved` blocks the alias decision: whether
  a master row that points at a Codex work may be typed as `codex` (as `MST080` now is, after
  resolution) or must stay `codex-alias-unresolved` until a `CDX` capsule exists. The other three
  families block evidence closure, not decisions.
- **Options.** (1) Resolve the 4 alias rows on the `MST080` precedent (resolution upgrades the
  namespace type). (2) Keep them unresolved until `CDX015`-class capsules exist. (3) Split the
  family into `codex-alias-unresolved` (no capsule) and `codex-alias-resolved` (capsule exists).
- **CENTRAL recommendation.** Option 3, which is the vocabulary consequence of Option 1 in §3.B:
  `MST080` already demonstrates that resolution upgrades the type, so the unresolved alias state
  needs a name that means "no materialized capsule yet". The 2 `source_freshness=unresolved` rows
  (`MST013`, `MST014`) are `TRUE_MISSING` / `DUPLICATE_FAMILY` in the ledger and should stay
  explicit rather than being normalized to `low`.
- **Citations.** `src/02_master/MST025|026|027|079/record.json`, `MST013`, `MST014`, `MST054`,
  `MST080`; `design-intake/master-design-coverage.json` rows 13/14.

## 4. Namespace guardrails (apply to every option above)

- `MST` rows are evaluation/master-row work records, never independent Source runtimes
  (`src/02_master/README.md`); resolving a row must not create a runtime.
- `MST004 → CDX015` and `MST080 → CDX014` are typed references; `master_id 4` ≠ `CDX015` as a
  numeric alias. Same for `SRC` / `LIN` / `TRK` / `FAM`.
- The 8 explicit guards in `design-intake/master-design-coverage.json#namespace_guards`
  (e.g. `Source Track57 Living Glass != Lineage57 Living Character`,
  `Drive Track17 … != historical GitHub Track17 …`) continue to apply.
- `family_ref` allocation, duplicate-variant adjudication, and `mapping_status` resolution are three
  independent gates. Closing one does not close another.

## 5. Aggregate decision bundle (one CENTRAL pass, five decisions)

| # | Decision | Options | CENTRAL recommendation |
| --- | --- | --- | --- |
| 1 | Evidence bar for `mapping_status` resolution (91 rows) | fail-closed default / explicit evidence bar / batch on weak evidence | explicit evidence bar (`MST080` pattern: ledger row + merged PR or capsule + S0/S1 readback) |
| 2 | `CDX015` target of `MST004` (`identity_refs` shape too) | keep resolved + annotate / downgrade to `UNRESOLVED` / normalize shape only | keep resolved + annotate, and normalize `identity_refs` to the typed object form |
| 3 | Duplicate-variant rule for 11 `UNRESOLVED` capsules | per-capsule / one corpus rule / inert metadata | one corpus-wide rule, one adjudication pass; write the rule down (no manifest has a `duplicate_variant_note` today, and only `SRC068` documents its own adjudication — via `variant_policy` / `variant_selector` / `source_contract.variant_contract` / `authority.variants`) |
| 4 | Superseded / duplicate rows with open review states (6 rows: `MST014`, `MST018`, `MST093`, `MST094`, `MST096`, `MST097`) | freeze / keep alive / keep alive + anchor reference | keep alive with an explicit anchor reference |
| 5 | `family_ref` allocation (108 nulls) | keep null corpus-wide / allocate per row / allocate only for the 3 `DUPLICATE_FAMILY` rows | keep null corpus-wide for now; revisit only when a lane needs `FAM` membership |

## 6. Out of scope for this unit

- No `record.json`, `manifest.json`, `design-intake/*.json`, harness, workflow, route, or runtime
  file was modified. This unit produced one new document.
- No GitHub issue or PR comment was written; delivery is this draft PR only.
- `D5` (`slotNotes.issue` 142 vs 177/344) and `D7`/`D8` (pinned QA artifact contents) for Track 66
  remain open: they need Drive-side evidence, per `#589`.
- No recommendation in §3–§5 is a decision. Governance resolution authority is CENTRAL's.

## 7. Cross-reference index

| Reference | Role |
| --- | --- |
| `#589` | parent lane; D11 tracking; `SRC069`/`SRC066`/`SRC071` decisions |
| `#536` / `#527` | precedent: `docs(527): materialize current 108/88 master resolver ledger` — machine-readable resolver at `design-intake/master-design-current-ledger.json` (branch `central/527-master-current-ledger`, not merged to main), namespace rule `numeric equality never aliases SOURCE/CODEX/LINEAGE` |
| `#344` / `#466` | `design-intake/master-design-coverage.json` `parent_issue` / `tracking_issue` (baseline `2026-08-19`) |
| `#635` | `CDX014` capsule materialized (PR), `master_rows=["MST080"]` |
| `#632` | `SRC066` mechanical split (PR), `master_rows=["MST046"]` |
| `#633` | Track 66 intake manifest D1–D4 correction (merged `19e5e61f`) |
| `#623` / `#624` | `SRC069` (`a70f8736` lineage) / `SRC071` mechanical splits (merged) |
| `5551812640` | `#589` comment: `SRC069` S4 parity acceptance against a recorded `accepted-parity.json` |
| `5553007835` | `#589` comment: CENTRAL verdict record for `#633` |
| `#606` / `#608` / `#625` | `SRC068` dual-variant contract: mechanical split (`#606`), S4 parity (`#608`), dual-variant plugin replay (`#625`) — sets `duplicate_variant_status=DUAL_MEDIA_VARIANT`, the only adjudicated capsule |

## 8. Reproduction

Deterministic recount (read-only; run from the repository root at `as_of_main`):

```bash
# mapping_status distribution, identity_refs, family_ref, relation
node -e "const fs=require('fs'),p=require('path');const d='src/02_master';const rs=fs.readdirSync(d,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='_template').sort((a,b)=>a.name.localeCompare(b.name)).map(e=>JSON.parse(fs.readFileSync(p.join(d,e.name,'record.json'),'utf8')));const t=k=>{const m=new Map();for(const r of rs){const v=r[k]??'<absent>';m.set(v,(m.get(v)||0)+1)}console.log(k+': '+[...m].sort().map(([a,b])=>a+'='+b).join(' '))};['mapping_status'].forEach(t);console.log('identity_refs_nonempty='+rs.filter(r=>(r.identity_refs||[]).length).length);console.log('family_ref_null='+rs.filter(r=>r.family_ref===null).length);console.log('relation_set='+rs.filter(r=>r.relation).length)"

# unresolved-family string values across MST / CDX / SRC
node -e "const fs=require('fs'),p=require('path');const re=/(UNRESOLVED|HOLD|PENDING)/i;const hit=[];const w=(v,k)=>{if(Array.isArray(v))v.forEach((x,i)=>w(x,k+'['+i+']'));else if(v&&typeof v==='object')for(const[kk,vv]of Object.entries(v))w(vv,k?k+'.'+kk:kk);else if(typeof v==='string'&&re.test(v))hit.push([k,v])};for(const[base,pat,name]of[['src/02_master','MST','record.json'],['src/04_codex','CDX','manifest.json'],['src/03_sources','SRC','manifest.json']]){for(const e of fs.readdirSync(base,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(!e.isDirectory()||!new RegExp('^'+pat+'\\\\d+$').test(e.name))continue;const f=p.join(base,e.name,name);if(!fs.existsSync(f))continue;w(JSON.parse(fs.readFileSync(f,'utf8')),e.name)}}for(const[k,v]of hit)console.log(k+'='+v)"
```

Expected at `as_of_main` (verified by running the two commands above):

- command 1: `UNRESOLVED=91 SUPERSEDED=11 DUPLICATE_FAMILY=3 CODEX_RESOLVED=2 RESOLVED=1`,
  `identity_refs_nonempty=3`, `family_ref_null=108`, `relation_set=23`.
- command 2: 145 unresolved-family string values = **129 `MST` values across 97 records** +
  **16 CDX/SRC capsule values** (11 `duplicate_variant_status=UNRESOLVED` + 5 further
  `HOLD`/parity fields), over **12 capsule manifests** (1 `CDX` + 11 `SRC`).

## Appendix A — every `MST` record carrying an unresolved-family field (97 of 108)

`identity_refs` shows `∅` when empty. `relation` is `—` when null.

| MST | product_job | mapping_status | mvp_review_state | identity_refs | relation | other open fields |
| --- | --- | --- | --- | --- | --- | --- |
| MST001 | HOME | UNRESOLVED | candidate_family | ∅ | — | — |
| MST005 | HOME | UNRESOLVED | hold | ∅ | — | — |
| MST006 | HOME | UNRESOLVED | hold_rights_license | ∅ | — | — |
| MST007 | HOME | UNRESOLVED | primary_hold_gate | ∅ | — | — |
| MST008 | DISCOVER | UNRESOLVED | primary | ∅ | — | — |
| MST009 | DISCOVER | UNRESOLVED | candidate | ∅ | — | — |
| MST010 | DISCOVER | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST011 | DISCOVER | UNRESOLVED | alternate | ∅ | — | — |
| MST012 | DISCOVER | UNRESOLVED | alternate_pending_implementation | ∅ | — | — |
| MST013 | SUBJECT | UNRESOLVED | not_reviewed | ∅ | — | source_freshness=unresolved |
| MST014 | SUBJECT | DUPLICATE_FAMILY | not_reviewed | ∅ | DUPLICATE_FAMILY->MST013 | source_freshness=unresolved |
| MST015 | SUBJECT | UNRESOLVED | hold_provenance_likeness | ∅ | — | — |
| MST016 | SUBJECT | UNRESOLVED | hold_provenance_likeness | ∅ | SUPERSEDES->[MST015] | — |
| MST017 | SUBJECT | UNRESOLVED | selection_hold | ∅ | — | — |
| MST018 | SUBJECT | SUPERSEDED | superseded_hold | ∅ | SUPERSEDED_BY->[MST019] | — |
| MST019 | SUBJECT | UNRESOLVED | hold | ∅ | SUPERSEDES->[MST018] | — |
| MST020 | SUBJECT | UNRESOLVED | visual_donor_hold | ∅ | — | — |
| MST021 | SUBJECT | UNRESOLVED | variant_selection_hold | ∅ | — | — |
| MST022 | SUBJECT | UNRESOLVED | variant_selection_hold | ∅ | — | — |
| MST023 | SUBJECT | UNRESOLVED | ab_selection_open | ∅ | — | — |
| MST024 | SUBJECT | UNRESOLVED | ab_selection_open | ∅ | SUPERSEDES->[MST023] | — |
| MST025 | SUBJECT | UNRESOLVED | alternate | ∅ | — | namespace_type=codex-alias-unresolved |
| MST026 | SUBJECT | UNRESOLVED | primary | ∅ | — | namespace_type=codex-alias-unresolved |
| MST027 | SUBJECT | UNRESOLVED | alternate | ∅ | — | namespace_type=codex-alias-unresolved |
| MST028 | PATH | UNRESOLVED | canonical | ∅ | — | — |
| MST029 | PATH | UNRESOLVED | function_donor | ∅ | — | — |
| MST030 | PATH | UNRESOLVED | function_donor | ∅ | — | — |
| MST031 | PATH | UNRESOLVED | function_donor | ∅ | — | — |
| MST032 | PATH | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST033 | PATH | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST034 | PATH | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST035 | PATH | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST036 | PATH | UNRESOLVED | primary | ∅ | — | — |
| MST037 | PATH | UNRESOLVED | path_overview_candidate_pending_native | ∅ | — | — |
| MST038 | PATH | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST039 | PATH | UNRESOLVED | alternate | ∅ | — | — |
| MST040 | PATH | UNRESOLVED | alternate_visual_donor_pending_native | ∅ | — | — |
| MST041 | MOMENT | UNRESOLVED | function_donor | ∅ | — | — |
| MST042 | MOMENT | UNRESOLVED | alternate | ∅ | — | — |
| MST044 | MOMENT | UNRESOLVED | primary_family | ∅ | SUPERSEDES->[MST043] | — |
| MST045 | CAPTURE | UNRESOLVED | primary_canonical | ∅ | — | — |
| MST047 | MYTREE | UNRESOLVED | visual_function_donor | ∅ | — | — |
| MST048 | MYTREE | UNRESOLVED | visual_function_donor | ∅ | — | — |
| MST049 | MYTREE | UNRESOLVED | alternate_foundation_donor | ∅ | — | — |
| MST050 | MYTREE | UNRESOLVED | design_review_donor | ∅ | — | — |
| MST051 | MYTREE | UNRESOLVED | design_review_donor | ∅ | — | — |
| MST053 | MYTREE | UNRESOLVED | ux_visual_donor | ∅ | SUPERSEDES->[MST052] | — |
| MST054 | MYTREE | UNRESOLVED | hold_source_executable_pending | ∅ | — | source_authority_version=V1.3 pending executable |
| MST055 | MYTREE | UNRESOLVED | alternate_ready | ∅ | — | — |
| MST058 | MYTREE | UNRESOLVED | primary_family_hold_native_selection | ∅ | SUPERSEDES->[MST056,MST057] | — |
| MST059 | ARCHIVE | UNRESOLVED | canonical | ∅ | — | — |
| MST060 | ARCHIVE | UNRESOLVED | canonical | ∅ | — | — |
| MST061 | ARCHIVE | UNRESOLVED | canonical | ∅ | — | — |
| MST062 | ARCHIVE | UNRESOLVED | canonical_family | ∅ | — | — |
| MST063 | ARCHIVE | UNRESOLVED | canonical_family | ∅ | — | — |
| MST064 | ARCHIVE | UNRESOLVED | canonical_family | ∅ | — | — |
| MST065 | ARCHIVE | UNRESOLVED | canonical_family | ∅ | — | — |
| MST066 | ARCHIVE | UNRESOLVED | canonical | ∅ | — | — |
| MST067 | ARCHIVE | UNRESOLVED | function_donor | ∅ | — | — |
| MST068 | ARCHIVE | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST069 | ARCHIVE | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST070 | ARCHIVE | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST071 | ARCHIVE | UNRESOLVED | pending_native | ∅ | — | — |
| MST072 | ARCHIVE | UNRESOLVED | pending_native | ∅ | — | — |
| MST073 | ARCHIVE | UNRESOLVED | alternate_pending_native | ∅ | — | — |
| MST074 | ARCHIVE | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST075 | ARCHIVE | UNRESOLVED | hold_visual_donor_originality | ∅ | — | — |
| MST076 | ARCHIVE | UNRESOLVED | selective_reuse | ∅ | — | — |
| MST077 | ARCHIVE | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST078 | ARCHIVE | UNRESOLVED | selective_reuse | ∅ | — | — |
| MST079 | ARCHIVE | UNRESOLVED | alternate | ∅ | — | namespace_type=codex-alias-unresolved |
| MST081 | TOOLS | UNRESOLVED | candidate | ∅ | — | — |
| MST082 | TOOLS | UNRESOLVED | candidate | ∅ | — | — |
| MST083 | TOOLS | UNRESOLVED | primary_pending_native | ∅ | — | — |
| MST084 | TOOLS | UNRESOLVED | alternate_visual_donor_pending_native | ∅ | — | — |
| MST085 | TOOLS | UNRESOLVED | pending_native | ∅ | — | — |
| MST086 | TOOLS | UNRESOLVED | implementation_donor_hold | ∅ | — | — |
| MST087 | TOOLS | UNRESOLVED | alternate_function_donor | ∅ | — | — |
| MST088 | TOOLS | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST089 | MILESTONE | UNRESOLVED | canonical | ∅ | — | — |
| MST090 | MILESTONE | UNRESOLVED | canonical | ∅ | — | — |
| MST091 | MILESTONE | UNRESOLVED | canonical | ∅ | — | — |
| MST092 | MILESTONE | UNRESOLVED | canonical | ∅ | — | — |
| MST093 | MILESTONE | SUPERSEDED | pending_native | ∅ | SUPERSEDED_BY->[MST094,MST095] | — |
| MST094 | MILESTONE | SUPERSEDED | pending_native | ∅ | SUPERSEDES->[MST093] | — |
| MST095 | MILESTONE | UNRESOLVED | pending_native | ∅ | SUPERSEDES->[MST093,MST094] | — |
| MST096 | MILESTONE | SUPERSEDED | native_backlog_review_hold | ∅ | SUPERSEDED_BY->[MST097,MST098] | — |
| MST097 | MILESTONE | SUPERSEDED | native_backlog_review_hold | ∅ | SUPERSEDES->[MST096] | — |
| MST098 | MILESTONE | UNRESOLVED | native_backlog_review_hold | ∅ | SUPERSEDES->[MST096,MST097] | — |
| MST101 | MILESTONE | UNRESOLVED | canonical_replacement_review | ∅ | SUPERSEDES->[MST099,MST100] | — |
| MST102 | SHELL | UNRESOLVED | shell_foundation | ∅ | — | — |
| MST103 | SHELL | UNRESOLVED | transition_loading_donor | ∅ | — | — |
| MST104 | CAMPAIGN | UNRESOLVED | hold_no_executable | ∅ | — | — |
| MST105 | CAMPAIGN | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST106 | CAMPAIGN | UNRESOLVED | native_backlog_review | ∅ | — | — |
| MST107 | LAB | UNRESOLVED | not_reviewed | ∅ | — | — |
| MST108 | LAB | UNRESOLVED | partial_suite_native_review | ∅ | — | — |

Records not listed here (11) carry no unresolved-family field: `MST002`, `MST003`, `MST004`,
`MST043`, `MST046`, `MST052`, `MST056`, `MST057`, `MST080`, `MST099`, `MST100`. Each has a
`mapping_status` other than `UNRESOLVED` (`SUPERSEDED` 6, `DUPLICATE_FAMILY` 2, `CODEX_RESOLVED` 2,
`RESOLVED` 1) and no `hold`/`pending`/`unresolved` note value. Cross-check: 108 total − 91
`UNRESOLVED` = 17 non-`UNRESOLVED` records; 6 of those are listed above because they still carry an
open note value (`MST014`, `MST018`, `MST093`, `MST094`, `MST096`, `MST097`), leaving the 11
excluded here.
