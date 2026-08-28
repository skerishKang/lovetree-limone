# Source Track 51 — 네온인간분석 인터랙티브홍보대문 Source Gate Record

Issue: #308 · Refs: #80 · pattern precedents #236 #287 #289
Classification: `NEW_LINEAGE_CANDIDATE + CINEMATIC_BRAND_PROMO_GATE + SOURCE_REFERENCE_ONLY`
Manifest: `design-intake/manifests/source-track-51-neon-human-analysis.json`
Preservation: `old/reference/source-track-51-neon-human-analysis/` (full local tree) · `PROVENANCE.md` · `SHA256SUMS`

## Design authority

```text
STATUS             = PROMO GATE v1 VISUAL REVIEW CANDIDATE (implementation note 판정문)
EXECUTABLE         = lovetree-neon-human-analysis-promo-gate-v1.html (2,782,365 B self-contained HTML —
                     CSS + SVG + vanilla JS, no external requests, 19 data-URI embedded images)
POSITION           = 신규 병행 홍보 대문 시안 — 기존 V4.2/V4.2b overwrite 없음, Production 반영 없음,
                     기존 Neon Pilot 45초 시퀀스를 랜딩 구조로 재구성 (수정선과 분리)
ASSETS             = 기존 프로젝트 synthetic Core 5 자산만 사용 · 실인물 복제 없음 · aircraft asset 0개
QA                 = desktop 1440×900 headless: page/console errors 0, broken images 0;
                     24s walkthrough mp4 + 9-frame contact sheet; MOBILE QA ABSENT
OWNER_REVIEW       = PENDING — 제품 오너 승인 전 기존 대문 채택본 대체 금지 · Production 반영 금지 ·
                     공식 첫여정 기본 UI 확정 금지
IMPLEMENTATION     = MUST NOT START (gate registration only)
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
```

## Provenance & integrity

- Drive folder `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/51_네온인간분석_인터랙티브홍보대문`, observed 2026-08-21.
- Full-tree read-only transport via rclone (`copy --transfers 2`, WSL-native ext4 worktree):
  **8 files / 18.7 MiB**, no same-path duplicate objects.
- `SHA256SUMS` pins all 8 transported files from the fresh local copy.
- Integrity: **all 8 files verified OK against Drive-native MD5** (full-tree check).
- Triple hash comparison (#287 snapshot): snapshot copy
  `old/reference/source-tracks-snapshot/51_네온인간분석_인터랙티브홍보대문/10_병행안_네온인간분석_홍보대문_바로보기.html`
  (`5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014`) is byte-identical to this fresh
  transport and to Drive-native MD5 — fresh hash ↔ Drive history pin ↔ prior repo snapshot agree.

## Byte-identical alias pairs (dual-ID record)

| Canonical | Alias (“병행안”) | SHA256 | Drive IDs |
|---|---|---|---|
| `lovetree-neon-human-analysis-promo-gate-v1.html` | `10_병행안_네온인간분석_홍보대문_바로보기.html` | `5b7f084b…df07fdf014` | `1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt` / `1Ijr8nefQ-wwAAQyXexZnO10oj4Vf5_J8` |
| `desktop-execution-neon-human-analysis-v1.mp4` | `10_실행영상_병행안_네온인간분석_홍보대문.mp4` | `3b876cf1…41f8781ad61` | `1fmX2JRYz320JJhIw0K2iS39c6e5MIIRs` / `1cnJTp18Z9F3B-ptLnKD0xjm1HQQOQ7BD` |

Not competing candidates — byte-equal convenience copies under Korean aliases. Canonical paths committed
once; both Drive IDs recorded here and in `PROVENANCE.md`. No OPEN flag beyond this record.

## Repository commit selection (guardrail ≤50MB total / ≤10MB per file / videos fingerprint-only)

Committed (≈2.79MB): executable HTML, implementation note md, scene structure md, QA contact sheet jpg,
`SHA256SUMS`, `PROVENANCE.md`.

Fingerprint-only (video guardrail, no pre-approved exception): `desktop-execution-neon-human-analysis-v1.mp4`
(2,545,122 B) and raw recording `녹화_2026_08_14_03_29_55_614.mp4` (8,624,180 B) — recorded as `PENDING`
artifacts with full Drive ID + bytes + SHA256 in the manifest and listed below. Alias html/mp4 not re-committed.

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Owner visual review | PENDING | promo gate disposition vs adopted front door undecided |
| Parallel-relation decision | PENDING | relation to adopted front door / Neon Pilot line unrecorded |
| Mobile QA evidence | PENDING | source package covers desktop 1440×900 only |
| Native intake | NOT STARTED | requires authority close → source QA → exact fingerprint |
| Lineage reservation | HOLD | no repository lineage number allocated |

Correct sequence: owner visual review → front-door disposition decision → mobile QA evidence →
executable/source QA → exact fingerprint → repository native intake/proving.

## Repository disposition

```text
SOURCE_TRACK_51_INTAKE      = RECORDED
LINEAGE51_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

## FILE_INDEX (full preserved tree, 8 files)

```text
1Ijr8nefQ-wwAAQyXexZnO10oj4Vf5_J8	2782365	10_병행안_네온인간분석_홍보대문_바로보기.html
1cnJTp18Z9F3B-ptLnKD0xjm1HQQOQ7BD	2545122	10_실행영상_병행안_네온인간분석_홍보대문.mp4
12IxrxV1ApFd00wkIDZFes0EDbOTgtl1T	8624180	녹화_2026_08_14_03_29_55_614.mp4
1Ci0g6sbvQikpp4O8vs8yQPAFdrtSo0fj	290428	desktop-contactsheet-neon-human-analysis-v1.jpg
1fmX2JRYz320JJhIw0K2iS39c6e5MIIRs	2545122	desktop-execution-neon-human-analysis-v1.mp4
1r-O344-PUN4b5Svz1kPWMIZT4VOf52N-	2147	implementation-note-neon-human-analysis-v1.md
1db5gYJPjTrvKxx_RzY-CAPG2WAg-e2nt	2782365	lovetree-neon-human-analysis-promo-gate-v1.html
1PrLjOEEzilZZEsJ6z-gmRqUC8OXzz41d	2682	scene-structure-neon-human-analysis-v1.md
```

## SHA256SUMS (fresh local copy, 2026-08-21)

```text
3b876cf113630d6873ce6035f0dd60a9053a9440cf3ee62b1a87441f8781ad61  ./desktop-execution-neon-human-analysis-v1.mp4
3b876cf113630d6873ce6035f0dd60a9053a9440cf3ee62b1a87441f8781ad61  ./10_실행영상_병행안_네온인간분석_홍보대문.mp4
da2196658e14a4db256523fbdc9d36a1c79907e7b89bc89c50443c5d19d83cf5  ./desktop-contactsheet-neon-human-analysis-v1.jpg
fbebfdf30d78c670cabac435e50c543d9381c0dd5d521d9903b0bf56f9b73490  ./implementation-note-neon-human-analysis-v1.md
5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014  ./lovetree-neon-human-analysis-promo-gate-v1.html
afaa499a8514b162e12a82da9097812d1d184cfec0322e3da101017f32c7ea8c  ./녹화_2026_08_14_03_29_55_614.mp4
5b7f084be9de9ca4f5d11044e797c3d2718208a2493d9ccbc9f8b5df07fdf014  ./10_병행안_네온인간분석_홍보대문_바로보기.html
0edcabc44d24bec15f8cfe23cc80705e3249dc65617275757e9c5553fe3dbfd8  ./scene-structure-neon-human-analysis-v1.md
```
