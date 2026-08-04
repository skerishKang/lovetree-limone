# V4 Telegram P1 Implementation — Dashboard & Tear-off Memory Pad

Marker: `V4_TELEGRAM_P1_IMPLEMENTATION_READY`

## Branch & Base

- **Branch**: `feat/v4-telegram-p1-dashboard-tearoff`
- **Base SHA**: `62e0abf768409e4f72446953e83ef176d66e5b06` (`feat/v4-final-integrated-candidate`)
- **Source ingest**: `origin/chore/v4-ingest-telegram-html-20260804-a` (`054cf550af1350ef91b29d1212032c0735523444`)

## Scope

This work ports 2 of the 13 newly ingested Telegram HTML sources into React
screens. The other 11 are **not** implemented. No central manifest, registry,
landing, or Journey Dock registration was performed — these are isolated
lab routes for direct review only.

## Source Files

| Source | Route | Component | CSS |
|---|---|---|---|
| `add/lovetree-whole-picture-memory-dashboard-v1.html` | `/v4/labs/whole-picture-memory-dashboard` | `V4WholePictureDashboard` | `whole-picture-dashboard.css` |
| `add/lovetree-video-tearoff-memory-pad-v1.html` | `/v4/labs/video-tearoff-memory-pad` | `V4VideoTearoffMemoryPad` | `video-tearoff-memory-pad.css` |

## Implementation Principles

- No iframe wrapping of source HTML (each screen is a real React port).
- Only official YouTube embed iframes, carrying `title`, `allow`,
  `allowFullScreen`.
- Source demo data preserved exactly (numbers, names, dates, video IDs).
- No DB/API connection. Demo data is in component-level exported constants.
- No new product features added.
- Original HTML files never modified.
- CSS classes namespaced (`wpd-`, `vtp-`) for isolation.

## Dashboard — whole-picture-memory-dashboard-v1

### Source analysis

- Header (brand mark, nav, login, start button) + intro headline.
- 2-column workspace: question accordion (left) + visual shell (right).
- 4 questions, each mapping to a themed card screen:
  1. **stand** (theme-green): current state — score 93, health bar, 4 stats.
  2. **changed** (theme-blue): emotion change — 3 moment rows with YouTube
     thumbnails, delta +24%.
  3. **future** (theme-green): next season preview — 3 future items, chip.
  4. **next** (theme-sunset): next action — 4 action bars, 2 action buttons.
- Visual shell: rounded square with gradient background, noise texture,
  3D tilt on pointer move, theme switching animation (blur/scale).
- Progress pill during screen switch. Video modal: YouTube iframe embed.
- Desktop/mobile responsive (950px, 590px breakpoints).

### Implemented features

- 4-question accordion with expand/collapse animation.
- 4 card screens with exact source demo data.
- Theme switching (green/blue/sunset) with blur transition.
- 3D pointer-move tilt on visual shell.
- Progress pill during switch.
- Video modal with YouTube embed (title/allow/allowFullScreen).
- ESC closes video modal. Backdrop click closes video modal.
- Desktop and mobile responsive. Reduced-motion support.

### Excluded features

- None — all source features ported.

## Tear-off — video-tearoff-memory-pad-v1

### Source analysis

- Topbar (brand mark, top note) + 3-column studio.
- Left: intro (eyebrow, headline, description, people selector, guide,
  demo button).
- Center: paper pad with 3D perspective — pad back, stack pages, under-page,
  active wrap with 14-strip paper mesh, 11 fibers, progress line, video hit
  button, tear cue, binding with 3 pins.
- Right: archive (side head, archive list, meaning note).
- 3 people × 4 moments = 12 demo memories.
- Pointer drag tear: grab ratio, mesh deformation (hinge/bulge), fiber break,
  progress threshold 0.58, commit with flying page animation.
- Auto-tear demo button. Video player modal. Toast + sr-live announce.
- Complete sheet when all moments torn. localStorage persistence.
- Reduced-motion support. Responsive (1100px, 760px, max-height 820px).

### Implemented features

- 3-column studio layout with paper pad.
- 14-strip paper mesh with per-strip transform/filter (hinge, bulge, skew).
- 11 fibers with break animation based on grab ratio.
- Pointer drag interaction (down/move/up/cancel) with pointer capture.
- Tear commit: flying page portal animation, archive push, toast, announce.
- Auto-tear demo button (respects reduced-motion).
- Under-page preview (next moment). Complete sheet when all exhausted.
- Archive list with restore (re-open) interaction. People selector (3 people).
- Video player modal with YouTube embed (title/allow/allowFullScreen).
- ESC closes player. Backdrop click closes player.
- Toast + sr-live announce. localStorage demo persistence.
- Reduced-motion support. Responsive across all required viewports.

### Excluded features

- None — all source features ported.

## Demo Data

All numbers, names, dates, and YouTube video IDs are the source HTML's
demo values. They are exported as named constants (`WPD_QUESTIONS`,
`WPD_MOMENTS`, `WPD_STATS`, `VTP_PEOPLE`, etc.) for clear separation from
any future real data. No DB schema, API, or auth connection exists.

## External Dependencies

- YouTube embed iframes (`https://www.youtube.com/embed/...`).
- YouTube thumbnail images (`https://i.ytimg.com/vi/.../hqdefault.jpg`).
- Google Fonts (Gowun Batang, Gowun Dodum, Manrope) via CSS font stacks.
- No local companion assets required.

## Central Registration — NOT performed

These lab routes are **not** registered in:
`v4-source-manifest.ts`, `v4-implemented-sources.ts`, `v4-source-registry.ts`,
`V4JourneyDock.tsx`, `V4Landing.tsx`.

Reason: these are isolated review routes only. Final product route
placement and central registration will be decided by the product owner.

## Verification Commands

```bash
npm ci
npm run lint
npm run typecheck
node --test tests/v4-telegram-p1-source-faithful.test.mjs
npm run build
npm run db:check
npm test
```

## Test Results

- Static tests: source existence, route/component/CSS existence, source
  naming, import checks, central-file isolation, iframe attributes,
  feature preservation, data count preservation.
- Browser tests (Playwright): HTTP 200, no console/page errors, no
  duplicate IDs, no horizontal overflow across 5 viewports, dashboard
  screen switching, tearoff auto-tear + archive, reduced-motion tear,
  keyboard escape on video player.

## Future Product Decisions Needed

- Final product route paths (currently `/v4/labs/...`).
- Whether to register in central manifest/registry/dock.
- Whether to connect to real DB/API data (currently demo only).
- Whether to add persistent server-side storage for archived memories
  (currently localStorage demo only).

