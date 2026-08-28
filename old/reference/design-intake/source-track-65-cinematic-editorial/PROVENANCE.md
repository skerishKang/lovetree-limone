# source-track-65-cinematic-editorial — Provenance / Reference Skeleton

Drive originals are read-only reference; product code never executes sibling source HTML/JS.

- stableId: source-track-65-cinematic-editorial
- sourceTrackId: Track65
- classification: NEW_LINEAGE
- lifecycle: REFERENCE_PINNED
- scenarioId: entry-onboarding
- sourceLabel: 65_입덕단서_시네마틱에디토리얼 / Track root folder 1WKpu_AE89-HbEL4xV0y_eyQqiUASdxJb (Issue #236)
- driveFolderId: 1WKpu_AE89-HbEL4xV0y_eyQqiUASdxJb
- sourceSnapshot: V2.1.1_STORY_LOCKED_33CUT_REBUILD (CURRENT_AT_OBSERVATION @ 2026-08-16) — supersedes withdrawn GATE B of V2.1_H3_33CUT_FORENSIC_REBUILD
- current executable: NOT AVAILABLE — GATE B = REJECT/REBUILD; storyboard/motion/HTML all HOLD

## Artifacts

| filename | Drive ID | bytes | SHA256 | role | status |
|---|---|---|---|---|---|
| 33_디자인팀장10기_65_입덕단서_시네마틱에디토리얼_V1_작업지시_2026-08-13.docx | 1LoVATtowbSufxlY5U9aYrvvmvwwMEP3FSzxSUXJ-EFc | 26086 | 42cee2247b704c10aba355c55b0f9a994e376e2c24ef6c3b60f595cecff41c20 | instruction (V1 evidence) | PINNED (this directory, byte-exact copy) |
| 설계팀장8기_65_V2_LUSION_H3_SCROLL_CINEMATIC_디자인팀장15기_신규작업지시_2026-08-16.md | 1D3rlZWXlELQNis4c1UoRy3Nob52N2l2M | 30965 | 7ad5580c9b442c4b007d4995b08532ef71516306a587662e2d7a5a224b47acee | instruction (V2 expansion) | PINNED (this directory, byte-exact copy) |
| ★_현재후보_65_V2_LUSION_H3_SCROLL_CINEMATIC.html | 1MQd-FdlOSPP8QhOSzt43sOhjbTV14-Dg | 50765 | b2fadd397876c4e449dfc0b22b34f8d5301e21dc445f706b96e29241532373b0 | executable (historical V2) | PINNED (this directory, byte-exact copy; fingerprint matches sibling `65_V2_SHA256SUMS.txt`) |

All three artifacts are byte-exact copies pinned in this directory. The historical V2 HTML was
fetched via folder path `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/65_입덕단서_시네마틱에디토리얼/
V6_LUSION_H3_SCROLL_CINEMATIC_CANDIDATE/` and verified against the expected fingerprint
(50,765 B, SHA256 `b2fadd39…73b0`) before pinning. The V2 expansion instruction was located under
`99_이전문서/01_팀세션_이전·중단기록/01_설계팀장_세대별/08_설계팀장8기_휴식/02_디자인팀장_전달지시서/디자인팀장15기/`.

## Intake transport note

At first intake the Track65 shared Drive folder was outside the `padiemipu:` remote scope when
addressed by file ID, and anonymous HTTPS download redirected to Google sign-in — the two V2-era
artifacts were therefore registered `PENDING` (fail-closed, not fabricated). A follow-up pass
located both by folder path and promoted them to `PINNED` after SHA-256 verification.

## Rules

- Historical V2 executable is REFERENCE/comparison evidence only — never port as current.
- Do not interpret the sibling packaging folder label `V7` (Drive 1qyoXpwM_-2vN6H8x1nIK09-6QXBuQhy4)
  as functional Revision V7; it contains the historical `65_V2_*` package.
- Revision authority comes from explicit design instructions only.
- Native implementation must not start before CUT19/CUT25 assets close coverage AND a new
  story-locked GATE B explicitly passes (see docs/design-intake/source-track-65-v2-1-1-gate.md).
