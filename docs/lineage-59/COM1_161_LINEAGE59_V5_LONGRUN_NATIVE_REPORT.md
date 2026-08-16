# COM1_161_LINEAGE59_V5_LONGRUN_NATIVE_REPORT

Date: 2026-08-16
COM1 long-running isolated slice — Lineage 59 Living Memory Book V5 native Design Lab candidate
Parallel with GLM5.3 on Track47 / Issue #234 (same machine, separated resources).

## Source / fingerprint

- Source executable: `현재후보.html` (Drive `1Tof9O1c0lslWsgz2oY6R--drFuqTEC6d`)
- Bytes: `17,192,064`
- SHA256: `763f8a2ffbe46d556fcfe7b2b57d505860be6e346bfe30223a8891a56e14be71`
- V5 instruction authority: `10_59_V5_스토리ON·인라인편집·빠른페이지턴·시네마틱배경_디자인팀장5기_확장지시_2026-08-11.md` (Drive `1shaU3KVJV0apYdFpUAi9k3w2-5ly3pY7`)
- MASTER: `00_59_메모리스케치북_통합설계_MASTER_설계팀장11기_2026-08-11.md` (Drive `1q3OE6pcxVkV5hgRcpyMzbiO6QnpH9zEA`)
- Drive downloads were blocked (not "Anyone with the link"); implementation is driven by the #161 intake + Web CTO comment 5306408967 behavioral contract, which pins the same source bytes/hash.

## Source deltas / native re-implementation

No 17.2MB standalone HTML or base64/data-URL payloads are shipped. All source behavior is re-implemented native React/TypeScript:

- Continuous pointer-driven page curl with front/back surface, binding anchor, cast shadow, next-page pre-reveal, cancel/commit threshold, hold-to-fast-flip.
- Story ON grammar is a real phase state machine (`holding → why-next → page-turn → landing`), NOT `setInterval(nextPage)`. Play/pause/resume, 0.75×/1×/1.5×/2×, manual page interaction wins, inspect/edit pauses, explicit end state.
- Branch auto-pause: Story pauses at a Branch, exactly 2 explicit choices, chosen path resumes; Branch never auto-selects.
- Bounded inline edit: title, memo/body, primary emotion, keywords, link URL/title, WHY NEXT. Moment ID + capturedAt + provenance preserved. Save keeps same spread and immediately updates Index/Story/Detail projections.
- Three data variants to exercise variance: default 7-moment path, long 10-moment path with English copy + mixed media, branch path with 2-choice branch.

## State architecture

Single canonical selected Moment authority shared by book page, Path Index, Detail, Magnifier, Story and Editor:

- `lib/lineage-59/selection-authority.ts` — one `SelectionState` (`currentMomentId` + path).
- `lib/lineage-59/story-transport.ts` — pure Story phase/speed/pause model.
- `lib/lineage-59/branch-authority.ts` — pure Branch pause/choice model.
- `lib/lineage-59/page-physics.ts` — pure curl progress/threshold/transform model.
- `lib/lineage-59/edit-authority.ts` — pure bounded-edit field model.
- `lib/lineage-59/living-memory-book-data.ts` — Moment/Connection/Branch/Path data boundary (Moment=page, Connection=WHY NEXT, Path=replay sequence, Branch=alternate continuation). No DB/API/Auth entities.

## Physical page mechanics

CSS-3D (`perspective` + `rotateY` + `backface-visibility`) driven by the curl progress state. Pointer drag updates progress continuously; release below 40% cancels, at/above 40% commits; fast-flip buttons iterate a page per 200ms while held. Mobile touch drag reuses the same pointer model; reduced-motion mode disables curl and uses semantic button navigation.

## Story transport

Phase durations scale by selected speed. Branch pause happens at the landing of a branching moment; choice selection jumps to the chosen continuation moment and resumes Story.

## Branch authority

Branch never auto-selects. `createBranchState` → user picks one of exactly 2 choices → `resolved` → continuation resumes.

## Selection synchronization

Every projection (page, Index, Detail, Magnifier, Story status, Editor) reads the single `SelectionState`; edits write back into the shared moment map and the same spread/position is retained.

## Inline edit truthfulness

Session/in-memory only. No persistence claims. Locked fields (Moment ID, capturedAt, provenance) are not editable. Save closes the dialog, keeps the current page, and projections reflect the change immediately.

## Accessibility / mobile

- Native dialog/sheet semantics: `role="dialog"` + `aria-modal="true"` for Branch, Index, Edit, Detail, Magnifier.
- Focus entry on dialog open (first branch choice `autoFocus`), Escape to close, trigger focus restoration where applicable, closed overlays are unmounted (noninteractive).
- Keyboard: ArrowLeft/ArrowRight page nav, Space play/pause, Escape close, `i` index, `e` edit.
- `aria-live` status for Story phase, page landing, Branch choice, end state.
- Visible focus states on all buttons.
- `prefers-reduced-motion` reduces decorative animation while Story semantic phase flow and page nav still work.
- Responsive: 1280×800 desktop spread, 390×844 single-page mobile, 320×720 narrow — QA confirms 0 horizontal overflow at all three.

## Exact assets / HOLDS

- `LINEAGE_59_ASSET_PROVENANCE_AND_NATIVE_MEDIA_BINDING_HOLD` — kept HOLD. Placeholder SVG/MP4 demo media are used and clearly not source-authority assets; exact V5 background/character/media objects were not pinnable because Drive download was blocked in this environment.
- `ACCESSIBILITY_DIALOG_AND_320_QA_HOLD` — native remediation implemented and QA-passed for 1280/390/320 + dialog/keyboard/reduced-motion; recorded as remediated in this candidate but disposition kept as evidence of the source HOLD.
- `CANONICAL_ADOPTION=NO`, `BACKEND_MUTATION=NONE`, `PRODUCTION_MUTATION=NONE`.

## Browser evidence

- Dev server: dedicated port 3159 (WSL-native worktree `/root/lovetree-lineage59-com1`, branch `feat/161-lineage59-v5-native`).
- `tests/lineage-59-browser-qa.test.mjs` — 6 QA cases pass:
  1. Desktop 1280×800 static fidelity + no console/page errors + no overflow.
  2. Mobile 390×844 no overflow + keyboard nav.
  3. Narrow 320×720 no overflow.
  4. Reduced-motion semantic parity (Story status + page nav).
  5. Branch auto-pause with exactly 2 explicit choices + resume.
  6. Desktop/mobile/narrow screenshots saved to `qa/evidence/lineage-59/`.
- Screenshots: `qa/evidence/lineage-59/desktop-1280x800.png`, `mobile-390x844.png`, `narrow-320x720.png`.

## Pure tests

`tests/lineage-59-*.test.mjs` — 48 pure state tests pass:
- selection-authority (11), story-transport (11), branch-authority (6), page-physics (12), edit-authority (5), native-review provenance/registry/route/CSS (4).
- Existing registry tests (design-lineage-registry, design-lab-registry, experience-capability-registry, lineage-53-v2-native-review) still pass.

## Static checks

- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on owned files — 0 errors; only `@next/next/no-img-element` warnings consistent with existing V4 component conventions.
- `npm run lint` (full) — 0 errors.
- `git diff --check` — clean.

## Changed files (COM1-owned only)

- `lib/design-lineages.ts` — registered `lt-59-living-memory-book` (Lineage 59, V5 candidate revision).
- `lib/lineage-59/lineage-59-source.ts`
- `lib/lineage-59/living-memory-book-data.ts`
- `lib/lineage-59/selection-authority.ts`
- `lib/lineage-59/story-transport.ts`
- `lib/lineage-59/branch-authority.ts`
- `lib/lineage-59/page-physics.ts`
- `lib/lineage-59/edit-authority.ts`
- `app/design-lab/lineages/59/v5/page.tsx`
- `app/design-lab/lineages/59/v5/LivingMemoryBookV5.tsx`
- `app/styles/lineage-59-living-memory-book.css`
- `public/design-lab-assets/lineages/59/v5/media/*` (demo placeholder media)
- `tests/lineage-59-*.test.mjs` (7 files)
- `qa/evidence/lineage-59/*.png` (3 screenshots)

## Git / main state

- Worktree: `/root/lovetree-lineage59-com1` (WSL ext4).
- Branch: `feat/161-lineage59-v5-native`.
- Base: fresh `origin/main` `994db2b5a029738e2d90500e833aa3752690e5de`.
- ahead/behind at validation: 0 / 0 (main did not advance).
- Normal commits only; no rebase/reset/amend/force/history rewrite.

## Remaining gaps / notes

- Exact V5 binary assets were not pinnable in this environment (Drive download blocked); native media binding remains HOLD with placeholder media.
- Full `npm test` (build-gated) and full production build were deferred per same-machine resource sharing; scope-relevant typecheck/lint/pure/browser evidence is complete.
- Final flags: `CANONICAL_ADOPTION=NO`, `BACKEND_MUTATION=NONE`, `PRODUCTION_MUTATION=NONE`, `READY=NO`, `MERGE=NO`, `READY_FOR_WEB_CTO_REAUDIT=YES`.

---

# COM2_237_LINEAGE59_V5_BOUNDED_CORRECTION_ADDENDUM

Date: 2026-08-16
COM2 bounded correction lane for PR #237 (`fix/237-lineage59-v5-bounded-corrections`, worktree `/root/lovetree-lineage59-com2-correction`).
COM1 26-file slice preserved; only the Web-CTO-confirmed blockers were corrected.

## Corrections shipped

1. **Branch connection lookup (P0-A)** — `BranchChoice.connectionId` now resolves through a
   Connection-id authority (`connectionById`); WHY NEXT prose uses the separate `fromId`-keyed
   authority (`connectionByFromMoment`). `resolveBranchChoices` drops any choice whose connection
   does not originate at the declared Branch Moment, so an empty `continuationMomentId` can never be
   produced. A pure `validateBranchTopology` guards the real Lineage 59 declaration in tests.

2. **Branch topology truth (P0-B)** — the alternate connection now originates at the declared Branch
   Moment (`br-m59-004 → br-m59-006`) instead of at `br-m59-005`. Both choices are truthful outgoing
   continuations: Choice A → `br-m59-005`, Choice B → `br-m59-006` (distinct destinations, both on path).
   `BRANCH_MOMENTS` is the full 7-moment path so both continuations continue to later Moments.

3. **Story resume after branch (P0)** — explicit choice → exact selected continuation
   (`selectById`) → `branchState` resolved → landing phase → consume (branch blocking state cleared) →
   Story resumes → next phase/Moment advances. Branch `resolved` no longer parks the Story forever.

4. **Velocity flick (P0)** — `page-physics.ts` now implements signed, direction-aware, smoothed
   velocity tracking (`createFlickTracker`/`trackFlick`), delta-based curl progress, and
   `resolveDragCommit` (progress threshold OR flick). Short fast flicks commit below the threshold;
   slow drags over the same distance cancel. Wired into pointer handlers.

5. **Pointer/touch cancel** — `pointercancel` and lost pointer capture cancel the gesture
   unconditionally (no commit, no selection change) with full tracker/timer cleanup.

6. **Dialog focus lifecycle** — new `lib/lineage-59/focus-authority.ts` + `Lt59Overlay` for
   Index/Edit/Detail/Magnifier/Branch: trigger remember, deterministic focus entry, Tab/Shift+Tab
   containment, background focus-escape recapture, Escape close, trigger/fallback focus restore,
   closed overlays unmount (non-interactive). Branch Escape dismisses without choosing; explicit
   "Choose path" affordance reopens it.

7. **CI/registry coupling** — `tests/design-intake-native-candidate-factory.test.mjs` updated for the
   now-registered Lineage 59 (pre-registration exclusion, fail-closed repeat-scaffold test, CLI
   fixture moved to track-60). A-track browser inventory + server URL updated for the lineage-59
   browser QA file.

## Evidence (browser QA, 11/11 green on dev 3160 and production 3005)

- Choice A lands exactly on `br-m59-005` (index 4), chooser detached, Story resumes and advances to
  `br-m59-006`.
- Choice B lands exactly on `br-m59-006` (index 5), Story resumes and advances to `br-m59-007`.
- Branch Escape dismisses without choice; selection unchanged; "Choose path" reopens.
- Short fast flick (same short distance as slow) commits page 2; slow drag cancels (curl reset,
  page unchanged); pointercancel mid-drag never commits and never changes selection.
- Index dialog: focus enters, Tab containment, background focus recapture, Escape, trigger restore.
- Viewports 1280x800 / 390x844 / 320x720: zero horizontal overflow, zero console/page errors.
- Reduced-motion semantic parity retained.

## Pure tests

Lineage 59 pure corpus expanded to 79 passing (branch topology/flick/focus additions);
full non-browser standard corpus 1327/1327 pass; typecheck 0 errors; lint 0 errors;
`npm run build` passes; `git diff --check` clean.

## Media / provenance truth

`SOURCE_HTML_FINGERPRINT=VERIFIED` (manifest-pinned bytes 17,192,064 / SHA256 `763f8a2f...`).
`SOURCE_EMBEDDED_MEDIA_BYTES=RECOVERABLE/PINNABLE` per Web CTO; sibling Drive is not publicly
readable from this environment, so byte re-verification remains pinned evidence, not a fresh download.
`ORIGIN_RIGHTS_PROVENANCE=HOLD`, `NATIVE_MEDIA_BINDING=HOLD` — placeholder demo media only; no
canonical asset adoption.

## Disposition

`CODE_CONCEPT=KEEP`, `BRANCH_DESTINATION_AUTHORITY=PASS`, `BRANCH_STORY_RESUME=PASS`,
`VELOCITY_FLICK_FIDELITY=PASS`, `POINTER_CANCEL_LIFECYCLE=PASS`, `DIALOG_FOCUS_LIFECYCLE=PASS`,
`MAIN_ALIGNMENT=PASS`, `CANONICAL_ADOPTION=NO`, `BACKEND_MUTATION=NONE`, `PRODUCTION_MUTATION=NONE`,
`READY=NO`, `MERGE=NO`, `READY_FOR_WEB_CTO_REAUDIT=YES`.
