# Source Track 51 — Preservation Provenance

Issue: #308 · Refs: #80 · pattern precedents #236 #287 #289
Drive source (read-only): `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/51_네온인간분석_인터랙티브홍보대문`
Preserved at: `reference/source-track-51-neon-human-analysis/`
Transport date: 2026-08-21 (WSL-native worktree `$HOME/worktrees/kilo8-issue308`, rclone `copy --transfers 2`, read-only; Drive originals untouched)

## Scope

- Full preservation: **8 files / 18.7 MiB** transported (no same-path duplicate objects).
- `SHA256SUMS` covers all 8 transported files, generated from this local copy.
- Integrity: **all 8 files verified OK against Drive-native MD5** (full-tree check).

## Byte-identical alias pairs (dual-ID record, OPEN-flag isolation)

Two files exist under two names each with **different Drive IDs but identical bytes**:

| Canonical | Alias (“병행안”) | SHA256 | Drive IDs |
|---|---|---|---|
| `lovetree-neon-human-analysis-promo-gate-v1.html` | `10_병행안_네온인간분석_홍보대문_바로보기.html` | `5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014` | `1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt` / `1Ijr8nefQ-wwAAQyXexZnO10oj4Vf5_J8` |
| `desktop-execution-neon-human-analysis-v1.mp4` | `10_실행영상_병행안_네온인간분석_홍보대문.mp4` | `3b876cf113630d6873ce6035f0dd60a9053a9440cf3ee62b1a87441f8781ad61` | `1fmX2JRYz320JJhIw0K2iS39c6e5MIIRs` / `1cnJTp18Z9F3B-ptLnKD0xjm1HQQOQ7BD` |

These are NOT competing candidates — the “병행안” naming refers to the promo gate being a parallel
alternative to the adopted front door, and the alias files are byte-equal convenience copies.
Canonical English-named paths are committed once; both Drive IDs are recorded here and in the gate doc.

## Triple hash comparison (#287 snapshot)

Merged snapshot copy `reference/source-tracks-snapshot/51_네온인간분석_인터랙티브홍보대문/10_병행안_네온인간분석_홍보대문_바로보기.html`
(SHA256SUMS.txt `5b7f084b…`) is byte-identical to this fresh transport and to Drive-native MD5 —
fresh hash ↔ Drive history pin ↔ prior repo snapshot all agree. No mismatch flag.

## Repository commit selection (guardrail: total ≤50MB, single file ≤10MB, videos fingerprint-only)

| Path | Bytes | Status | Reason |
|---|---|---|---|
| `lovetree-neon-human-analysis-promo-gate-v1.html` | 2,782,365 | COMMIT | executable (self-contained promo gate HTML, 19 embedded data-URI images) |
| `implementation-note-neon-human-analysis-v1.md` | 2,147 | COMMIT | implementation note / status authority |
| `scene-structure-neon-human-analysis-v1.md` | 2,682 | COMMIT | scene structure note |
| `desktop-contactsheet-neon-human-analysis-v1.jpg` | 290,428 | COMMIT | 9-frame QA contact sheet |
| `SHA256SUMS` | — | COMMIT | full-tree fingerprint manifest |
| `PROVENANCE.md` | — | COMMIT | this file |
| `desktop-execution-neon-human-analysis-v1.mp4` | 2,545,122 | FINGERPRINT ONLY | video guardrail (#291 결정안); alias `10_실행영상_병행안….mp4` byte-identical |
| `녹화_2026_08_14_03_29_55_614.mp4` | 8,624,180 | FINGERPRINT ONLY | video guardrail; raw screen recording |
| `10_병행안_네온인간분석_홍보대문_바로보기.html` | 2,782,365 | NOT RE-COMMITTED | byte-identical alias of committed executable |

Committed payload ≈ 2.79MB ≤ 50MB. Largest committed file 2,782,365B ≤ 10MB. No pre-approved video exception used.

## Rules

- Drive originals are read-only evidence; never modify, move or re-format them.
- This directory is reference evidence only — never product implementation source.
- Any future native intake must re-prove against `SHA256SUMS` fingerprints.
