# source-track-58-living-memory-pinboard — Provenance / Reference Skeleton

Drive originals are read-only reference; product code never executes sibling source HTML/JS.

- stableId: source-track-58-living-memory-pinboard
- sourceTrackId: Track58
- classification: NEW_LINEAGE
- lifecycle: REFERENCE_PINNED
- scenarioId: tree-workspace
- sourceLabel: 58_리빙메모리_핀보드_시네마틱 / Track root folder 1SHLE4D4QpAo39eWBke12lYYUX9ilCz1F (Issue #310)
- driveFolderId: 1SHLE4D4QpAo39eWBke12lYYUX9ilCz1F
- Drive path: `padiemipu:[[지피티 작업]]/[01_러브트리]/03_디자인채택본/58_리빙메모리_핀보드_시네마틱` (60 files, 130,907,539 B total per the #287 snapshot `docs/design-intake/drive-snapshot/2026-08-21/`)
- sourceSnapshot: V1.2_YOUTUBE_REAL_MEDIA_MOBILE_HARDGATE (CURRENT_AT_OBSERVATION @ 2026-08-21) — sibling closure state `TRACK_58_FINAL_APPROVED_CLOSED` / PASS B (2026-08-11)
- native implementation: NOT STARTED — gate registration only (구현 금지 Lane)

## Artifacts

| filename | Drive ID | bytes | SHA256 | role | status |
|---|---|---|---|---|---|
| ★_최종_58_리빙메모리_핀보드.html | 1u83WpPC06BtPYtOvX1eBHUibn7L29ntk | 532697 | 9fd5b6e7b69bc14347cf3eb1905e7a118ad9bd7b62faa9d81f47b4389a7d3cb5 | executable (sibling V1.2 final) | PINNED (this directory, byte-exact copy; MD5 `0a7fc442…93c451` equals the #287 full-tree MD5 snapshot; content-identical to `버전_1.2…/현재후보.html` and its 루트복사본 — one pin covers all three) |
| 00_작업지시/01_58_LIVING_MEMORY_PINBOARD_CINEMATIC_V1_디자인팀장5기_신규작업지시_2026-08-11.md | 1RA-QMoB482Lv-xrAWqG-LmYFubzIckRa | 23485 | 73a24023d7a89fb6251d8b3f3a001e32e67e4250c6b37b87c800e9f7b1a3d76c | instruction (V1) | PINNED (this directory, byte-exact copy) |
| 00_작업지시/04_58_유튜브실제미디어표시_모바일반응형_버전폴더정리_설계팀장11기_수정지시_2026-08-11.md | 1b2yJdaJ6Y3C3sOYbFZTvAbdcUmVwVH_e | 12194 | 45366adacf7aa2c8ac2ba9353b8951253cf8bfeea2bd751e09ced499a5c63450 | instruction (V1.2 revision authority) | PINNED (this directory, byte-exact copy) |
| 버전_1.2_유튜브실제미디어·모바일보정/검증결과.json | 1oMo5F5u4jAySPJUIFkiVk-3LZZzRH-VM | 12078 | 5d9f57a491bb7136975957ac9f2ea19a9b24a0519b4a057275d461f2ea1fc588 | sibling-qa | PINNED (this directory, byte-exact copy) |
| 버전_1.2_유튜브실제미디어·모바일보정/수정전후_비교요약.md | 1vjglTzcdKUnAj9zZ-Sg4OSK-ktMDIw-P | 1777 | adc670ebb556fab45fb51c1bf242cce99f29937c6cab44035f45ac64c55f6e1a | implementation-note | PINNED (this directory, byte-exact copy) |

All five pinned artifacts were fetched via the folder path above on 2026-08-21 and verified:
local MD5 equals the #287 repository full-tree MD5 snapshot for every file.
`SHA256SUMS.txt` in this directory records the pinned bytes.

## Reference-only evidence (not pinned — videos/large files, fingerprint only)

| filename | Drive ID | bytes | MD5 (#287 snapshot) | status |
|---|---|---|---|---|
| ★_참고영상_원본_핀보드.mp4 | 1LUQnx33uoedVYxIDHpYgQVgsL50nkWOS | 58299201 | f2f98f173d7264d87d5fed6a1943ee7d | REFERENCE_ONLY (stays on Drive) |
| 제품오너_네트워크검토녹화_2026-08-11_18-23.mp4 | 1-crSP9xaKldX4uS5Li5mkndfSHj6J85q | 26327386 | 3c114feaa08ffcc176d2ca8d92ca806a | REFERENCE_ONLY (stays on Drive) |
| ★_모바일_실행영상_58_리빙메모리_핀보드.mp4 | 1Gna3xaKIzTw2AwzA2wOTJsDcQUtXgj2O | 781303 | c0aafde81f0bcc30581493722d1423a2 | REFERENCE_ONLY (stays on Drive) |

The remaining ~52 files stay on Drive as read-only evidence and are not intake artifacts of this
gate: version-folder execution videos (V1.0 desktop 4.4 MB, V1.1 6.5 MB, V1.2 desktop 2.9 MB),
V1.0/V1.1 HTML copies (content-distinct from V1.2), image assets/captures/contact sheets,
V1.1 package zip (10.4 MB), V1.0 package zip (6.4 MB), 사용설명서/체크리스트/종료기록 text files.

## Rules

- The pinned V1.2 executable is REFERENCE/comparison evidence only — pinning it does not make it
  current, adopted, or routed anywhere in this repository.
- Sibling closure is PASS B (prototype approval): real-thumbnail display + fallback button +
  original URL preservation verified in the product owner's browser; **live embed playback itself
  is not claimed** — any native port must reproduce actual embed playback unrestricted.
- Historical V1.0/V1.1 HTML revisions are comparison evidence; V1.2 is the pinned authority.
- Native implementation must not start before a separate approval lane admits the track
  (see docs/design-intake/source-track-58-gate.md).
