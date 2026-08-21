# Source Track 50 — Preservation Provenance

Issue: #307 · Refs: #80 #236 #287
Drive source (read-only): `[[지피티 작업]]/[01_러브트리]/03_디자인채택본/50_드림메모리_시네마틱`
Drive folder ID: `1CAyzJ6zV-Mlk-OkBjmO7ztSTT5jZ2v92`
Preserved at: `reference/source-track-50-dream-memory/`
Transport date: 2026-08-21 (WSL-native worktree, rclone `copy --transfers 4`, read-only; Drive originals untouched)

## Scope

- Full-tree local preservation: 360 Drive objects listed, 360 files transported
  (760.9 MiB total). No same-name duplicate objects were observed in this folder.
- `SHA256SUMS` covers all 360 transported files (full tree), generated from this local copy.
- Integrity spot checks against Drive-native MD5 passed (`00_50번_작업완료_읽어보기.md`,
  `01_최종채택본_시네마틱_웹사이트_슈퍼노바/01_최종홈페이지_실행본.html`,
  `01_최종채택본_시네마틱_웹사이트_슈퍼노바/08_최종사이트_검증결과.json`).
- Google-native documents exported by rclone during transport (exported representation,
  not original bytes; no Drive-native MD5 exists for them):
  - `80_작업지시_및_검증기록/01_지시서_이력/00_초기_설계지시_묶음/50_4-2기_SUPERNOVA_EXACT_BENCHMARK_여성시네마틱_최종제작지시_v1.docx` (12,624 B export)
  - `90_이전버전_및_과정산출물/02_슈퍼노바_제작과정/01_슈퍼노바_정밀벤치마크_작업본/90_Internal_Transfer/TEMP_S15_SIX_CAST_TRANSFER_v1.pptx`
  - `90_이전버전_및_과정산출물/02_슈퍼노바_제작과정/01_슈퍼노바_정밀벤치마크_작업본/90_Internal_Transfer/Supernova_Asset_Transfer_Bridge_v1.pptx`

## Authority observation

`00_50번_작업완료_읽어보기.md` marks Track 50 **완료 / CLOSED** with the approved video
masters locked and the final homepage as the 시네마틱 웹사이트 기준본. Production
reflection is explicitly held until a separate product-owner instruction.
The README names the authority folder `00_최종채택본_시네마틱_웹사이트_슈퍼노바`, while the
actual Drive folder is named `01_최종채택본_시네마틱_웹사이트_슈퍼노바` — a README/folder-name
prefix drift recorded here (same folder, no integrity impact).

## Repository commit selection (guardrail ≤50MB total / ≤10MB per file)

Committed from this directory (108 files + `SHA256SUMS` + this `PROVENANCE.md`; ≈25MB total):

| Group | Contents | Reason |
|---|---|---|
| root | `00_50번_작업완료_읽어보기.md`, `01_lovetree-dream-memory-cinematic-v1.3-female.html` | track README / authority status, root v1.3 candidate |
| `01_최종채택본…` | `01_최종홈페이지_실행본.html`, `05–07` screen JPGs, `08_최종사이트_검증결과.json`, `00_필수자산_포스터/*.jpg` | final adopted package minus oversized/video items |
| `80_작업지시_및_검증기록` | all non-video files (지시서 이력, 레퍼런스 분석, 검증자료 stills/JSON/SHA256SUMS) | work-order & validation history |
| `90_/01_드림메모리_초기시안` | v1/v1.2/v1.3/v1.4/v1.5 HTMLs, analysis mds, asset maps, runtime-validation JSONs, key validation stills | version history (videos excluded) |
| `90_/02_슈퍼노바_제작과정` | analysis/storyboard pages/comparison JSONs, S16/S17 logos, Gate1A board, CAST_LOCK board, PRIMARY_LOCK records, RAPID_FINAL/FINAL_MASTER metadata (shot maps, wrappers, validation JSONs, contact sheets) | process gate records (videos/zips excluded) |
| `10_최종제작_원본소스` | `05_슈퍼노바_스토리보드_기준본/V2_LOCKED_STORYBOARD.png` only | locked storyboard authority frame |

Index-only (over guardrail or video — fingerprinted in the manifest as `PENDING`,
bytes stay on Drive per #236/#287 method):

- All videos (20 files, ≈289MB): approved masters `03/04_승인영상_*_최종마스터.mp4`,
  root screen recordings `01/02_화면녹화_*.mp4`, process recordings/validation mp4s
- Oversized executables/packages (>10MB): `02_최종홈페이지_단독미리보기.html` (16.3MB),
  `09_최종사이트_전체패키지.zip` (38.8MB), `50_SUPERNOVA_RAPID_FINAL_PACKAGE_v1.zip` (78.8MB),
  슈퍼노바 초기모션 HTML v1.1 (11.1MB), 루트중복 단독미리보기 (16.3MB, byte-duplicate of
  `02_최종홈페이지_단독미리보기.html`)
- Bulk asset/process dirs kept local-only: `코덱스 고화질/**` (55.8MB), `스토리보드/**` (32.2MB),
  remaining `10_최종제작_원본소스/**` cast/moodboard/scene originals (≈155MB),
  remaining `90_…` masters/stills

## Double pin

1. Local SHA256 over transported bytes: `SHA256SUMS` (this directory).
2. Drive-native MD5 spot checks on authority files (passed; see above).

No mismatch between transported bytes and Drive MD5 was observed → no OPEN flag raised
for integrity. The only recorded observation is the README `00_` vs actual `01_` folder-name
prefix drift above.
