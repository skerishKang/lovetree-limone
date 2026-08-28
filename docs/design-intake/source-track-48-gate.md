# Source Track 48 — 아이돌러브트리 네온파일럿 Gate Record

Issue: #305 · Refs: #80 · pattern: #236/#287/#289
Manifest: `design-intake/manifests/source-track-48-idol-tree-neon-pilot.json`
Preservation: `old/reference/source-track-48-idol-tree-neon-pilot/`
Drive folder: `48_아이돌러브트리_네온파일럿` (`1RsVSpzqmi2Gdnge0msJHiaMZ5FDe7QMQ`) — 334 files / 684,669,025 B

## Source identity

Idol-group LoveTree cinematic pilot. Version history V1→V4.2b (스토리보드 반려/승인 사이클 포함) plus
**FINAL GATE candidate 10 — V1 정밀복원 인물분석 티저** (authority index:
`00_버전목록_한눈에보기.txt`, FINAL GATE 기준 2026-08-09). Candidate 10 rules: V1 direct base,
Aircraft/Cockpit/Pilot Scene = 0, target 31.2s; if owner review rejects 10, no V11/V12/R2 is made —
01 V1 becomes the baseline fallback.

## Preservation (caps: 50 MB total / 10 MB per file; videos fingerprint-only)

Preserved byte-exact (11 files / 7,087,529 B) + `SHA256SUMS.txt`:

| file | bytes | local SHA256 | Drive MD5 (dual-pin) |
|---|---|---|---|
| 10_최종후보_V1정밀복원_인물분석티저_바로보기.html | 781,713 | `741ecdb2…87eae` | `9d1708e2…7c141` ✓ |
| 01_V1_최초시네마틱_원형_바로보기.html | 5,482,396 | `fe63834b…378d0` | `de2a77e6…f3c88` ✓ |
| 00_버전목록_한눈에보기.txt | 2,359 | `33cf44b5…a4497` | `c2cbdf24…58d4f` ✓ |
| 00_작업상태_설계지시/LoveTree 48 · NEON PILOT.md | 17,375 | `c32dbe16…d5486` | `c9bb8d30…9273` ✓ |
| 10_최종후보_QA_요약.txt | 1,148 | `36bc2e3e…93c88` | `d17433c1…350b2` ✓ |
| 10_01V1대비_동일시각_비교판.jpg / 10_최종후보_1초간격_컨택트시트.jpg | 789,503 | see SHA256SUMS.txt | ✓ |
| 01_V1_자료 4 docs (README/report/shot-map/validation) | 12,838 | see SHA256SUMS.txt | ✓ |

Dual-pin result: **11/11 Drive-MD5 == local-MD5** (transfer integrity proven); no OPEN flag.
Videos are fingerprint-only: e.g. 최종후보 실행영상 14,525,699 B (MD5 `f1ad417a…4347`),
제품오너녹화 V1 20,749,100 B (MD5 `5173dca1…d688`). Full-tree fingerprints for all 334 files:
`FILE_INDEX.md` (server-side MD5).

## Gate state

```text
SOURCE_TRACK_48_INTAKE   = RECORDED
LIFECYCLE                = EXECUTABLE_AVAILABLE (source truth, dom-2d)
CURRENT_CANDIDATE        = 10 FINAL GATE (V1 정밀복원 인물분석티저)
FALLBACK_BASELINE        = 01 V1
LINEAGE_RESERVATION      = HOLD (no repository lineage number allocated)
ADOPTION                 = HOLD (CANONICAL_V4_ADOPTION = NO)
BACKEND_SCOPE            = NONE
IMPLEMENTATION           = FORBIDDEN at this gate (Issue #305)
```

Open items before any adoption decision:

1. FINAL GATE owner visual review (10 vs 01 fallback) is not recorded in the package.
2. Idol-identity likeness/rights provenance (Gate0–Gate2C casting chain) is not established.
3. `92_반려_중간자료_보관` contains DO_NOT_USE sealed packages — never candidates.
4. No repository-side fidelity/reduced-motion/overflow gate has run.

## Rules

- Drive originals are read-only reference; product code never executes sibling source HTML/JS.
- Native implementation must not start from this gate registration.
