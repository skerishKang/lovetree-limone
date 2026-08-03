# V4 Bookshelf Four Implementation

Marker: `V4_BOOKSHELF_FOUR_ISOLATED_READY`

Branch: `feat/v4-bookshelf-four-isolated`
Base: `feat/v4-integrate-additional-sources` (`cd9dd1f`)

## Scope

This work independently ports the four actually-available Bookshelf source HTML files
that exist in the repository `[샘플]` folder. The three missing sources
(`lovetree-rest-return-flow-v2-simple`, `lovetree-growing-tree-300-plus-v2-freegraph`,
`lovetree-growing-tree-season-archive-v3`) are **not** searched, guessed, or implemented.

The `v1/v2-1/v2-3d/v2a-2` suffixes are **not** treated as successive versions of the same
screen. Each HTML is treated as an independent screen based on its actual DOM, CSS, state,
and interactions.

## Source Files

| Source | Route | Component | CSS |
|---|---|---|---|
| `[샘플]/lovetree-people-book-shelf-v1.html` | `/v4/subjects/bookshelf/v1` | `V4BookShelfV1` | `bookshelf-v1.css` |
| `[샘플]/lovetree-people-book-shelf-v2-1-true-page-motion.html` | `/v4/subjects/bookshelf/v2-1` | `V4BookShelfV2P1` | `bookshelf-v2-1.css` |
| `[샘플]/lovetree-people-book-shelf-v2-3d.html` | `/v4/subjects/bookshelf/v2-3d` | `V4BookShelfV2D3` | `bookshelf-v2-3d.css` |
| `[샘플]/lovetree-people-book-shelf-v2a-2-interaction-stable.html` | `/v4/subjects/bookshelf/v2a-2` | `V4BookShelfV2A2` | `bookshelf-v2a-2.css` |

## Per-Source Analysis

### 1. Bookshelf V1 (`lovetree-people-book-shelf-v1.html`, 660 lines)

- Overall structure: topbar + hero(2-column) + shelf grid + detail view + new-book modal + video modal + toast.
- Desktop: 2-column hero; `repeat(auto-fill, minmax(190px, 1fr))` book grid.
- Mobile (≤700px): single-column hero, 2-column grid (`repeat(2, minmax(0,1fr))`), smaller covers.
- Data: 7 people, 5 chapters each (35 chapters), categories kpop/actor/series.
- Book cover 132×194; shelf-stage dark 3D mini-books.
- State machine: shelf view ↔ detail view; chapter index per book; filter; query.
- Storage key: `lovetree-people-book-shelf-v1` (selectedId, chapterIndex, customBooks).
- Modal: new-book modal + video modal (YouTube iframe embed with title/allow).
- Interactions: search input, filter chips, book open, chapter tree (horizontal nodes), video open, new book create, toast, ESC close, backdrop close, focus trap.

### 2. Bookshelf V2-1 (`lovetree-people-book-shelf-v2-1-true-page-motion.html`, 920 lines)

- Overall structure: topbar + hero + 3D carousel shelf + reader screen (book-3d) + chapter list + new-book modal + toast.
- Desktop: 3D carousel rail with perspective; reader layout 2-column (stage + info).
- Mobile (≤700px): column stacking, shelf viewport padding, book-3d-wrap scale(.58).
- Data: same 7 people / 35 chapters as V1 (independent copy).
- Core mechanics:
  - 3D carousel: cards positioned by `--x/--y/--z/--rot/--scale/--alpha`, center 1.12 scale.
  - Selection: click center card or drag rail; flight transition via shared transfer-book.
  - Cover drag open: pointerdown on cover, progress = startProgress + dx/220 (right opens, left closes), threshold 0.45.
  - 10-strip curved page flip: `.sheet` with 10 `i` strips, each with `--n` and staggered `curl-next/prev` keyframes (14ms delay per strip).
  - underPage: right page shows next chapter underneath the turning sheet.
  - Prev/next, OPEN/CLOSE, keyboard (←/→/ESC), pointer capture, pointer cancel.
  - Video: poster click → in-page iframe embed (title/allow/allowFullScreen, shorts variant).
- Storage key: `lovetree-people-book-shelf-v2-1-true-page-motion`.

### 3. Bookshelf V2-3D (`lovetree-people-book-shelf-v2-3d.html`, 690 lines)

- Overall structure: topbar + hero + horizontal scroll shelf + reader (book-3d) + chapter list + new-book modal + toast.
- Desktop: horizontal scroll rail (scrollbar hidden, drag-to-scroll); reader 2-column.
- Mobile (≤700px): column stacking, book-3d-wrap scale(.58).
- Data: same 7 people / 35 chapters.
- Core mechanics:
  - Horizontal shelf: `overflow-x:auto`, scrollBy arrows ±430, drag-to-scroll with pointer capture.
  - 3D book: `.book-3d` width 300→608 open; cover-face `rotateY(-164deg)` keyframe open; page-spine reveal; book-pages scaleX(.5→1).
  - Keyframe page flip: `.book-pages.turn-next .right` / `.turn-prev .left` with `page-next/prev` keyframes.
  - Book drag: cover drag opens when |dx|>45 or tap; page drag turns when |dx|>55.
  - In-page video: right page renders YouTube iframe directly (title/allow/allowFullScreen).
  - Prev/next, OPEN/CLOSE, keyboard (←/→/ESC).
- Storage key: `lovetree-people-book-shelf-v2-3d`.

### 4. Bookshelf V2A-2 (`lovetree-people-book-shelf-v2a-2-interaction-stable.html`, 298 lines)

- Overall structure: full-viewport 3D shelf scene, topbar with state readout, hot zones, shelf-world, info panel, control hint, toast.
- Desktop: full viewport perspective scene; info panel right.
- Mobile (≤760px): page scrolls, shelf height 43%, info panel bottom sheet, chapter list hidden.
- Data: 3 people (주연/플레이브/허드슨), 3 chapters each (9 chapters), each with time + bg1/bg2/accent/soft theme.
- Core mechanics:
  - Explicit interaction state machine: `SHELF → FOCUSING → FOCUSED → OPENING → OPEN → FLIPPING_NEXT/FLIPPING_PREV → CLOSING → RETURNING → SHELF`.
  - Segmented curved page: flip-sheet with 9 (coarse) or 14 segments; per-segment `translate3d + rotateY` based on progress with sine curl.
  - Corner drag: pointerdown on corner → interactive flip; progress = signed dx/(coarse?180:260); commit ≥0.34.
  - Theme transition: per-book `--theme-bg-1/--theme-bg-2/--theme-accent/--theme-soft`, 700ms background transition.
  - Stable open/flip/close ordering: busy guard + queue (`pageTurnQueue`), pointer cancel handling, double-input protection.
  - Wheel rotate, keyboard (←/→/Enter/ESC), hot zones, drag shelf, pointer capture + cancel.
  - Video: thumb-wrap click → in-page video-shell with YouTube iframe (`youtube-nocookie`, title/allow).
  - Reduced-motion: `prefers-reduced-motion` collapses transitions to 1ms and hides gloss/orb.
- Storage: the original uses session state only (no localStorage persistence); port follows the source.

## Implementation Principles Applied

- No iframe wrapping of the source HTML (each screen is a real React port).
- Only official YouTube video embeds are iframes, and they carry `title`, `allow`, `allowFullScreen`.
- Full source data counts preserved (7 books × 5 chapters for V1/V2-1/V2-3D; 3 books × 3 chapters for V2A-2 as in source).
- No placeholder repetition to fake data counts.
- No fake interactions: every button/gesture drives a real state transition.
- No extra dashboards/description cards/unified navigation beyond what the source has.
- No re-interpretation into existing V4 design language.
- Original HTML files are never modified.

## Accessibility

- All buttons carry accessible names (`aria-label` / visible text).
- Modals use `role="dialog"` + `aria-modal="true"` + labelled by.
- ESC closes open modals / book / reader.
- Modal focus moves to the first focusable on open; focus trap in V1 modal.
- Keyboard navigation: arrows move shelf/turn pages, Enter selects/opens, ESC closes.
- Images carry `alt` (poster thumbnails, video thumbnails).
- iframes carry `title` and `allow`.
- `prefers-reduced-motion` handled in every screen.
- Pointer and touch both supported (pointer events + pointer capture + cancel).

## Verification Commands

```bash
npm ci
npm run lint
npm run typecheck
node --test tests/v4-bookshelf-four-source-faithful.test.mjs
npm test
npm run build
npm run db:check
```

## Central File Isolation

The central registry files are intentionally left untouched for the integrator:

- `app/components/v4/v4-source-manifest.ts`
- `app/components/v4/v4-implemented-sources.ts`
- `app/components/v4/v4-source-registry.ts`
- `app/components/v4/V4JourneyDock.tsx`
- `app/components/v4/V4Landing.tsx`
- `app/v4/layout.tsx`
