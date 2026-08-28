# Source Track 50 — 드림메모리 시네마틱 Source Gate Record

Issue: #307 · Refs: #80 #236 #287
Classification: `NEW_LINEAGE_CANDIDATE + CINEMATIC_BRAND + SOURCE_REFERENCE_ONLY`
Manifest: `design-intake/manifests/source-track-50-dream-memory.json`
Preservation: `reference/source-track-50-dream-memory/` (full local tree) · `PROVENANCE.md` · `SHA256SUMS`

## Design authority

```text
STATUS             = WORK CLOSED / APPROVED MASTERS LOCKED (README_50, 2026-08-10)
SOURCE_OWNER       = LoveTree 4-2기 시네마틱디자인팀장 (지시 이력 80_작업지시_및_검증기록)
AUTHORITY_PACKAGE  = 01_최종채택본_시네마틱_웹사이트_슈퍼노바
                     01_최종홈페이지_실행본.html (29,491 B, 상대경로로 MP4 마스터 참조)
                     03/04_승인영상_{데스크톱,모바일}_최종마스터.mp4 (승인본 잠금)
HISTORY_LINE       = Dream Memory v1 → v1.5 여성 시네마틱 (90_이전버전_및_과정산출물)
LOCK_RECORDS       = V2_LOCKED_STORYBOARD · CAST_LOCK_BOARD · PRIMARY_IDENTITY_ANCHOR_MAP
PRODUCTION_RULE    = 추가 Production 반영: 별도 제품 오너 지시 전까지 진행하지 않음
OWNER_REVIEW       = CLOSED — 재개는 오너의 명시적 재지시 필요
IMPLEMENTATION     = MUST NOT START (gate registration only)
PRODUCTION SOURCE  = DO NOT MODIFY (Drive originals read-only)
```

## Provenance & integrity

- Drive folder `1CAyzJ6zV-Mlk-OkBjmO7ztSTT5jZ2v92`
  (`[[지피티 작업]]/[01_러브트리]/03_디자인채택본/50_드림메모리_시네마틱`), observed 2026-08-21.
- Full-tree read-only transport via rclone (`copy --transfers 4`, WSL-native ext4 worktree):
  360 Drive objects listed → 360 files preserved locally (760.9 MiB).
- `SHA256SUMS` (below, and at `reference/source-track-50-dream-memory/SHA256SUMS`) pins all
  360 transported files from the fresh local copy.
- Drive-native MD5 spot checks passed (`00_50번_작업완료_읽어보기.md`,
  `01_최종홈페이지_실행본.html`, `08_최종사이트_검증결과.json`) — no mismatch, no OPEN flag.
- Google-native docs (1 docx + 2 pptx) were exported by rclone during transport; they are
  exported representations, not original bytes (recorded in `PROVENANCE.md`).
- README/folder-name drift recorded: README names the authority folder `00_최종채택본…`,
  actual Drive folder is `01_최종채택본…` (same folder, naming drift only).

## Repository commit selection (guardrail ≤50MB total / ≤10MB per file)

Committed (108 files + SHA256SUMS + PROVENANCE.md, ≈25MB total): track README, final adopted
package minus oversized/video items (`01_최종홈페이지_실행본.html`, screen JPGs, 검증결과.json,
포스터 JPGs), all non-video work-order/validation records (`80_작업지시_및_검증기록`),
Dream Memory v1–v1.5 history HTMLs/analyses/validation JSONs, Supernova process gate records
(storyboard pages, comparison JSONs, S16/S17 logos, Gate1A board, CAST_LOCK/PRIMARY_LOCK records,
RAPID_FINAL/FINAL_MASTER metadata), and the locked storyboard frame `V2_LOCKED_STORYBOARD.png`.

Index-only (fingerprinted as `PENDING` in the manifest with full Drive ID + bytes + SHA256):
all videos (≈289MB — approved masters, screen recordings, process recordings; **no video bytes
enter git without pre-approval**), oversized executables/archives (>10MB: 단독미리보기 HTML 16.3MB,
전체패키지 zip 38.8MB, RAPID_FINAL zip 78.8MB, 초기모션 v1.1 HTML 11.1MB), bulk asset/process dirs
(`코덱스 고화질/**`, `스토리보드/**`, remaining cast/moodboard originals). Byte-duplicate
`07_최종사이트_루트중복_단독미리보기.html` = `02_최종홈페이지_단독미리보기.html` (same SHA256).

## Open gates

| Gate | State | Blocking condition |
|---|---|---|
| Package reopen | HOLD | README_50 marks 완료/CLOSED; production reflection needs explicit product-owner instruction |
| Video transport | HELD | no-video-bytes guardrail; approved masters stay fingerprint-only absent pre-approval |
| Oversized executables | HELD | 단독미리보기/패키지 zip >10MB single-file guardrail |
| Native intake | NOT STARTED | requires owner reopen → source QA → exact fingerprint |
| Lineage reservation | HOLD | no repository lineage number allocated |

Correct sequence: owner reopen decision → executable/source QA against `01_최종홈페이지_실행본.html`
+ approved masters → transport-compliant asset plan (video exception or poster substitution) →
exact fingerprint → repository native intake/proving.

## Repository disposition

```text
SOURCE_TRACK_50_INTAKE      = RECORDED
LINEAGE50_RESERVATION       = HOLD (no repository lineage number allocated)
CANONICAL_V4_ADOPTION       = NO
BACKEND_SCOPE               = NONE (no DB/API/Auth/Firebase/Neon/Worker work implied)
IMPLEMENTATION_RELEASE      = NO
```

## FILE_INDEX note

Full preserved tree = 360 files (see `SHA256SUMS` for the complete pinned inventory).
Key committed groups are itemized in `PROVENANCE.md`; the manifest pins 15 representative
artifacts as `PINNED` and 8 oversized/video artifacts as `PENDING` fingerprints.

## SHA256SUMS (key authority files, fresh local copy 2026-08-21)

```text
71d1b36654171158b734ec39e279deacca3751aef2305349118a85e86fc64d94  ./00_50번_작업완료_읽어보기.md
51c370000767508b27673a04d7a5b9b3d34bf7d2c64b431d62ae30733cc04b5e  ./01_최종채택본_시네마틱_웹사이트_슈퍼노바/01_최종홈페이지_실행본.html
457edd66c87f763b43405e33b530538d589e25ad4fc89f399de5abcc89217ed1  ./01_최종채택본_시네마틱_웹사이트_슈퍼노바/08_최종사이트_검증결과.json
e1d487d8287be922042d74fb824fcd8952e5523c34537265c0bc3a7707fbb3b9  ./10_최종제작_원본소스/05_슈퍼노바_스토리보드_기준본/V2_LOCKED_STORYBOARD.png
d35725878b23b955886896016d1f417245554b3ba60c1ee09df4b83650819eec  ./01_최종채택본_시네마틱_웹사이트_슈퍼노바/03_승인영상_데스크톱_최종마스터.mp4 (PENDING, 지문만)
c1028c268a3077c53884459cb005cd312c898082156ca6cc66aaedbf6fc6b41f  ./01_최종채택본_시네마틱_웹사이트_슈퍼노바/04_승인영상_모바일_최종마스터.mp4 (PENDING, 지문만)
```

Full tree pin: `reference/source-track-50-dream-memory/SHA256SUMS` (360 entries).
