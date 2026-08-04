# V4 HTML Intake — Telegram Batch 20260804-A

## Batch

- **Batch Name**: `TELEGRAM_20260804_A`
- **Ingest Date**: 2026-08-04
- **Branch**: `chore/v4-ingest-telegram-html-20260804-a`
- **Base Branch**: `origin/feat/v4-integrate-additional-sources`
- **Starting SHA**: `cd9dd1fb3e9684040553f96f564aeaabec7632cd`

## Purpose

This document records the ingestion of newly received LoveTree HTML sources
from the Telegram download folder into the `add/` directory of this
repository. This step is source preservation only. No React implementation,
manifest registration, registry modification, or integration work was
performed.

## Paths

- **Download origin (Telegram)**: `/mnt/g/Ddrive/BatangD/task/workdiary/텔레그램다운로드폴더/`
- **Existing V4 work folder**: `/mnt/g/Ddrive/BatangD/task/workdiary/lovetree-limone-v4-final/`
- **Sample folder (1st batch originals)**: `[샘플]/` (repository canonical originals location)
- **Add folder (local staging, this ingest target)**: `add/`
- **WSL ext4 worktree**: `/root/worktrees/lovetree-v4-ingest-telegram-20260804-a/`

Note: The repository canonical originals are stored under `[샘플]/`. The
`add/` folder is the local staging area where newly arrived HTML is first
collected. This batch preserves new sources under `add/` without touching
any existing `[샘플]` file.

## Inventory

- Download HTML files (LoveTree candidate): **17**
- STABLE files: **17**
- STILL_WRITING files: **0**
- UNREADABLE files: **0**
- Existing `[샘플]` files: **11**
- Existing `add` files (before this batch): **11**
- New files ingested into `add/`: **13**

Stability was verified by measuring size and SHA-256 twice at a 5-second
interval. All 17 files were identical across both measurements (STABLE).

## Classification Table

Legend:
- NEW_SOURCE: no corresponding screen in existing `[샘플]`/`add`
- EXACT_DUPLICATE: SHA-256 identical to an existing file
- NOT_LIFETREE: unrelated to LoveTree project, excluded from ingestion

| # | Download file | SHA-256 | Classification | Existing counterpart | Ingested |
|---|---------------|---------|----------------|----------------------|----------|
| 1 | `lovetree-video-constellation-v3-dense-bookmarks-person-fix.html` | `3833ac09eb7b68e0fe30359029b0497d8601c6750df6df164a7ff8ba94f73476` | NEW_SOURCE | — | yes |
| 2 | `lovetree-living-video-memory-graph-v1.html` | `c6e1dccc1bc7c869260c5ba96ddfddc68dd5f01bda667a2588df0a81b28da061` | NEW_SOURCE | — | yes |
| 3 | `lovetree-cinematic-memory-portal-home-v3-bright-local-entry.html` | `b8be6b49ba8a736c369050eb4f669a51e07b7b1e56f3d683b25504b9aa383927` | NEW_SOURCE | — | yes |
| 4 | `lovetree-video-tearoff-memory-pad-v1.html` | `63ab49382fe9798515bf91bf5683b9224d0902f6f7b041757d8ddcd3dd57750e` | NEW_SOURCE | — | yes |
| 5 | `lovetree-video-memory-workflow-v1.html` | `438cbcbeb522cb64c4eb68edeef6713c469a35cfd45cac352d142cd0fade29ba` | NEW_SOURCE | — | yes |
| 6 | `lovetree-vinyl-video-memory-player-v1.html` | `87cd2740c096b7a3d9fc8df4cc598f41fc0871a1fa5c761bda74c241b5260b52` | NEW_SOURCE | — | yes |
| 7 | `lovetree-video-memory-lore-map-v1.html` | `2952440da4d597238ba2b5e7eddf8172b977b4e0afb0db51f867cf794d92747f` | NEW_SOURCE | — | yes |
| 8 | `lovetree-cosmic-video-memory-atlas-v1.html` | `9d5b4b3682d2bba0118a4a7a6e9a37098442c4be4180f74009e4580c36130526` | NEW_SOURCE | — | yes |
| 9 | `lovetree-vinyl-coverflow-video-gallery-v2.html` | `ae9389a8b6f4fe7f2af10f6e05d276ba3713daf23155a876f32d724ab897fe25` | NEW_SOURCE | — | yes |
| 10 | `lovetree-whole-picture-memory-dashboard-v1.html` | `ed7c42c5ccce92a1e6f5d7e986f3b061a59e29cca390aef6cf86b4d91d1e0b41` | NEW_SOURCE | — | yes |
| 11 | `lovetree-cinematic-reference-faithful-v2.html` | `a74511a211e6bb86dcadd76958faa194fe60f5bba89b5269aeafb0719f9a2ce6` | NEW_SOURCE | — | yes |
| 12 | `lovetree-golden-heart-scroll-story-v1.html` | `2adc32fdbdb081240aa44b94f869a5b1f381cd5cd7f98896c93d16178775398d` | NEW_SOURCE | — | yes |
| 13 | `lovetree-cinematic-original-assets-v3.html` | `15e5086931807beb02a8e4da5b90255fea76a97eaccb4553dd7af8e9d90cf414` | NEW_SOURCE | — | yes |
| 14 | `lovetree-people-book-shelf-v2-3d.html` | `c5439af263ba351e48286222de115624d06337480fdb71973b9f0078e12780df` | EXACT_DUPLICATE | `[샘플]/lovetree-people-book-shelf-v2-3d.html` | no |
| 15 | `lovetree-people-book-shelf-v2a-2-interaction-stable.html` | `460a0c60220a38f69136f0ae42e5409f3e273bbab45f8aefcb88650b519bb49e` | EXACT_DUPLICATE | `[샘플]/lovetree-people-book-shelf-v2a-2-interaction-stable.html` | no |
| 16 | `lovetree-people-book-shelf-v2-1-true-page-motion.html` | `cb64d80376d59ced65273784ce9723c22723827d25e800474e192d070833ca67` | EXACT_DUPLICATE | `[샘플]/lovetree-people-book-shelf-v2-1-true-page-motion.html` | no |
| 17 | `danjion-community-platform-v1.html` | `18aa25f5566c035f089efc33e2c61a0bb9b3e9e5c2f68d8b71bcb152d6937a42` | NOT_LIFETREE | — | no |

## Files Ingested into add/

All 13 NEW_SOURCE files were copied byte-for-byte from the Telegram download
folder to `add/` with their original filenames (no name collision occurred,
so no `__telegram-20260804-a` suffix was needed).

| # | Repository filename | Original filename | Title | Byte size |
|---|---------------------|-------------------|-------|-----------|
| 1 | `add/lovetree-video-constellation-v3-dense-bookmarks-person-fix.html` | same | LoveTree · Neon Heart Constellation | 55,105 |
| 2 | `add/lovetree-living-video-memory-graph-v1.html` | same | LoveTree · Living Video Memory Graph | 36,008 |
| 3 | `add/lovetree-cinematic-memory-portal-home-v3-bright-local-entry.html` | same | LoveTree · Bright Deep Entry | 22,561 |
| 4 | `add/lovetree-video-tearoff-memory-pad-v1.html` | same | LoveTree · 영상 기억 뜯어보기 | 36,195 |
| 5 | `add/lovetree-video-memory-workflow-v1.html` | same | LoveTree · Video Memory Workflow | 36,370 |
| 6 | `add/lovetree-vinyl-video-memory-player-v1.html` | same | LoveTree · Vinyl Video Memory Player | 43,297 |
| 7 | `add/lovetree-video-memory-lore-map-v1.html` | same | LoveTree · Video Memory Lore Map | 47,351 |
| 8 | `add/lovetree-cosmic-video-memory-atlas-v1.html` | same | LoveTree · Cosmic Video Memory Atlas | 35,935 |
| 9 | `add/lovetree-vinyl-coverflow-video-gallery-v2.html` | same | LoveTree · Vinyl Coverflow Video Gallery v2 | 23,965 |
| 10 | `add/lovetree-whole-picture-memory-dashboard-v1.html` | same | LoveTree · 좋아한 마음을 한눈에 | 25,265 |
| 11 | `add/lovetree-cinematic-reference-faithful-v2.html` | same | LoveTree · Cinematic Reference Faithful v2 | 3,030,255 |
| 12 | `add/lovetree-golden-heart-scroll-story-v1.html` | same | LoveTree · Golden Heart Story | 43,910 |
| 13 | `add/lovetree-cinematic-original-assets-v3.html` | same | LoveTree · Cinematic Memory Film | 1,689,407 |

No files were renamed. No existing file was overwritten.

## External Dependencies

All 13 ingested files are single-file, self-contained HTML:

- Inline `<style>` + `<script>` only; no local CSS/JS files required.
- No relative-path image/CSS/JS/video/audio dependencies.
- `lovetree-cinematic-reference-faithful-v2.html` and
  `lovetree-cinematic-original-assets-v3.html` embed images as base64
  `data:` URIs.
- Several files reference YouTube embeds (`https://www.youtube.com/embed/...`
  or `https://www.youtube-nocookie.com/embed/...`) and `https://i.ytimg.com`
  thumbnails, generated from JS `video.yt`/`id` values. These require a
  network connection at runtime but no local companion assets.
- A companion file `09-reference-faithful-journey.webm` exists next to
  `lovetree-cinematic-reference-faithful-v2.html` in the download folder,
  but the HTML does not reference it. It was not copied.

## Verification

Each file was verified with SHA-256 after copying. The SHA-256 of the
Telegram original, the G: `add/` copy, and the WSL worktree `add/` copy are
identical for all 13 ingested files (triple match). See
`docs/v4/V4_HTML_INTAKE_TELEGRAM_20260804_A_SHA256.txt` for the full
checksum manifest.

## Implementation Priority Draft (not applied)

The following is an initial ordering suggestion for future implementation.
It was not implemented in this batch.

1. `lovetree-cinematic-reference-faithful-v2.html` — complete cinematic
   journey prototype (largest, most complete reference).
2. `lovetree-cinematic-original-assets-v3.html` — original art assets film.
3. `lovetree-cinematic-memory-portal-home-v3-bright-local-entry.html` —
   portal home entry screen.
4. `lovetree-whole-picture-memory-dashboard-v1.html` — single dashboard of
   liked memories.
5. `lovetree-golden-heart-scroll-story-v1.html` — scroll-driven golden heart
   story.
6. Video memory browser family: `lovetree-living-video-memory-graph-v1.html`,
   `lovetree-video-memory-workflow-v1.html`, `lovetree-video-memory-lore-map-v1.html`,
   `lovetree-video-tearoff-memory-pad-v1.html`.
7. Video player/collection family: `lovetree-vinyl-video-memory-player-v1.html`,
   `lovetree-vinyl-coverflow-video-gallery-v2.html`,
   `lovetree-cosmic-video-memory-atlas-v1.html`,
   `lovetree-video-constellation-v3-dense-bookmarks-person-fix.html`.

## Unprocessed Files and Reasons

| File | Reason |
|------|--------|
| `lovetree-people-book-shelf-v2-3d.html` | EXACT_DUPLICATE of `[샘플]/` file (identical SHA) |
| `lovetree-people-book-shelf-v2a-2-interaction-stable.html` | EXACT_DUPLICATE of `[샘플]/` file (identical SHA) |
| `lovetree-people-book-shelf-v2-1-true-page-motion.html` | EXACT_DUPLICATE of `[샘플]/` file (identical SHA) |
| `danjion-community-platform-v1.html` | Not a LoveTree source; unrelated apartment-community prototype |

## Out of Scope

No manifest change, no implemented-sources update, no registry change, no
React implementation, no tests, no build, no lint, no deployment.
