# Source Track 46 — Preservation Provenance

Issue: #304 · Refs: #80 · pattern precedents #236 #287 #289
Drive source (read-only): `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/46_팝업시즌_기억책`
Preserved at: `reference/source-track-46-popup-season/`
Transport date: 2026-08-21 (WSL-native worktree `$HOME/worktrees/kilo8-issue304`, rclone `copy --transfers 2`, read-only; Drive originals untouched)

## Scope

- Full preservation: **13 files / 24.9 MiB** transported (no duplicate same-name Drive objects detected).
- `SHA256SUMS` covers all 13 transported files, generated from this local copy.
- Integrity: **all 13 files verified OK against Drive-native MD5** (full-tree check, not a spot check).
- Cross-reference: the merged #287 snapshot copy
  `reference/source-tracks-snapshot/46_팝업시즌_기억책/01_팝업시즌_기억책.html` is byte-identical to this
  fresh transport (SHA256 `8537502c867191b821535ced8a658d985eeb78ca75baf447762b3def51f5cbb7` in both,
  matching the snapshot's own `SHA256SUMS.txt`) — fresh hash and Drive history pin agree, no mismatch flag.

## Repository commit selection (guardrail: total ≤50MB, single file ≤10MB, videos fingerprint-only)

| Path | Bytes | Status | Reason |
|---|---|---|---|
| `01_팝업시즌_기억책.html` | 55,960 | COMMIT | executable (single-HTML CSS 3D + inline SVG paper-cut) |
| `40_문서자료/01_실행계약_팝업시즌기억책_v1.txt` | 37,341 | COMMIT | execution contract / instruction |
| `50_검증및제출자료/01_구현보고.md` | 5,908 | COMMIT | implementation report (status authority) |
| `50_검증및제출자료/02_종이장면구조.md` | 6,213 | COMMIT | paper scene structure note |
| `50_검증및제출자료/03_레퍼런스분석.md` | 5,275 | COMMIT | reference motion-grammar analysis |
| `50_검증및제출자료/04_검증결과.json` | 5,442 | COMMIT | sibling QA evidence |
| `50_검증및제출자료/05_비교이미지_레퍼런스대비결과.jpg` | 584,852 | COMMIT | comparison evidence image |
| `10_이미지/01_화면캡처.jpg` | 59,776 | COMMIT | screen capture |
| `10_이미지/90_자동생성_대표미리보기.png` | 568,424 | COMMIT | auto-generated preview |
| `SHA256SUMS` | — | COMMIT | full-tree fingerprint manifest |
| `PROVENANCE.md` | — | COMMIT | this file |
| `01_녹화영상_데스크톱.mp4` | 1,567,266 | FINGERPRINT ONLY | video guardrail (#291 결정안) |
| `02_녹화영상_모바일.mp4` | 448,361 | FINGERPRINT ONLY | video guardrail |
| `02_녹화영상_팝업시즌기억책.mp4` | 7,196,639 | FINGERPRINT ONLY | video guardrail |
| `03_참고영상_팝업시즌기억책_원본.mp4` | 15,592,414 | FINGERPRINT ONLY | video guardrail |

Committed payload ≈ 1.31MB ≤ 50MB. Largest committed file 584,852B ≤ 10MB. No pre-approved video exception used.

## Rules

- Drive originals are read-only evidence; never modify, move or re-format them.
- This directory is reference evidence only — never product implementation source.
- Any future native intake must re-prove against `SHA256SUMS` fingerprints.
