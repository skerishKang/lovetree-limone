# source-track-44-handopen-memory-composer — Provenance / Reference Skeleton

Drive originals are read-only reference; product code never executes sibling source HTML/JS.

- stableId: source-track-44-handopen-memory-composer
- sourceTrackId: Track44
- classification: NEW_LINEAGE
- lifecycle: REFERENCE_PINNED
- scenarioId: tree-workspace
- sourceLabel: 44_손으로여는기억창_컴포저 / Track root folder 1Pwv81tD0eneDYlf-hvVxb3j9fWVdHRhA (Issue #302)
- driveFolderId: 1Pwv81tD0eneDYlf-hvVxb3j9fWVdHRhA
- Drive path: `padiemipu:[[지피티 작업]]/[01_러브트리]/03_디자인채택본/44_손으로여는기억창_컴포저` (98 files, 104,035,544 B total per the 2026-08-21 read-only snapshot)
- sourceSnapshot: V2_COMPOSER_CURRENT_CANDIDATE (CURRENT_AT_OBSERVATION @ 2026-08-21) — folder mtime-fresh candidate `01_손으로여는기억창_컴포저_v2.html`
- native implementation: NOT STARTED — gate registration only (구현 금지 Lane)

## Artifacts

| filename | Drive ID | bytes | SHA256 | role | status |
|---|---|---|---|---|---|
| 01_손으로여는기억창_컴포저_v2.html | 1LS-HFzbckmWeG75Wp7HdVGsNkuiGuuWI | 427043 | 8fd6a4f14c2bb4dfa1f4ccb30dd95409f81e4159936bc70a3a62d7fddc5d705a | executable (sibling V2 composer) | PINNED (this directory, byte-exact copy; SHA256 equals the repo snapshot `docs/design-intake/drive-snapshot/2026-08-21/SHA256SUMS.txt` entry and MD5 `c72e8e77…56b80` equals the same-day full-tree MD5) |
| 04_완성패키지_v2/01_구현보고.md | 1I1K6QLT4y9XiI5JDWlxatrWHmKxp5WFy | 1899 | bc24dfe9a1a1e34c6bc6700ced1026d9ce1904dcec44c4d84f0a4bd6afb6b74e | implementation-note | PINNED (this directory, byte-exact copy) |
| 04_완성패키지_v2/02_제출목록.md | 1UA71QWrbM_7O4xgjE_VjjZMNfcqgO0AQ | 1928 | e878a64d1cace73d4fe88518d40568a0d915ddb38bc2cd8fcc49c5b88c954428 | submission-manifest | PINNED (this directory, byte-exact copy) |
| 04_완성패키지_v2/13_검증결과.json | 1yPv3bZxMWTvCjfEXuiD-377IGLjZcuP9 | 1799 | b3b966617eea3974dc44f32a165410d895765f618ff7871f2bb6127b3d603b04 | sibling-qa | PINNED (this directory, byte-exact copy) |

All four pinned artifacts were fetched via the folder path above on 2026-08-21 and verified:
local MD5 equals the same-day repository full-tree MD5 snapshot for every file, and the
executable's SHA-256 additionally equals the repository preservation-snapshot SHA256SUMS entry.
`SHA256SUMS.txt` in this directory records the pinned bytes.

## Reference-only evidence (not pinned — size)

| filename | Drive ID | bytes | role | status |
|---|---|---|---|---|
| 02_녹화영상_기억창컴포저_v2.mp4 | 1IgIRdJ-LY2j_0ghysg8soJOBEkiNvttE | 34890897 | reference-video | REFERENCE_ONLY (stays on Drive) |
| 03_참고영상_손프레임기억창_원본.mp4 | 1cKmZK-BIU6PSUToJmJVCKLPH4Dmz5ShP | 24520000 | reference-video | REFERENCE_ONLY (stays on Drive) |

The remaining ~92 files (completion-package videos/captures/contact sheets, preview image,
`90_이전버전_v1/` camera-based V1 with its own verification materials) stay on Drive as
read-only evidence and are not registered as intake artifacts by this gate.

## Rules

- The sibling V2 executable is REFERENCE/comparison evidence only — pinning it does not make it
  current, adopted, or routed anywhere in this repository.
- V2 deliberately removes camera/hand-tracking from the V1 lineage (`90_이전버전_v1/`);
  the two variants must not be merged without an explicit design decision.
- Sibling QA (`13_검증결과.json` = PASS) could not verify remote YouTube playback inside its
  automated container; treat playback verification as incomplete until reproduced in an
  unrestricted environment.
- Native implementation must not start before a separate approval lane admits the track
  (see docs/design-intake/source-track-44-gate.md).
