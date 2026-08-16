# Track 68 — Living Media Sphere V3 · Source Forensics & Phase 1 Intake Evidence

Issue: #235 · Worker: COM3-GLM · Date: 2026-08-17 · Phase: 1 (Source Runner / Repository Evidence Intake)

---

## 1. Source identity (all re-verified at intake, local Drive-mount read-only audit)

| Item | Value |
|---|---|
| Executable | `버전3-84개.html` |
| Bytes | 25,544 |
| SHA-256 | `2f269047827ad91b32841a2be6eb5022fbae7befcb2f8b59337b8cd1ee2e0232` |
| Drive ID | `1OvSy5DhPRGFLsNyjHwQZYJFrEmUoZLbx` |
| Adopted root folder | `14vX6gtGym5NZb0eDhlmH-azKMuwzNjS4` = `12_러브트리_리빙미디어스피어_인터랙티브대문_V1` |
| Filename truth | `버전3-84개` is STALE NAMING — runtime authority is 89 videos + 89 posters, never 84 |

Aliases and history:

- `1.개발과정/18_버전3_개발본.html` (`1X47bumRM4nz0ljtnRIK1JcQWJUj-TZl6`) — **current accessible byte-identical dev copy**: Web CTO fresh-downloaded and re-hashed 25,544 B / `2f269047…e0232` on 2026-08-17; re-verified at intake.
- `START.html` (`1A30t1gY088DWbdWU6lqqYWdUJJhAzqwI`) — **TRASH/HISTORICAL_ALIAS (REFERENCE_ONLY)**: byte identity to the executable was verified by Web CTO at intake time, but the current Drive API returns **404 / File not found** and the local DriveFS index observed it in the Drive trash (25,544 B, 2026-08-17). It must never be represented as a current PINNED executable variant. `START_ALIAS_CURRENT_AVAILABILITY = FAIL_404_TRASH_REFERENCE_ONLY`.

Historical revisions (all hashes locally re-verified):

- **V1** — 32,808 B, `cdb88d1a7fc1c3778dd07dd2593ca1c9ac62e24f072dc6ffeb62a0e23d8e6b23` (`버전1.html`, `v1/현재후보.html`, `16_버전1_원본.html`, `07_개발본.html`)
- **V2 family** — 28,323 B, `4693dfaf80c702652292920abd917ce2e68a9ac5f9ff78f5cbad176f1204111c` (`버전2.html`, `최종본.html`, `17_버전2_원본.html`, `15_V1.1_개발본.html`) → `V2_ALIAS_IDENTITY = PACKAGING_ONLY_CONFIRMED` — no V1.1 implementation exists or may be created.

## 2. Exact media inventory (LOCAL_EXACT_OUT_OF_GIT)

| Gate | Result |
|---|---|
| VIDEO_COUNT / POSTER_COUNT | 89 / 89 — indices 001..089, no gaps, no duplicates |
| VIDEO_TOTAL_BYTES | **1,946,025,764** (matches prior aggregate authority exactly) |
| POSTER_TOTAL_BYTES | 1,619,015 |
| VIDEO_MIN / MAX | 342,637 B (`v3-024`) / 94,733,644 B (`v3-072`) |
| Size split at 25 MiB (26,214,400 B) | **64 ≤ / 25 >** — `ALL_V3_VIDEOS_EXCEED_STATIC_BOUNDARY = FALSE`; full-set repo static transport remains BLOCKED (Cloudflare 25 MiB per-file limit) |
| SHA-256 | **178/178 VERIFIED** (in place through the local Drive mount, no duplication) |
| Decode (ffprobe) | **178/178 PASS** (container/duration/dimensions/video-stream; h264 1920×1080 class) |
| Provenance | **89/89 videos** matched to `19_영상_원본대응표.csv` (original name + bytes) |
| Drive file IDs | 248/248 items mapped from the DriveFS metadata index — **0 duplicates** in the track root |

Full per-file evidence: `design-intake/manifests/track-68-living-media-sphere-v3.json` → `track68MediaInventory`.

## 3. Static runtime forensics (full-file read of the pinned HTML)

- `TOTAL = 89` (line 47); runtime URLs `assets/videos-v3/v3-NNN.mp4` + `assets/posters-v3/poster-NNN.jpg` (3-digit zero-padded, line 49)
- Poster-first: every sphere video sets `poster` + `preload='none'`; `src` kept in `dataset.src` and attached lazily only for near-side nodes (depth ≥ 0.7); play only when depth > 0.79 and `!document.hidden`; far-side paused (line 55/66)
- **`visibilitychange`** is the exact event used (line 73) — NOT `pagevisibilitychange`
- Click-vs-drag: `Math.hypot(...) > 5` marks a drag; a sub-5px tap focuses, repeat tap on the selected film opens the fullscreen viewer (lines 62–64)
- **P0 source defect — pointer cancel commits like pointer up**: the source binds `pointerup` AND `pointercancel` to the same `endPointer()` (line 65), so a cancelled ≤5px card gesture can still call `focusFilm()` / `openViewer()`. Phase 2 native contract (pinned): `pointerup` may commit click/drag only after valid 5px threshold semantics; `pointercancel` and lost pointercapture are **cleanup-only — never select, never focusFilm, never open the viewer**. The exact source HTML is NOT modified in Phase 1.
- Audible authority: all sphere videos `muted`; only the viewer video may play audibly → max audible = 1 (lines 55/59)
- Rendering: DOM transforms + manual perspective (`camera / (camera - z2)`) with `transform-style: preserve-3d` — **no WebGL, no Three.js, no canvas renderer** (verified by full-file read)
- Controls: film count 18..89, card size, sphere radius, corner, contrast, motion, depth fade, Wide/Tall/Square/Soft, Light/Dark, reset (lines 32–40, 68–72); Escape closes viewer + drawers; L/R toggle drawers (line 73)
- Reduced-motion: `@media (prefers-reduced-motion)` disables only decorative transitions — **idle auto-rotation persists** → Phase 2 native MUST remediate; source run alone must not be certified as accessible

## 4. Local exact-media browser QA (PASS_WITH_NOTED_PARTIALS)

Viewports 1280×800 / 390×844 / 320×720, read-only in-place serving of the Drive mount:

- 89 nodes/films/videos; posters 89/89; preload=none 89/89; at load only 40 near-side nodes had `src` attached (no eager decode storm; across all sessions only 87/89 distinct videos were ever fetched — deep side untouched)
- Selection → focus; repeat click → viewer playing the exact `v3-001.mp4` with controls (`LOVE TREE ARCHIVE · 001 / 089`); Escape closes and removes the video
- Drag rotates the sphere with inertia; **>5px drag does not open the viewer**
- Shape drawer: Tall/Square/Soft switch with mutual exclusion; Dark theme applies (trusted input events)
- Responsive: nav hidden ≤800px, cards resize (156→112px), drawer width clamps
- Partials (harness-truthful): film-count slider → 18 and Reset verified **statically** only — the in-app-browser pane overlays the top of the webview so top-zone widget clicks could not be delivered; console capture not exposed (proxy evidence: 945/945 requests 200/206, zero missing-asset errors)
- Live observation for Phase 2: front cards (z-index up to 1000 inside the fixed stage) can overlap the z-45 dock triggers — one trigger click was intercepted by a card during QA

## 5. Transport contract

- `TRANSPORT = LOCAL_EXACT_OUT_OF_GIT_ONLY` — the repository carries the exact executable HTML (25,544 B) + this evidence; all 178 media assets stay out of Git
- Source identity is carried by stable Drive IDs / filenames / bytes / SHA-256 only — **no machine-local absolute path is repository authority** (per Issue #235 Phase-1 release)
- Staging convention (repository-relative, gitignored, **LOCAL QA only — not a production media authority**): `public/design-lab-assets/source-tracks/68/v3/assets/{videos-v3,posters-v3}/`; local exact media MAY be staged there and MUST NOT be Git-tracked
- `REMOTE_CI_EXACT_VIDEO_TRANSPORT = NOT_PROVISIONED`; `EXTERNAL_VIDEO_ORIGIN = NOT_AUTHORIZED` — no substitute media may be claimed exact; remote CI runs the truthful missing-media state and must never be reported as exact-video PASS
- Source runner route: `/design-lab/source-tracks/68/v3/source` (fail-closed: the iframe mounts only after the served bytes hash-match the pinned SHA-256)

## 6. Phase gates

```
SOURCE_RUNNER       = AUTHORIZED — PHASE 1 (this intake)
NATIVE_CANDIDATE    = HOLD — PHASE 2
REPOSITORY_LINEAGE_68 = NOT ALLOCATED
CANONICAL_V4_ADOPTION  = NOT AUTHORIZED
BACKEND/DB/AUTH/PRODUCTION MUTATION = NONE
```
