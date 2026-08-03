# LoveTree Independent Source-Faithful Visual Audit

Marker: `V4_VISUAL_AUDIT_COMPLETE`

Audit type: independent source-faithful visual audit (LoveTree V4 vs original HTML samples)
Date: 2026-08-03
Auditor: independent, non-coding (no source edits, no commits)

## 1. Audit Target Mapping

| # | Original source (add/) | V4 route | V4 component |
|---|---|---|---|
| 1 | lovetree-motion-archive-v5-video-click-autoplay.html | /v4/subjects/demo/motion | V4ArchiveExperiences |
| 2 | lovetree-liquid-orbit-video-gallery.html | /v4/subjects/demo/orbit | V4ArchiveExperiences |
| 3 | lovetree-accordion-album-archive-v3-fixed.html | /v4/subjects/demo/accordion | V4ArchiveExperiences |
| 4 | lovetree-folding-person-archive.html | /v4/subjects/demo/folding | V4ArchiveExperiences |
| 5 | lovetree-tree-pause-issue-state-v1.html | /v4/trees/demo/state | V4TreeState |

Note: source HTML set verified in `add/` (identical byte-for-byte to the copies in `lovetree-limone-v3/` for items 1–4). The tree-pause original (item 5) exists ONLY in `add/`.

## 2. Methodology

- Runtime: local servers — V4 via existing `next-server` on :3000; originals via `python3 -m http.server 8080 --directory add`.
- Browser: Playwright chromium headless, deviceScaleFactor 1.
- Viewports: 1536×960, 1280×800, 768×1024, 390×844, 320×720.
- Evidence: viewport screenshots (50 PNGs) + DOM structural probe (topbar/app boxes, card counts, fonts, colors, video/iframe/thumbnail presence, click interaction) at 1536×960 and 390×844, plus pixel-difference metrics (MAE, % pixels >12 delta) computed at all 5 viewports.
- Screenshots stored under `/tmp/visual-audit/<viewport>/`.

## 3. Judgment Categories

- MATCH — visually identical under source-faithful comparison.
- PARTIAL_MATCH — same composition but measurable differences (counts, fonts, palette, media).
- MISSING — element/feature present in original absent in V4.
- INTENTIONALLY_INTEGRATED — feature intentionally re-expressed/redesigned in V4.
- NOT_TESTED — not verifiable in this audit.

## 4. Global Cross-Page Findings (all archive pages)

| Item | Original | V4 | Judgment |
|---|---|---|---|
| Top bar (floating pill) | `.topbar`/`.top` h66–68, radius 24–25, shadow 15–16px/42–48px | `.v4-archive-top` h68, radius 24, shadow 16px/46px (unified) | PARTIAL_MATCH (normalized to one style; per-page original nuances lost) |
| App width | min(1540–1560px, 100%-…) | min(1560px, 100%-28px) = 1508 at desktop | MATCH |
| Brand | 러브트리LoveTree / 러브트리LOVETREE | LoveTree | PARTIAL_MATCH (logo mark/copy simplified) |
| Page title | per-page "LoveTree · …" | "LoveTree \| 사랑에 빠지는 순간을 이어 보세요" (identical on all routes) | MISSING (per-page titles not ported) |
| Body background | per-page cream (motion #f5f0ea, liquid #f7efe7, accordion #f6efe7, folding #f7efe7, tree #fbf8f1) | unified rgb(246,240,232)=#f6f0e8 on all 5 routes | PARTIAL_MATCH |
| Video playback | real YouTube <iframe> embeds (liquid shows a live 390×488 player; motion hidden 0×0 iframe; others hidden) | NO <iframe> anywhere — static hqdefault thumbnails only | MISSING (video player/autoplay not ported) |
| Video IDs | ldfmc4lnwoY, faILSGYuDUI, JU0CLaT3Bfs… | dQw4w9WgXcQ, ysz5S6PUM-U, M7lc1UVf-VE… | INTENTIONALLY_INTEGRATED (placeholder IDs; differs from source) |
| Fonts | liquid/folding use Pretendard body; motion/accordion use Gowun Dodum | all use Gowun Dodum | PARTIAL_MATCH (Pretendard fonts dropped) |
| Headline copy | per-page poetic h1 | different per-page h1 copy | INTENTIONALLY_INTEGRATED (re-expressed copy) |
| Card dims | motion 178×260, liquid 224×328, shelf 1360×465, folding shelf 1310×480 | motion 178×260, liquid 224×328, shelf 1360×465, folding shelf 1310×480 | MATCH |
| Card counts | motion 9, liquid 9 moment cards, tree 6 | motion 8, liquid 8, tree 5 state cards | PARTIAL_MATCH |

## 5. Item 1 — Motion Archive (`/v4/subjects/demo/motion`)

- Topbar, app width, card size (178×260), hover flip classes, keyboard/drag/wheel wiring all present. Pixel MAE 21–39 (best on desktop), diff >12 on 21–36% of pixels (mostly card artwork + header spacing).
- Differences: card count 9 vs 8; no visible video player (original click-autoplay iframe is hidden-sized 0×0 until activated; V4 renders no iframe at all, only hqdefault imgs); different video IDs; headline copy differs.
- Judgment: PARTIAL_MATCH. Video click-autoplay behavior not verifiable as matching (no embedded player in V4).

## 6. Item 2 — Liquid Orbit (`/v4/subjects/demo/orbit`)

- Largest pixel deviation of the set (MAE 39–56; >12 delta 43–56%). Main cause: original renders a live YouTube player (iframe 390×488 desktop, 203×254 mobile) + data-URI base64 frame art; V4 shows 8 static thumbnails, zero iframes.
- Font differs (Pretendard → Gowun Dodum). Moment card count 9 vs 8, but card box 224×328 matches exactly.
- Click on first card: original opens modal/selection; V4 shows no modal (uses select-state). Modal interaction present in original, not triggered in V4 probe.
- Judgment: PARTIAL_MATCH. Video player behavior (drag/wheel orbit + live embed) NOT ported → MISSING for playback.

## 7. Item 3 — Accordion Album (`/v4/subjects/demo/accordion`)

- Shelf geometry matches closely: shelf 1360×465 (orig) vs 1360×465 (V4); shelf-view 1508×666 vs 1506×666; controls width differs (orig 206, V4 323).
- Click interaction opens panel in both (modal-open true). Top bar radius/height match; shadow depth 14/42 vs 16/46.
- Differences: no iframe in V4 (orig hidden iframe + 12 YouTube thumbs vs V4 5 thumbs), different video IDs, different h1 copy, unified body bg.
- Judgment: PARTIAL_MATCH.

## 8. Item 4 — Folding Person (`/v4/subjects/demo/folding`)

- Shelf 1310×480 matches exactly; shelf-view 1506×666 vs 1506×677; controls 261 vs 208. Modal open on click in both.
- Font differs (Pretendard → Gowun Dodum). Media: orig 24 data-URI thumbs + hidden iframe; V4 11 hqdefault thumbs, no iframe. Person album count 46 vs V4 album-class 0 (V4 restructures into ALBUMS list — INTENTIONALLY_INTEGRATED).
- Judgment: PARTIAL_MATCH.

## 9. Item 5 — Tree Pause State (`/v4/trees/demo/state`)

- Closest palette overall (MAE 15–22 across viewports), but background differs: original rgb(251,248,241)=#fbf8f1 vs V4 #f6f0e8. Original shows tree-preview with 1 YouTube thumb; V4 has 0 images (pure UI state cards).
- Original layout: 6 cards with center/preview/tree cards in grid, header 38px desktop/68px mobile. V4: 5 `v4-state-card` (resting/active/archived + visibility + issues), `v4-life-header` 62px, shell 1260px.
- State model matches conceptually (resting default, private/link visibility, issue list with dates 2026.06.12/15/20), persisted to localStorage `lovetree-v4-tree-state`. Title/headline/brand copy differ.
- Judgment: PARTIAL_MATCH (closest visual parity of the set; structural re-expression of the state UI is INTENTIONALLY_INTEGRATED).

## 10. Consolidated Matrix

| Target | Topbar | App | Cards | Video | Font | Palette | Interaction | Overall |
|---|---|---|---|---|---|---|---|---|
| motion | PARTIAL | MATCH | PARTIAL | MISSING | MATCH | PARTIAL | PARTIAL | PARTIAL_MATCH |
| liquid-orbit | PARTIAL | MATCH | PARTIAL | MISSING | PARTIAL | PARTIAL | PARTIAL | PARTIAL_MATCH |
| accordion | PARTIAL | MATCH | MATCH | MISSING | MATCH | PARTIAL | MATCH | PARTIAL_MATCH |
| folding | PARTIAL | MATCH | MATCH | MISSING | PARTIAL | PARTIAL | MATCH | PARTIAL_MATCH |
| tree-state | PARTIAL | MATCH | PARTIAL | n/a | MATCH | PARTIAL | PARTIAL | PARTIAL_MATCH |

No target scored MATCH or MISSING outright; all are PARTIAL_MATCH. The single clearest MISSING across the archive family is live video playback (no `<iframe>` embeds anywhere in V4; only static YouTube thumbnails).

## 11. Verification & Reproducibility

- All 5 V4 routes returned HTTP 200 on :3000; all 5 originals HTTP 200 on :8080 (served from `add/`).
- Screenshots: 50 PNGs (5 viewports × 10 pages) at `/tmp/visual-audit/`.
- Scripts used (temporary, under /tmp): `visual_audit2.cjs` (capture), `dom_audit2.cjs` (structure), `interact_audit.cjs` (click/video), `analyze_shots.py` (pixel diff).
- No source files were modified during this audit.

## 12. Verdict

Source-faithful integration is structurally strong: app width, topbar presence, card/shelf geometry, font family for motion/accordion/tree, and warm cream palette all transfer correctly. Measurable gaps remain: (1) video playback is MISSING (no embedded players; static thumbs only), (2) Pretendard body font dropped on liquid-orbit and folding, (3) per-page background tints and topbar shadow details normalized to one shared style, (4) page titles not ported per-page, (5) card counts reduced (9→8, 9→8, 6→5). Headline copy and album/person data structures are intentionally re-expressed.

Result: 0× MATCH, 5× PARTIAL_MATCH, 0× MISSING, 0× INTENTIONALLY_INTEGRATED-only, 0× NOT_TESTED. Follow-up recommended only if strict source-faithful video playback is required; otherwise current integration is acceptable for demo parity.

Marker: `V4_VISUAL_AUDIT_COMPLETE`
