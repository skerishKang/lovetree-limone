# Source Track 70 — Preservation Provenance

Issue: #291 · Refs: #80 #236 #287
Drive source (read-only): `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/70_모먼트리빌_퓨처에디토리얼`
Drive folder ID: `11wFgEktEN2oaQ3N2A-geQKp9HqxWn73H`
Preserved at: `reference/source-track-70-moment-reveal-editorial/`
Transport date: 2026-08-21 (WSL-native worktree, rclone `copy --transfers 2`, read-only; Drive originals untouched)

## Scope

- Full-tree local preservation: 143 Drive objects listed, 142 unique files transported
  (`비교/70_COMPARE.html` exists as two same-name Drive objects — IDs `1gA0sMsPB8n9TyOemi1nkXKQeEBKS7JCt`
  and `16doWQLeAp-syGq-PQUkoegaD7N8buyJ5`; rclone transports one and skips the duplicate. The
  transported bytes are pinned in `SHA256SUMS`.)
- `SHA256SUMS` covers all 142 transported files (full tree), generated from this local copy.
- Integrity spot checks against Drive-native MD5 passed (`README_70.md`,
  `선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html`).

## Repository commit selection (guardrail: total ≤50MB, single file ≤10MB)

Committed from this directory (canonical paths only):

| Path | Bytes | Reason |
|---|---|---|
| `README_70.md` | 1,852 | track README / authority status |
| `70_LOVETREE_MOTIONSITES_STANDALONE_PROMPT.md` | 14,626 | standalone instruction |
| `70_V3_WHITE_VEIL_EMOTIONAL_REVEAL_PROMPT_디자인팀장18기.docx` | 11,556 | instruction (18기) |
| `선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html` | 31,282 | selected candidate ① executable |
| `선택-V3_NAV_RETURN_FIX/70_V2.1_COMPARE_WITH_V2.html` | 2,146 | compare helper |
| `선택-V3_NAV_RETURN_FIX/README_70_V2.1_NAV_RETURN_FIX.md` | 1,434 | candidate ① README |
| `선택-11_V11_INSTANT_CANVAS_TRAIL_REVEAL/README_V11_INSTANT_CANVAS_TRAIL_REVEAL.txt` | 804 | candidate ② README |
| `비교/70_COMPARE.html` | 2,100 | A/B compare helper |
| `비교/70_V2_COMPARE_WITH_V1.html` | 2,121 | compare helper |
| `A_ORIGINAL_PROMPT_EXACT/70_A_ORIGINAL_LGPSM_PROMPT_REPLICA.html` | 19,644 | original-prompt baseline executable |
| `A_ORIGINAL_PROMPT_EXACT/70_A_SOURCE_MOTIONSITES_PROMPT.md` | 10,619 | original prompt instruction |
| `A_ORIGINAL_PROMPT_EXACT/3.Synth Mode.txt` | 10,816 | original prompt source text |
| `B_LOVETREE_ADAPTED/70_B_LOVETREE_MOMENT_REVEAL.html` | 20,815 | LoveTree-adapted executable |
| `B_LOVETREE_ADAPTED/70_B_LOVETREE_PROMPT_OVERRIDE.md` | 4,237 | override instruction |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/00_MASTER/00_MASTER_Track70_19기_현황분석·자산판정·제작게이트_2026-08-17_v1.docx` | 12,874 | 19기 master gate analysis |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_03_APPROVED_4MODEL_REFERENCE.png` | 1,851,143 | approved 4-model reference |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_06_V3_ONE_MASTER_EXACT_RULE.docx` | 11,556 | V3 one-master exact rule |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/02_CLEAN_LOCK/CANDIDATE_LOCK_LT01_CLEAN_MASTER.png` | 2,892,369 | clean master LT01 |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/02_CLEAN_LOCK/CANDIDATE_LOCK_LT02_CLEAN_MASTER.png` | 2,965,461 | clean master LT02 |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/02_CLEAN_LOCK/CANDIDATE_LOCK_LT03_CLEAN_MASTER.png` | 2,850,755 | clean master LT03 |
| `00_CURRENT_19기_TRACK70_분석·제작게이트/02_CLEAN_LOCK/CANDIDATE_LOCK_LT04_CLEAN_MASTER.png` | 2,807,883 | clean master LT04 |
| `SHA256SUMS` | — | full-tree fingerprint manifest |
| `PROVENANCE.md` | — | this file |

Byte-duplicate copies NOT committed again (identical SHA256, canonical path above is committed):
`선택-V3_NAV_RETURN_FIX/70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html`,
`00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_04_V2.1_NAV_RETURN_FIX.html` (both =
`선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html`),
`00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_01_MotionSites_원본프롬프트.md` (=
`A_ORIGINAL_PROMPT_EXACT/70_A_SOURCE_MOTIONSITES_PROMPT.md`),
`00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_02_LoveTree_Override.md` (=
`B_LOVETREE_ADAPTED/70_B_LOVETREE_PROMPT_OVERRIDE.md`),
`선택-11_V11_INSTANT_CANVAS_TRAIL_REVEAL/70_V11_INSTANT_CANVAS_TRAIL_REVEAL_디자인팀장19기.html` (=
`선택2-70_V11_INSTANT_CANVAS_TRAIL_REVEAL_디자인팀장19기.html`),
`00_CURRENT_19기_TRACK70_분석·제작게이트/01_SOURCE_LOCK/SOURCE_LOCK_05_Track70_기준동작녹화.mp4` (=
`선택1-70_모먼트리빌_퓨처에디토리얼.mp4`).

Index-only (over size guardrail or non-selected history; full fingerprints in `SHA256SUMS`):

- `선택2-70_V11_INSTANT_CANVAS_TRAIL_REVEAL_디자인팀장19기.html` (24,536,470 B > 10MB single-file cap)
- `선택1-70_모먼트리빌_퓨처에디토리얼.mp4` (15,363,185 B), `선택2-70_모먼트리빌_퓨처에디토리얼.mp4` (17,808,710 B)
- `01_V1`–`10_V10` version executables (21–31MB self-contained HTML each)
- `실패/**` failed attempts incl. recordings and `track70_v9_exact_pairs.zip` (40.6MB)
- `이미지/**` generated stills, `03_PAIR_QA/**` QA gifs/pngs

Committed payload ≈ 13.6MB ≤ 50MB. Largest committed file ≈ 3.0MB ≤ 10MB.

## Rules

- Drive originals are read-only evidence; never modify, move or re-format them.
- This directory is reference evidence only — never product implementation source.
- Any future native intake must re-prove against `SHA256SUMS` fingerprints.
