# Duplicate-Variant Governance Rule — corpus-wide proposal for the 11 `UNRESOLVED` capsules

> **READ-ONLY RULE PROPOSAL.** This document writes down a proposed corpus-wide
> duplicate-variant rule. It issues **no** adjudication, changes **no** existing file, and makes
> **no** governance decision. Every rule, threshold, value name, and per-capsule observation below
> is a **proposal for CENTRAL**; resolution authority stays with CENTRAL.
>
> Per `#589` comment `5556293418` disposition 3 (ADOPTED: one corpus-wide rule + one batch
> adjudication pass), this unit does **documentation only**. The adjudication pass is scheduled
> for after `CDX014` S4 closes.

| Field | Value |
| --- | --- |
| Program | CLEAN-108 |
| Parent / tracking | `#589` / `#589` (D11) |
| Authority basis | `#589` comment `5556293418`, disposition 3 (ADOPTED) |
| Actor | LOCAL 2 |
| as_of_main | `dd20c2c3e42e5289a402346b028c09f8d2076533` |
| Deliverable | this document only (one new file, draft PR) |
| Files mutated | none (no `record.json`, no `manifest.json`, no `authority-context.json`, no ledger, no harness, no workflow, no test, no runtime) |
| Adjudications issued | **0** |
| Adjudication pass | scheduled, after `CDX014` S4 closes (not started) |

## 1. Inputs and method

Read (read-only, nothing modified):

| Input | Role |
| --- | --- |
| `src/03_sources/SRC068/manifest.json` (78 lines) | **The only pre-adjudicated precedent.** Carries `authority_mode=DUAL_VARIANT`, `authority.variants.A/B`, `variant_policy`, `variant_selector`, `source_contract.variant_contract`, `duplicate_variant_status=DUAL_MEDIA_VARIANT`. Read in full and used as the base for every definition below. |
| `src/03_sources/SRC*/manifest.json` × 11, `src/04_codex/CDX014/manifest.json` | Current value of `duplicate_variant_status` (11 `UNRESOLVED`, 1 `DUAL_MEDIA_VARIANT`) and the authority facts per capsule |
| `docs/design-intake/mst-unresolved-governance-census-2026-09-05.md` §3.E / §3.F | Problem statement this rule answers; §3.F is the source of the distinction clause promoted in §2 |
| `src/03_sources/SRC*/evidence/source/drive-authority-readback.json` × 11 | Existing fresh-Drive readback evidence per capsule (§4.1) |
| `src/03_sources/SRC071/authority-context.json` | The one capsule that records a *non-canonical same-name* Drive file |
| `src/08_harness/dual-variant-mechanical.mjs`, `src/08_harness/source-capsule-validator.mjs`, `src/08_harness/validate-mechanical-split.mjs` | Which fields are actually enforced and by what (`authority_mode`, `variant_selector`, readback mode) |
| `src/03_sources/_template/manifest.example.json`, `src/04_codex/_template/manifest.example.json` | Template default for the field |
| `design-intake/manifests/track-66-first-journey-v1-2.json` | The `SRC066` correction note proving a folder readback can settle a dead-folder-id question |

Method: deterministic JSON reads; every byte count, SHA-256, file id and date quoted below is
copied from the file named beside it. Nothing is inferred from a filename, a revision string, a
number, or a Drive path. Filename markers such as `최종`, `현재후보` and `후보` are recorded as
**facts about naming**, never as evidence that a second candidate exists.

Namespace convention followed throughout: `MST` is a legacy master-row identity, not a Source
implementation; `MST` / `SRC` / `CDX` / `LIN` / `TRK` / `FAM` namespaces are distinct and never
aliased by numeric equality.

## 2. The core distinction (census §3.F, promoted to a rule)

The census found that `CDX014` is hard to close because one status field is being asked to answer
two unrelated questions. Proposed rule: **split the question before adjudicating it.**

### 2.1 Question A — is there a duplicate *executable*?

A capsule has a duplicate-executable question only if the Drive evidence shows **more than one
candidate file object** for the same logical Source/Track, where each object is on its own a
complete executable authority. Question A is answered by Drive file ids and SHA-256 only.
Its outcome lives in `duplicate_variant_status`.

### 2.2 Question B — is the repository path a valid runtime surface?

A capsule may have exactly one authority file and still not render correctly at its repository
path, because its own relative references resolve against a sibling layout, a virtual depth, or a
renamed folder. Question B is a **serving contract**, not a duplicate. It is already owned by
`authority_context_required` / `authority_context_ref` / `capture_surface` and must stay there.
Question B never adjudicates `duplicate_variant_status`.

### 2.3 Proposed discrimination test (ordered, fail-closed)

For a capsule whose `duplicate_variant_status` is `UNRESOLVED`:

| Step | Test | Evidence required | If YES | If NO |
| --- | --- | --- | --- | --- |
| 1 | Does a fresh Drive readback enumerate **more than one** file object that could serve as the executable authority for this logical Source (any folder depth in the Source's revision chain)? | folder/sibling enumeration in a `CENTRAL_FRESH_DRIVE_READBACK` | go to step 2 | **Question A closed:** no duplicate candidate. Proceed to §5 for the value. |
| 2 | Do those objects have **distinct** SHA-256? | per-object SHA-256 | go to step 3 | **Not a variant.** Identical bytes = duplicate *copy*; record both file ids and the single SHA-256, disposition `NOT_AUTHORITY` on the excluded one. |
| 3 | Is there (or must there be) a named selector that chooses between the distinct objects at runtime? | an existing selector, or a decision to create one | **Variant.** Adjudicate and record the full SRC068 shape (§3.2). | **Not a variant.** Distinct SHA-256 without a selector is revision history, not a variant; keep the canonical one and record the superseded objects as `NOT_AUTHORITY`. |

Independently of steps 1–3: if the repository path is not runtime-equivalent, answer Question B
through `authority_context` — never through `duplicate_variant_status`.

### 2.4 The worked instance — `CDX014` `12_…` → `12-1_…`

`CDX014` has exactly one authority file: `최종본.html`, 19631 bytes, SHA-256 `0cef6497103d05a853c4849d58967bed66e3af85db5e345a69724b2d26719361`, Drive file id `1YKq2WiINn5MWhll8sSBq1azHMwaocIIP` (`src/04_codex/CDX014/manifest.json`). The `../12_러브트리_리빙미디어스피어_인터랙티브대문_V1/assets/` media prefix refers to the authoring-time sibling name; the live sibling was renamed to `12-1_…` on 2026-08-17, so 178 media would 404 at the repository path. A **folder rename changes no file id and no byte.**

Under §2.3 the rename fails step 1: there is still exactly one candidate file object. So the rename
is **Question B** — a serving-contract fact, already recorded in
`src/04_codex/CDX014/authority-context.json` (`sibling_rename_recorded`, 178 pinned media
entries, zero URL rewrites, no media vendored) and asserted by
`src/04_codex/CDX014/tests/s3-roundtrip.test.mjs` (`T15g`, `sibling_rename_recorded.renamed === true`).

Note for CENTRAL: the capsule's own `authority_context_note` currently describes this as
"SRC069-class, Drive-rename variant". Under §2.3 the word *variant* there is a mislabel — the
rename is a path-context fact, not a duplicate-executable fact. Whether to reword that note is a
separate decision and is outside this document.

## 3. What is a variant

### 3.1 Distinctness criteria (proposed)

Two Drive objects are **distinct variants** of one logical Source if and only if **all four** hold:

1. **different `drive_file_id`** — they are different objects, not two links to one object;
2. **different SHA-256** — they are byte-distinct, so the choice actually changes what renders;
3. **same logical Source** — same Track, same `scenario_id` / `source_folder_name`, both complete
   executables (a fragment or a media asset is not a candidate);
4. **selectable** — a named selector can choose between them at runtime.

Failing (2) makes them a **duplicate copy** (§5, `DUPLICATE_COPY_SAME_SHA`). Failing (4) makes
them **superseded revisions** — history, not variants.

### 3.2 The only adjudicated precedent, read in full (`SRC068`)

From `src/03_sources/SRC068/manifest.json`:

- `authority_mode: "DUAL_VARIANT"` — the only mode value besides `SINGLE`, enforced by
  `dual-variant-mechanical.mjs#resolveAuthorityMode` (`SINGLE` / `DUAL_VARIANT` only; anything
  else returns `{ mode: null }` and fails closed).
- `authority.variants.A`: file id `1zfYWmgV5xdmP6Gjo1rMOdYv9PJG316ph`,
  `68_V3.3.1A_신비혼혈형_CODEX_PORTALS_C14FIX.html`, 18565 bytes, SHA-256 `9daa5f7690c6a95d5c5e75fc16b5d950533921d9f41ec008053fa4c79d566c42`, revision `V3.3.1A`.
- `authority.variants.B`: file id `1_xOVvvz1DdV0MFCkfQwqsJZUrkFTUrjb`,
  `68_V3.3.1B_동양인형_CODEX_PORTALS_C14FIX.html`, 18646 bytes, SHA-256 `cb5553d399a728cd28422f8112f6cc59c185de68b522aa431e9d3bb1f4275004`, revision `V3.3.1B`.
- Both objects live in the **same** folder (`1--wlBwQf5OPYkMq1m531I0vLvf03Mj5L`,
  `V8_LAUNCHER_ENGLISH`) — the fresh readback `src/03_sources/SRC068/evidence/source/drive-authority-readback.json`
  repeats `folder_id`/`folder_name`/`file_id`/`filename`/`bytes`/`sha256` per variant, which is the
  shape this rule proposes as the evidence template.
- `variant_selector: { selector: "mediaVariant", allowed_values: ["A","B"], default: null, fail_closed: true }`.
  `validateDualVariantSelector` pins all four: the selector name must be exactly `mediaVariant`,
  `allowed_values` exactly `["A","B"]`, `default` exactly `null` (no default variant),
  `fail_closed` exactly `true`.
- `source_contract.variant_contract: { type: "DUAL_MEDIA_VARIANT", selector: "mediaVariant", valid_values: ["A","B"], default_value: null, fail_closed: true }`
  — the same contract repeated inside `source_contract`.
- `a_b_exclusive_selection: false`, `variant_policy: "DUAL_MEDIA_VARIANT"`,
  `duplicate_variant_status: "DUAL_MEDIA_VARIANT"`.

All four distinctness criteria of §3.1 hold for `SRC068`: distinct file ids, distinct SHA-256, one
logical Source (`codex-portals-c14fix`), one selector. It is the corpus's only adjudicated capsule
and the base for §3.1.

### 3.3 Enumeration limit (recorded as a constraint, not a proposal)

`dual-variant-mechanical.mjs` freezes `DUAL_VARIANT_KEYS = ['A','B']` and
`listDualVariantKeys` returns `null` unless the manifest is `DUAL_VARIANT` **and** the variant keys
are exactly `["A","B"]`. A third variant is therefore not expressible in the current harness. If
the batch pass ever finds a three-way case, a harness change is a precondition, and per §8 that
change is not part of this unit.

## 4. Adjudication procedure

### 4.1 Evidence bar

A capsule may leave `UNRESOLVED` only on this evidence:

1. **A fresh Drive readback in `CENTRAL_FRESH_DRIVE_READBACK` mode.** That mode already exists and
   is already fail-closed: `source-capsule-validator.mjs:121-122` rejects any other mode with
   "Drive readback must be `CENTRAL_FRESH_DRIVE_READBACK` (LOCAL rclone evidence is corroboration
   only and cannot satisfy raw authority lock)". The rule reuses it rather than inventing a new one.
2. **Per candidate object:** `drive_file_id`, filename, bytes, SHA-256, revision — exactly the
   fields `SRC068`'s `authority.variants.A/B` and its readback already carry.
3. **A folder/sibling enumeration covering the Source's revision chain**, not just one file readback.
   Steps 1–2 of §2.3 are *negative* claims ("there is no other candidate"), and a negative claim
   needs a listing. This is what distinguishes `SRC066`'s `superseded_copies_excluded` and
   `SRC069`'s `root_copy_excluded` from a bare `fresh_drive` record.
4. **An explicit `disposition` on every object that is not the authority** (`NOT_AUTHORITY` in the
   `SRC066` / `SRC069` precedent), so the exclusion is a recorded act rather than an omission.
5. **A timestamp and an owner** for the readback (`verified_at_utc`, `verified_by`), so the batch
   pass has one date to cite per capsule.

What the corpus already has: all 11 `SRC` capsules carry a
`src/03_sources/<id>/evidence/source/drive-authority-readback.json` in `CENTRAL_FRESH_DRIVE_READBACK`
mode, dated 2026-08-28 (`SRC064`) through 2026-09-05 (`SRC066`). What they do **not** all have is
item 3 — an enumeration plus an explicit exclusion record. Only `SRC066`
(`superseded_copies_excluded`), `SRC069` (`root_copy_excluded`) and `SRC068` (`variants`) carry
that today. `CDX014` (CDX namespace) carries **no** SRC-style readback artifact at all: its
`evidence/` directory contains only `evidence/s3/roundtrip.json`.

### 4.2 Where the decision is recorded

| Field | Purpose | Status today |
| --- | --- | --- |
| `duplicate_variant_status` | the adjudication **outcome** | exists on all 12 manifests; not validated anywhere |
| `duplicate_variant_note` | the adjudication **record**: date, readback refs, the candidate table, the disposition, the step of §2.3 that closed it | **does not exist on any manifest**; the census §3.E records the same absence |
| `authority_mode` | the runtime **contract** (`SINGLE` / `DUAL_VARIANT`) | enforced; `SRC068` is `DUAL_VARIANT`, the other 11 are absent → default `SINGLE` |
| `variant_selector`, `authority.variants`, `source_contract.variant_contract` | the selector shape | enforced **only** for `DUAL_VARIANT` capsules; absent on the other 11 |

Proposed rule: `duplicate_variant_status` + `duplicate_variant_note` is written for **every**
capsule, including the ones with no variant (that is what makes the field self-documenting instead
of inert). `authority_mode` / `variant_selector` / `authority.variants` are written **only** when a
selector exists (step 3 of §2.3); adding a selector is a runtime-contract change and stays outside
this rule.

### 4.3 Adjudicator and delivery

- **Adjudicator: CENTRAL**, the single owner of governance resolution (census §6: "No
  recommendation in §3–§5 is a decision. Governance resolution authority is CENTRAL's.").
- **Delivery pattern** already established in this lane: `139b2c74` — "Executed by CENTRAL applying
  LOCAL 1's prepared edit set verbatim (LOCAL 1 session was read-only; 3 STOP reports on file)".
  The adjudication pass should reuse it: the lane prepares a per-capsule edit set, CENTRAL applies
  it, and the lane issues no decision on its own.
- **No manifest edit lands without the readback of §4.1** pointing at the same capsule; a
  `duplicate_variant_note` without a cited readback is fail-closed by construction.

### 4.4 Ordering — one batch pass, by design

One pass over all 11 `UNRESOLVED` capsules, sequenced as: (i) fix the vocabulary (§5) once,
(ii) take/refresh the readbacks of §4.1, (iii) apply §2.3 + §3.1 mechanically, (iv) write the 11
values and notes in one commit set. Rationale: the census §3.E option 2 argument (one written rule
plus one pass is cheaper than 11 bespoke decisions, and it makes the next capsule's value
derivable), and it prevents per-lane lanes from inventing ad-hoc values before the rule is written.

Sequencing constraint to confirm with CENTRAL: the census puts the pass after `CDX014` S4 closes,
because `CDX014` is the instance that decides whether `PATH_CONTEXT_VARIANT_ONLY` (§5) is needed at
all. If that value is not adopted, `CDX014`'s Question A still closes at step 1 of §2.3 and its
rename stays in `authority_context`.

## 5. Vocabulary

### 5.1 What exists today

`duplicate_variant_status` has two observed values and **zero** enforcement:

| Value | Capsules | Notes |
| --- | --- | --- |
| `UNRESOLVED` | 11 — `CDX014`, `SRC047`, `SRC056`, `SRC057`, `SRC058`, `SRC060`, `SRC062`, `SRC064`, `SRC066`, `SRC069`, `SRC071` | also the template default in `src/03_sources/_template/manifest.example.json` and `src/04_codex/_template/manifest.example.json` |
| `DUAL_MEDIA_VARIANT` | 1 — `SRC068` | the only adjudicated capsule; identical to `SRC068`'s `variant_policy` |

Nothing in `src/08_harness/`, `.github/`, or `tests/` validates the field.
`tests/source-capsule-stage-gate-contract.test.mjs:39` only sets it in a fixture
(`duplicate_variant_status: 'UNRESOLVED'`); it never asserts it. See §7.

There is a second, **parallel** vocabulary for the same question family that *is* enforced:
`authority_mode ∈ { SINGLE, DUAL_VARIANT }` (`resolveAuthorityMode` defaults a missing value to
`SINGLE` and rejects anything else). `duplicate_variant_status` and `authority_mode` currently
carry overlapping meaning — `SRC068` is the only capsule where both are set, and they agree.

### 5.2 Proposed additive values (all proposals for CENTRAL)

| Proposed value | Meaning | Justification |
| --- | --- | --- |
| `SINGLE_EXECUTABLE_NO_DUPLICATE` | Adjudicated: exactly one candidate file object, one SHA-256, no other candidate anywhere in the revision chain. | Without a positive "none" value the field can never be closed for the capsules that have no duplicate, so the batch pass would have nothing to write for most of them and `UNRESOLVED` would stay ambiguous between "not checked" and "checked, none". |
| `DUPLICATE_COPY_SAME_SHA` | Adjudicated: ≥2 Drive objects with ≥2 distinct file ids and an **identical** SHA-256; no selector; the excluded object carries `disposition: NOT_AUTHORITY`. | `SRC069` already has this exact fact recorded and unrepresented: `root_copy_excluded` is file id `1WyiJtGv-EiBjA8Fih7XBbQRaE2hybNN7`, 27600 bytes, SHA-256 `64d5a545a45013b12463f53af7d7be12b7c1c7b0de6f56cb82761fd469791fb3` — byte-identical to the authority — at the Track 69 root depth where the authority's own `../../` paths do not resolve. §3.1 criterion 2 fails, so it is not a variant, but the corpus needs a value that says so rather than hiding it in `authority_context`. |
| `PATH_CONTEXT_VARIANT_ONLY` | Adjudicated: no duplicate executable; the only variant-like fact is a path/serving contract owned by `authority_context`. | Census §3.F option 3. Needed for `CDX014`'s `12_…`→`12-1_…` rename (§2.4), where one status field is currently asked to answer two questions. Keeping the two questions separate is what makes the row closable. |
| `DUAL_MEDIA_VARIANT` (keep, now defined) | Two or more candidates with **distinct** SHA-256 behind a named selector. | Retained exactly as `SRC068` uses it; the definition in §3.1 is added so the next capsule is derivable instead of bespoke. |

### 5.3 Proposed harmonization (observation + follow-up, not included in this unit)

`SRC068` records the same selector four ways — `variant_selector`, `source_contract.variant_contract`,
`authority.variants`, and (optionally) `authority.variant_selector`, whose drift is checked against
`manifest.variant_selector` in `source-capsule-validator.mjs:137-140`. There is no single source of
truth, and no validator compares `duplicate_variant_status` with `variant_policy`.

Proposal for a later unit, flagged not scheduled: keep `authority_mode` as the enforced
runtime-contract enum, keep `duplicate_variant_status` as the adjudication outcome, and drop the
redundant `variant_policy` in favor of `source_contract.variant_contract.type`. Any such
harmonization requires harness and template edits, so it is out of scope here (§8).

### 5.4 Open sub-question this rule does not settle

`SRC066`'s `superseded_copies_excluded` records two further Drive objects — V1.0 (320,169 bytes)
and V1.1 (27,323 bytes) — with `disposition: NOT_AUTHORITY`, never downloaded, served or rendered.
They are byte-distinct from the authority (so §3.1 criterion 2 passes) but they are superseded
revisions with no selector (criterion 4 fails). Under §2.3 step 3 they are revision history, so the
capsule reads as "no current duplicate" — but none of the proposed values says *both* "no current
duplicate" **and** "superseded byte-distinct copies exist". Proposals for CENTRAL: either accept
`SINGLE_EXECUTABLE_NO_DUPLICATE` with the superseded table inside `duplicate_variant_note`, or add a
fifth value such as `SUPERSeded_COPIES_EXCLUDED`. Left undecided by design.

## 6. The 11 `UNRESOLVED` capsules — known facts

This is the input inventory for the batch pass. It records facts only; **no value is proposed for
any row** and no decision is implied. SHA-256 values are shown short (first 12 hex) — the full
values are in the manifests cited in §1.

| Capsule | Authority file · bytes · SHA-256 (short) · file id | Revision | Readback (date) | Enumeration / exclusion evidence on file | Variant-relevant known fact |
| --- | --- | --- | --- | --- | --- |
| `CDX014` | `최종본.html` · 19631 · `0cef6497103d` · `1YKq2WiINn5MWhll8sSBq1azHMwaocIIP` | `V1` | **none** (`evidence/` holds only `s3/roundtrip.json`) | none; `authority_context_required=true`, `capture_surface.mode=CONTEXT_AWARE_ONLY` | Single file. The only "variant-like" fact is the sibling folder rename `12_…`→`12-1_…` (2026-08-17, 178 media would 404) — §2.4. Also the D11 instance: `master_rows=["MST080"]`. |
| `SRC047` | `최종선택-12_V4.2.5_CINEMATIC_FRONTDOOR·PINNED_NAV_MENU_FIX_후보.html` · 40890 · `676f5220ec4e` · `18tZB-eTCz6aeceNlbhXN3iEnfD1N442X` | `V4.2.5` | yes, 2026-09-01T15:04:33Z | none (bare `fresh_drive` only) | Filename says `최종선택` ("final selection") + `후보` ("candidate"), which names a selection that happened on Drive; no second candidate object is recorded in the repository. `master_rows=["MST098"]`. |
| `SRC056` | `후보_버전1.2_세로형_모먼트관계망_전체조망.html` · 45761 · `1828ef47acef` · `1UDURMSsyI0zF5Lyqu-jIT3SqH0BKgcxa` | `V1.2` | yes, 2026-08-30T15:18:13Z | none (bare `fresh_drive`, `git_transport_crosscheck`, `identity_non_inference`) | Filename carries `후보` ("candidate"); no second candidate object is recorded in the repository. |
| `SRC057` | `후보_버전1.3_리빙글라스_모먼트카드_모바일반응형수정.html` · 676320 · `ca30cdb43006` · `1J4_JbDs256rYXMayx-6EOA95au5hYmRg` | `V1.3` | yes, 2026-08-31T00:00:00Z | none (bare `fresh_drive`, `identity_non_inference`) | Filename carries `후보`. Separately holds two other open states (`source_contract.adoption=HOLD`, `source_contract.lineage_reservation=HOLD`); census §3.G treats those as separate decisions. |
| `SRC058` | `★_최종_58_리빙메모리_핀보드.html` · 532697 · `9fd5b6e7b69b` · `1u83WpPC06BtPYtOvX1eBHUibn7L29ntk` | `V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE` | yes, 2026-09-01T00:04:00Z | `identity_folder_crosscheck` (folder identity only, no sibling enumeration) | Filename carries `★_최종` ("final") + a `V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE` revision tag. Cross-check note ties the folder to intake PR `#551` by byte identity. |
| `SRC060` | `★_현재후보_Track60_V1.2_REAL_NAVIGATION.html` · 55260 · `c35b66fb46b5` · `1Pu6hSbIfW9X70jJCtRTs0WQyWaZvy_3M` | `V1.2` | yes, 2026-08-31T13:36:00Z | `identity_folder_crosscheck` — records **two different folders** (top-level identity folder `1c5c0_GDYz3c4jt1rsraf8l3IIkMKZO8T` `60_3D모먼트클러스터_심층탐색_55,56,59연결버전` vs candidate folder `1SuDA9qtZiz6lETg9MAgpmeWd16IolUAm` `버전1.2_실제트랙네비게이션_후보`) | Filename carries `★_현재후보` ("current candidate"). The cross-check is the closest thing in the corpus to a folder-chain observation: the authority sits in a revision subfolder of the identity folder, i.e. earlier revisions may exist one level up. |
| `SRC062` | `62_기억조각상_원형레일전시.html` · 20728647 · `bc5484a1c545` · `1Zivp0wDxNOw4Vg1ame8sjZLspHMdQPi-` | `V1.1` | yes, 2026-09-03T13:11:56Z | none (bare `fresh_drive`) | Largest authority in the corpus (20.7 MB). Filename carries no candidate marker. |
| `SRC064` | `현재후보.html` · 1565313 · `80886540bb8e` · `18Q-kviMi4iP0Ns3o30jN6KBkipa1RInl` | `V1.2.1` | yes, 2026-08-28T09:10:00Z | none (bare `fresh_drive`, `git_transport_crosscheck`, `identity_non_inference`) | Filename carries `현재후보` ("current candidate"); no second candidate object is recorded in the repository. |
| `SRC066` | `현재후보.html` · 166996 · `b50e16984774` · `1IV94ub-t9qFs37FfwamViNUYtq5UkvaZ` | `V1.2_제품목적·실제Moment체험강화_후보` | yes, 2026-09-05T13:27:35Z (`verified_by` names the CLEAN-108 SRC066 S3 implementer; Drive API SHA-256 equals the local SHA-256) | **`superseded_copies_excluded`** — V1.0 (320,169 B) and V1.1 (27,323 B), `disposition: NOT_AUTHORITY`, never downloaded/served/rendered; plus `parent_chain` (revision folder `1Xb8lUU1RPo--npXQSrpObtMQj1OQoH3v` inside track folder `1cC8htsACOK3AQeE8mjIsuKwCqM42nlqs`) | The strongest single-capsule precedent for §5.4: two byte-distinct, explicitly excluded superseded copies. Also the only capsule whose earlier `drive_folder_id` was proven **dead** — the `#589` correction note records the superseded id `1xHGY0_7xoh-FmryuFt8tEgqlC9X1GFXs` and the fresh readback that replaced it. Frozen defect `D1_MANIFEST_DEAD_DRIVE_FOLDER_ID` is preserved, not repaired. `master_rows=["MST046"]`. |
| `SRC069` | `69_v3_exact_source_multi_template_portal.html` · 27600 · `64d5a545a450` · `1IFU5iXRrO06EoJVG6Sd4UdWu-wUYJh8C` | `V3_EXACT_SOURCE_MULTI_TEMPLATE_PORTAL` | yes, 2026-09-04T16:13:30Z | **`root_copy_excluded`** — file id `1WyiJtGv-EiBjA8Fih7XBbQRaE2hybNN7`, 27600 B, SHA-256 `64d5a545a450…` (**identical** to the authority), `disposition: NOT_AUTHORITY`; plus a 4-level `parent_chain` whose `RELATIVE_ANCHOR_TARGET` is the root of all 11 sibling portal targets | The corpus's only byte-identical duplicate of the authority (`DUPLICATE_COPY_SAME_SHA` in §5.2). It sits at the Track 69 root depth, where the authority's own `../../` paths do not resolve — so the exclusion reason is path-context, not content. `authority_context_required=true`, `capture_surface.mode=CONTEXT_AWARE_ONLY`. |
| `SRC071` | `71_V7_FINAL_INTERACTIVE_R2.4.html` · 24039 · `2a646b96e032` · `1YWLz4gsIoqBi7TXINd5-IjR_mFg5VBtL` | `V7_FINAL_INTERACTIVE_R2.4` | yes, 2026-09-04T19:28:14Z | none in the readback | The strongest duplicate-candidate fact in the corpus and the only place it is recorded: `src/03_sources/SRC071/authority-context.json` → `drive.noncanonical_same_name_file_ids: ["17cCBo7cObMbytQ8pHrJACEkfIpGCbaCb"]` — a **second Drive file of the same name**, declared non-canonical. No SHA-256 is recorded for it, so §2.3 step 2 cannot be evaluated from repository evidence alone. Note the manifest asymmetry: it carries `authority_context_ref` but not `authority_context_required` / `authority_context_note`, while `authority-context.json` itself sets `runtime_context_required: true`. Also holds `portal_mapping_status=MAPPING_HOLD` (census §3.I) — a separate decision. |

Readback coverage summary: 11 of 11 `SRC` capsules have a `CENTRAL_FRESH_DRIVE_READBACK` on file;
0 of 1 CDX capsule does. Enumeration-or-exclusion evidence exists on 3 of 12 capsules
(`SRC066`, `SRC069`, `SRC068`).

## 7. Why the field is currently invisible

Two facts make the current state hard to notice, and both are recorded so the batch pass does not
rediscover them:

1. **No enforcement.** `duplicate_variant_status` appears in 12 manifests, 2 templates, this
   document, and one test fixture (`tests/source-capsule-stage-gate-contract.test.mjs:39`). No
   harness, validator, workflow, or assertion reads it. A capsule could carry any value there and
   every existing gate would still pass. (The census §3.E option 3 is exactly this: "Option 3 keeps
   a governance question invisible in a field that CI never checks.")
2. **The template default is the open state.** Both `manifest.example.json` templates default the
   field to `UNRESOLVED`, so a new capsule inherits the open state by construction.

Proposal for CENTRAL (out of scope for this unit, flagged only): once the vocabulary of §5 is
adopted, add a fail-closed check that `duplicate_variant_status` is one of the adopted values and
that a non-`UNRESOLVED` value requires a `duplicate_variant_note` citing a
`CENTRAL_FRESH_DRIVE_READBACK`. That is a harness + test edit and must land as its own unit.

## 8. Invariants and out of scope

- **No existing file was modified by this unit.** No `record.json`, `manifest.json`,
  `authority-context.json`, `authority-context` sidecar, ledger, harness, workflow, test, template,
  or runtime file was touched. This document is the only new file.
- **Zero adjudications.** No capsule's `duplicate_variant_status` was changed, no
  `duplicate_variant_note` was written, and no value from §5.2 is adopted anywhere.
- **No Drive access and no byte download.** Every id, byte count and digest in §6 is copied from a
  repository file; nothing was fetched, re-downloaded, mirrored or vendored, and no URL rewrite is
  proposed (§2.4 keeps `CDX014`'s zero-rewrite constraint intact).
- **No harness or template change**, no third-variant enumeration change (§3.3), no
  `authority_mode` change, no selector creation.
- **No `record.json` change**: nothing here touches the `MST` namespace, `mapping_status`,
  `identity_refs`, or `family_ref`.
- **No GitHub issue or PR comment was written**; delivery is this draft PR only.
- Everything above is a proposal for CENTRAL. Adjudication authority is CENTRAL's.

## 9. Cross-reference index

| Reference | Role |
| --- | --- |
| `#589` comment `5556293418`, disposition 3 (ADOPTED) | Authority for this unit: one corpus-wide rule + one batch adjudication pass |
| `docs/design-intake/mst-unresolved-governance-census-2026-09-05.md` §3.E | The problem statement: 11 `UNRESOLVED`, 1 adjudicated, no corpus rule, no `duplicate_variant_note` anywhere |
| same, §3.F | The `CDX014` worked example this rule's §2 promotes |
| same, §5 decision 3 | The batch pass this document prepares |
| `src/03_sources/SRC068/manifest.json` | The only adjudicated precedent; base for §3 |
| `src/03_sources/SRC068/evidence/source/drive-authority-readback.json` | The per-variant evidence shape (`variants.A/B` with folder/file/bytes/SHA) |
| `src/08_harness/dual-variant-mechanical.mjs` | `resolveAuthorityMode` (`SINGLE`/`DUAL_VARIANT`), `DUAL_VARIANT_KEYS=['A','B']`, `validateDualVariantSelector`, `listDualVariantKeys` |
| `src/08_harness/source-capsule-validator.mjs:121-122`, `:284` | `CENTRAL_FRESH_DRIVE_READBACK` is the only accepted readback mode |
| `139b2c74b872acb0ff4519db1fb5bf47c63d911f` (`#638`) | The CENTRAL-applies-LOCAL-prepared-edit-set delivery pattern proposed in §4.3 |
| `dd20c2c3e42e5289a402346b028c09f8d2076533` (`#637`) | `SRC066` S4 promotion, merged to main at this document's base |
| `5551812640`, `5553007835` | Prior `#589` CENTRAL verdict records cited by the census |
| `#606` / `#608` / `#625` | `SRC068` dual-variant contract: split, S4 parity, replay |
| `#635` / `#636` | `CDX014` capsule materialization / the census document |

## 10. Reproduction

Deterministic reads (read-only, run from the repository root at `as_of_main`):

```bash
# current value of the field across every capsule + both templates
rg -n 'duplicate_variant_status' src/03_sources/*/manifest.json \
  src/04_codex/*/manifest.json src/*/_template/manifest.example.json

# who enforces it (expected: fixtures only, no harness/validator)
rg -n 'duplicate_variant_status' src/08_harness tests .github

# the enforced parallel vocabulary
rg -n "resolveAuthorityMode|DUAL_VARIANT_KEYS|validateDualVariantSelector" src/08_harness

# the SRC068 precedent, in full
node -e "const m=require('./src/03_sources/SRC068/manifest.json');console.log(JSON.stringify({authority_mode:m.authority_mode,variants:m.authority.variants,variant_policy:m.variant_policy,variant_selector:m.variant_selector,variant_contract:m.source_contract.variant_contract,status:m.duplicate_variant_status},null,2))"

# fresh Drive readbacks per capsule, with the exclusion records
node -e "const fs=require('fs');for(const id of ['SRC047','SRC056','SRC057','SRC058','SRC060','SRC062','SRC064','SRC066','SRC068','SRC069','SRC071']){const p='src/03_sources/'+id+'/evidence/source/drive-authority-readback.json';console.log(id, fs.existsSync(p)?Object.keys(JSON.parse(fs.readFileSync(p,'utf8'))).join(','):'ABSENT')}"

# the two exclusion records and the one non-canonical same-name file
node -e "const fs=require('fs');console.log('SRC066',JSON.stringify(JSON.parse(fs.readFileSync('src/03_sources/SRC066/evidence/source/drive-authority-readback.json','utf8')).superseded_copies_excluded));console.log('SRC069',JSON.stringify(JSON.parse(fs.readFileSync('src/03_sources/SRC069/evidence/source/drive-authority-readback.json','utf8')).root_copy_excluded));console.log('SRC071',JSON.stringify(JSON.parse(fs.readFileSync('src/03_sources/SRC071/authority-context.json','utf8')).drive.noncanonical_same_name_file_ids))"
```
