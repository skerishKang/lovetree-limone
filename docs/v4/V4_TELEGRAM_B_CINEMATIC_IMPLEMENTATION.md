# V4 Telegram B Cinematic Implementation — P1

## Overview

Implements the reviewed Telegram B cinematic
(`add/lovetree-cinematic-reference-motion-v5-1-refined.html`, commit
`38fb8f9981c3b2e33c73c3106bd2155bbda7881d`) as an isolated, source-faithful
V4 cinematic experience at **`/v4/cinematic`**.

- **Branch**: `feat/v4-telegram-b-cinematic`
- **Base**: `main` at `9d6d98f53998ab3eae840a8824717fc4d4bf43b5`
- **Status**: Draft PR against `main`, not merged, not deployed

## Source Authority

- Reference: `add/lovetree-cinematic-reference-motion-v5-1-refined.html`
  (reviewed under `V4_TELEGRAM_B_CINEMATIC_REVIEW_READY`)
- The 16-scene sequence, copy, scene timing, transitions and visual
  composition are preserved verbatim from the reviewed source.
- The original reviewed HTML is **not modified**; it remains the reference.

## Implementation Structure

- `app/v4/cinematic/page.tsx` — route page (server component)
- `app/components/v4/cinematic/V4Cinematic.tsx` — client cinematic engine
- `app/components/v4/cinematic/cinematic-data.ts` — scene data + asset URLs
- `app/styles/v4/cinematic/cinematic.css` — source-faithful styles
- `public/v4/cinematic/telegram-b/*.webp` — 30 externalized assets
- `tests/v4-cinematic.test.mjs` — route/motion/menu/a11y/reduced-motion tests
- `docs/v4/V4_TELEGRAM_B_CINEMATIC_IMPLEMENTATION.md` — this document

## Preserved Systems

1. 16-scene scroll-driven crossfade + per-scene transform engine
2. cloud-curtain (scene 15)
3. constellation SVG with stroke-dashoffset + dot reveal (scene 15)
4. blade-glint (scene 08)
5. motion-mask system (polish/graft/behold/blueprint/prune)
6. shard-field / workshop (scene 12)
7. question-layer (scene 14)
8. scene rail (01–16)
9. menu overlay with scene tiles
10. source-faithful typography, composition, scene ordering

## Asset Externalization

- All 30 inline base64 WebP images removed from the React implementation.
- Extracted to `public/v4/cinematic/telegram-b/`.
- No `data:image` or embedded image payload remains.
- **Eager load**: scene 1 (`polish.webp` × 2 for bg + motion mask).
- **Preload**: scene 2 (`sapling.webp`).
- **Lazy**: remaining scene assets load on demand.
- Inventory: 30 assets, total **5,552,464 bytes** (~5.3 MB),
  largest `workshop.webp` (314,274 bytes). See
  `evidence/asset-inventory.json`.

## Motion & Performance

- `prefers-reduced-motion` detected in **JavaScript** (state + DOM attribute)
  as well as CSS.
- Under reduced motion: continuous transforms, particles, blade sweep and
  decorative animations disabled; scenes remain readable with restrained
  crossfades; navigation and CTA fully functional.
- rAF + canvas work pauses when `document.hidden`, when the root is not
  visible (IntersectionObserver), and on unmount. No duplicate loops.
- Canvas respects `devicePixelRatio` capped at 1.5; no unbounded allocation.
- Particles only draw for decorative scenes (sky/final scenes skip canvas).
- rAF/heap/visibility behavior recorded in `evidence/`.

## Accessibility

- Menu trigger: `aria-expanded` + `aria-controls`.
- Menu overlay: `role="dialog"`, `aria-modal="true"`, accessible name.
- Complete focus trap (Tab + Shift+Tab wrap).
- Escape closes; backdrop click closes; focus restored to trigger.
- Scene rail controls have accessible labels; keyboard operable.
- Focus indicators visible (`:focus-visible` outlines).
- Final CTA is a real `<a href="/v4/journey">` link.
- Decorative SVG/canvas `aria-hidden="true"`.
- Reduced-motion mode fully navigable.

## Existing V4 Protection

- `/v4/journey` unchanged (not replaced or redesigned).
- Existing 31 route implementations unchanged.
- V1/V2/V3, auth/API/DB/schema/migrations/worker/Wrangler untouched.
- Telegram A/B source HTML and labs routes untouched.
- Bookshelf, 100 Moments, community, lifecycle screens untouched.
- No global navigation link to the cinematic was added.
- **Only existing-file change**: `V4JourneyDock.tsx` returns null on
  `/v4/cinematic` so the full-screen experience is not overlapped. Route-scoped
  and minimal; dock behavior on every other route unchanged.

## Journey Dock

- `/v4/cinematic` renders full-screen immersive.
- The inherited Journey Dock is suppressed only on `/v4/cinematic`.

## Responsive Acceptance

Validated at 1536×960, 1280×800, 768×1024, 390×844, 320×720:
HTTP 200, no horizontal overflow, no clipped primary copy, scene
navigation accessible, menu fits viewport, CTA reachable, no unexpected
console/page errors, no hydration errors, no duplicate IDs, no blocking
element overlap.

## Static Validation

- `npm ci` OK
- `npm run lint` — 0 errors (59 pre-existing warnings)
- `npm run typecheck` — PASS
- `npm test` — 511/511 PASS (includes 6 new cinematic tests)
- `npm run build` — PASS
- `npm run db:check` — PASS

## Browser Validation

- Scroll through all 16 scenes in order — PASS
- Direct scene select via rail — PASS
- Menu open/close via pointer, backdrop, Escape — PASS
- Full keyboard navigation + focus restoration — PASS
- Final CTA navigates to `/v4/journey` — PASS
- `visibilitychange` pauses/resumes animation — PASS
- Reduced-motion suppresses continuous motion — PASS
- Reload produces no hydration failure — PASS
- No multiple rAF loops after repeated navigation — PASS
- Mobile scroll controllable, not trapped — PASS

## Evidence

- `/root/lovetree-captures/v4-telegram-b-cinematic-p1-<shortsha>/`
- ZIP copied to `G:\Ddrive\BatangD\task\workdiary\LoveBud\`

## Registry / Manifest

This implementation is **not** registered as a thirtieth supplied-source
design. Manifest, implemented-source list and registry remain 29/29/29.
The cinematic is a derived product experience, not an additional source-port
entry.
