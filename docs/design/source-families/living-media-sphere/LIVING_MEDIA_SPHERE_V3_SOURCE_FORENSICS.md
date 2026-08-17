# Living Media Sphere V3 · Source Forensics & Phase 1 Intake Evidence

Issue: #235 · Governance: #242 · Date: 2026-08-17 · Phase: 1 (Source Runner / Repository Evidence Intake)

## 0. Repository identity after Issue #242

Issue #242 resolved the namespace collision. The current repository identity is:

```text
SOURCE_FAMILY = living-media-sphere
REVISION = V3
HISTORICAL_DRIVE_FOLDER_NUMBER = 68 (provenance only)
REPOSITORY_NUMERIC_SOURCE_TRACK_ID = UNALLOCATED_FOR_THIS_FAMILY
REPOSITORY_LINEAGE_68 = NOT_ALLOCATED
CANONICAL_V4_ADOPTION = NO
```

Historical/stale repository identifiers from the pre-#242 intake are evidence only and are not current ownership:

- `stableId = track-68-living-media-sphere-v3`
- `sourceTrackId = Track68`
- `/design-lab/source-tracks/68/v3/source`
- `lib/source-track-68/**`
- `public/design-lab-assets/source-tracks/68/v3/**`
- workflow/check label `Track68 V3 hold browser QA evidence`

The pre-#242 178-row manifest is preserved byte-for-byte at
`docs/design/source-families/living-media-sphere/history/pre-242-numeric-identity-manifest.json`.
Its numeric fields are historical evidence and must not be interpreted as current repository ownership.

## 1. Exact source identity

| Item | Value |
|---|---|
| Executable | `버전3-84개.html` |
| Bytes | 25,544 |
| SHA-256 | `2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232` |
| Drive ID | `1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx` |
| Current adopted/copy root | `14vX6gtGym5NZb0eDhlmH-azKMuwzNjS4` = `12_러브트리_리빙미디어스피어_인터랙티브대문_V1` |
| Historical adopted-design path | `03_디자인채택본/68_리빙미디어스피어_인터랙티브대문/현재후보.html` |
| Historical number meaning | adopted-design-folder provenance only |
| Filename truth | `버전3-84개` is stale naming; runtime authority is 89 videos + 89 posters |

Aliases/history remain unchanged:

- `1.개발과정/18_버전3_개발본.html` (`1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6`) is the accessible byte-identical dev copy.
- `START.html` (`1A30t1gY088DWbdWU6lqqYWdUJJhAzqwI`) is `TRASH/HISTORICAL_ALIAS / REFERENCE_ONLY`; Drive API currently returns 404/File not found.
- V1: 32,808 B, SHA-256 `cdb88d1a7fc1c3778dd07dd2593ca1c9ac62e24f072dc6ffeb62a0e23d8e6b23`.
- V2 family: 28,323 B, SHA-256 `4693dfaf80c702652292920abd917ce2e68a9ac5f9ff78f5cbad176f1204111c`; alias identity is packaging only.

The committed exact HTML was namespace-moved without byte modification.

## 2. Exact media inventory

| Gate | Result |
|---|---|
| VIDEO_COUNT / POSTER_COUNT | 89 / 89 |
| MEDIA_MANIFEST_ROWS | 178 |
| VIDEO_TOTAL_BYTES | 1,946,025,764 |
| POSTER_TOTAL_BYTES | 1,619,015 |
| Size split at 25 MiB | 64 ≤ / 25 > |
| SHA-256 | 178/178 verified in the prior local DriveFS audit |
| Decode | 178/178 ffprobe pass in the prior local audit |
| Provenance | 89/89 videos matched to `19_영상_원본대응표.csv` |
| Git-tracked exact media | 0 |

Full historical per-file rows remain in the preserved pre-#242 evidence snapshot. Current family metadata is
`design-intake/source-families/living-media-sphere-v3.json`.

Transport remains `LOCAL_EXACT_OUT_OF_GIT_ONLY`; no media binaries are committed. The current local staging convention is:

`public/design-lab-assets/source-families/living-media-sphere/v3/assets/{videos-v3,posters-v3}/`

Remote CI does not prove exact-video fidelity.

## 3. Runtime/source-defect truth preserved

- `TOTAL = 89`; media URLs remain relative `assets/videos-v3/v3-NNN.mp4` and `assets/posters-v3/poster-NNN.jpg`.
- Poster-first/lazy source behavior remains unchanged.
- `visibilitychange` remains the source playback reevaluation event.
- Click-vs-drag threshold remains 5 px; repeat click opens the viewer.
- P0 source defect remains recorded: `pointercancel` shares the committing source path with `pointerup`. Phase 2 must make cancel/lost-capture cleanup-only.
- All sphere videos remain muted; only the viewer may own audible playback.
- Rendering authority remains CSS3D DOM + software spherical projection; no WebGL, Three.js, or canvas renderer substitution.
- Reduced-motion source truth remains `PARTIAL / KNOWN_SOURCE_DEFECT`: idle autonomous rotation continues.

No source defect was silently fixed by this namespace migration.

## 4. Current source-runner contract

Current route:

`/design-lab/source-families/living-media-sphere/v3/source`

Current exact asset:

`/design-lab-assets/source-families/living-media-sphere/v3/index.html`

The old numeric route is retired; no compatibility redirect is authorized. The runner still:

1. fetches with `cache: no-store`;
2. computes served bytes + SHA-256 in-browser;
3. mounts the sandboxed iframe only after exact fingerprint match;
4. fails closed on mismatch;
5. performs a real re-fetch/re-hash on Re-verify.

## 5. Browser QA contract

Dedicated helper:

`tests/living-media-sphere-v3-browser-qa.mjs`

The hold workflow must re-prove on the migrated exact head:

- hash gate PASS, tampered bytes FAIL CLOSED, Re-verify re-fetch;
- desktop 1280×800;
- mobile 390×844;
- narrow 320×720;
- 89 nodes;
- Media/Shape drawers;
- desktop slider 89→18→89;
- reset defaults;
- selection + repeat-click viewer;
- >5px drag opens nothing;
- overflow 0;
- unexpected console/page errors 0;
- reduced-motion classification remains PARTIAL / KNOWN_SOURCE_DEFECT.

## 6. Phase boundaries

```text
SOURCE_RUNNER = AUTHORIZED_PHASE_1
NATIVE_CANDIDATE = HOLD_PHASE_2
REPOSITORY_LINEAGE_68 = NOT_ALLOCATED
CANONICAL_V4_ADOPTION = NO
BACKEND/DB/AUTH/PRODUCTION_MUTATION = NONE
ISSUE_244_IMPLEMENTATION = NONE
```
