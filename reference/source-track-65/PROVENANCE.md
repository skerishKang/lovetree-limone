# source-track-65 — V2.2 오너픽 전면활용·스토리 재정렬 (owner-pick / story-reorder) Provenance

Drive originals are read-only reference; product code never executes sibling source HTML/JS.

- stableId: source-track-65-cinematic-editorial-v2-2
- sourceTrackId: Track65 V2.2
- parent intake: source-track-65-cinematic-editorial (V2.1.1_STORY_LOCKED_33CUT_REBUILD, docs/design-intake/source-track-65-v2-1-1-gate.md)
- classification: NEW_LINEAGE (candidate identity only)
- lifecycle: REFERENCE_PINNED — V2.2 is a storyboard/asset authority revision; STORYBOARD / MOTION / HTML = NOT STARTED per the sibling's own gate check (`C_ASSET_USAGE_NOTE.md`)
- scenarioId: entry-onboarding
- sourceLabel: 65_입덕단서_시네마틱에디토리얼 / Track root folder 1WKpu_AE89-HbEL4xV0y_eyQqiUASdxJb / V9_오너픽전면활용·스토리재정렬_후보 folder 1-6uhhzVoQm4m8LTjjTC04MqVhFap12yU (Issue #236 V2.2 source gate)
- driveFolderId: 1WKpu_AE89-HbEL4xV0y_eyQqiUASdxJb
- preserved read-only at: `reference/source-track-65/V9_오너픽전면활용·스토리재정렬_후보/` (11 objects, byte-exact, SHA256SUMS ledger in this directory)
- sourceSnapshot: V2.2_OWNERPICK_FULL_STORY_REORDER (CURRENT_AT_OBSERVATION @ 2026-08-22T01:25:33.000Z)
- current executable: NOT AVAILABLE for V2.2 — the first executable in this family is the separate V2.2.1 candidate (`V10_오너픽전체_H3_SCROLL_HTML_후보/★_현재후보_65_V2.2.1_OWNERPICK_FULL_H3_SCROLL_CINEMATIC.html`, Drive 1Go072eyZmOdIJnTGmQd3SJDFWjjy0slj), intentionally out of scope for this gate

## Artifacts (11/11 PINNED, committed byte-exact)

| path (under V9_오너픽전면활용·스토리재정렬_후보/) | Drive ID | bytes | role |
|---|---|---:|---|
| A_TRACK65_V2.2_33CUT_CONTACT_SHEET.png | 1xhVVB_4R4HCECbfv3mBteH4kg5K1ei23 | 5,261,901 | storyboard-contact-sheet (V2.2-labeled 33-cut board) |
| B_REPRESENTATIVE_8CUT_OVERVIEW.png | 1RlW6aLvwgoqNeKKTAySbTgRJ76GZJB3O | 1,542,351 | storyboard-overview |
| C_ASSET_USAGE_NOTE.md | 1IpnBvtU0oO9KwGnKcIzs3mij-A8vAfXl | 2,146 | asset-usage-note (V2.2 authority note) |
| 02_REPRESENTATIVE_8/REP_01_The_First_Clue.png | 1wxZ4ay1jb6loPl9YPL5c6JETL-_l1POk | 2,112,825 | representative-cut |
| 02_REPRESENTATIVE_8/REP_04_Left_Eye_+_Instant_Photo.png | 1EvT-FJCJcc_TOzNUS40VQ0kA4GNayTfO | 1,308,405 | representative-cut |
| 02_REPRESENTATIVE_8/REP_11_Left-Eye_Portrait.png | 1HW41yXPecMkEn2E9Y6bVaqVbXxGS6PLy | 1,384,198 | representative-cut |
| 02_REPRESENTATIVE_8/REP_19_Stage_Revelation.png | 1iP9FShcJWRDUjurdmrmVXYjRJXRCtTOi | 1,660,820 | representative-cut |
| 02_REPRESENTATIVE_8/REP_23_What_I_Saw_Heard_Felt.png | 12KEIYiZCuVJ-XxRCFH0eJqxDcK4CI8CR | 1,234,486 | representative-cut |
| 02_REPRESENTATIVE_8/REP_29_Floating_Photo_Memory.png | 1Xw-bwOn5kYAR3KtHuKOzW5DF5SqfLWwS | 940,360 | representative-cut |
| 02_REPRESENTATIVE_8/REP_31_Hanging_Photo_Cards.png | 1nK1oJDEtVsZVoJsvIB8baXKLEgRMvIZ- | 950,322 | representative-cut |
| 02_REPRESENTATIVE_8/REP_33_Final_LoveTree.png | 1yvWyq11M3f2m6RjPpyUsjGb6nmcTgr6Z | 2,374,604 | representative-cut |

SHA-256 fingerprints are recorded in `SHA256SUMS` (11 entries; ledger self-reference excluded) and
mirrored in `design-intake/manifests/source-track-65-cinematic-editorial-v2-2.json`.

## Provenance contract

- All 11 objects downloaded from Drive folder `V9_오너픽전면활용·스토리재정렬_후보`
  (`--drive-root-folder-id 1-6uhhzVoQm4m8LTjjTC04MqVhFap12yU`) and verified byte-size-exact
  against the Drive listing before fingerprinting. The Drive API exposes no server-side content
  hash (MD5/SHA) for these objects, so this preservation establishes a **single-sided local
  SHA-256 baseline**: any future re-download that disagrees with `SHA256SUMS` must be treated as
  a provenance incident and reconciled before any implementation slice consumes this evidence.
- The V2.2 MASTER instruction referenced by `C_ASSET_USAGE_NOTE.md`
  (`설계팀장8기_65_V2.2_오너픽전면활용·스토리재정렬_디자인팀장16기_긴급수정지시_2026-08-16.md`)
  was **not locatable** in the `padiemipu:` remote scope at intake time (searched: the Track65
  folder recursively, `[01_러브트리]/03_디자인채택본`, `[01_러브트리]/99_이전문서` full subtree,
  설계팀장8기 archive `02_디자인팀장_전달지시서` (15기+16기), and `[01_러브트리]/02_디자인팀`).
  It is registered fail-closed as a manifest `sourceDefects` entry / gate open item — never fabricated.

## Rules

- The V2.2 storyboard/asset set supersedes the withdrawn GATE B lineage as story intent, but it
  does NOT lift any HOLD of the V2.1.1 gate: GATE_B=REJECT_REBUILD, ASSET_COVERAGE=31/33,
  CUT19/CUT25 gaps, and the story-locked GATE B PASS requirement all remain in force until
  explicitly re-judged by the design lead.
- Sibling QA verdicts recorded in `C_ASSET_USAGE_NOTE.md` (OWNER_PICK_ASSET_USAGE = CLEAR etc.)
  are sibling-side claims pinned as evidence, not repository acceptance results.
- Revision ladder after V2.2 (sibling candidates, no approval evidence pinned here):
  V2.2.1 OWNERPICK_FULL H3 scroll HTML → V2.2.3 SELECTIVE_16CUT → V2.2.4 MOTION_EDITING →
  V2.2.5 EXTENDED_MOTION_EDITING → V2.3 KINETIC_33BEAT comparison candidate.
- Native implementation must not start from this gate registration.
