# LoveTree V4 Four Pending Source Baseline Audit

Marker: `FOUR_SOURCE_BASELINE_AUDIT_READY`

Starting SHA: `f1ae41d5ca8d3d2c4a6d87d784eb0f3988cfe262`
Branch: `feat/v4-port-four-recovered-sources`
Date: 2026-08-03

---

## Scope

This document records the current V4 implementation baseline for four screens whose original HTML source files have not yet been acquired from computer 1. No source-faithful claims, implementation counts, design verdicts, or port completion statements are made.

---

## 1. rest-return-flow

### A. Route
`/v4/trees/demo/rest`

### B. Component
`app/components/v4/V4RestFlow.tsx` (default export)

### C. CSS file and key classes
- `app/styles/v4/lifecycle.css`
- Key classes: `.v4-lifecycle-page`, `.v4-lifecycle-page.is-resting`, `.v4-rest-layout`, `.v4-rest-scene`, `.v4-rest-journal`, `.v4-rest-heading`, `.v4-rest-eyebrow`, `.v4-rest-tree`, `.v4-rest-leaf`, `.v4-rest-memory`, `.v4-rest-ground`, `.v4-rest-caption`, `.v4-rest-choice-grid`, `.v4-rest-choice`, `.v4-rest-icon`, `.v4-preserved-strip`, `.v4-life-toast`

### D. Current layout
Two-column grid (`v4-rest-layout`): left scene area (SVG tree + memory cards + leaves), right journal panel (status choice, notes, preserved strip, actions). On ≤940px the grid collapses to single column.

### E. Current color·typo·background
- Paper: `#f6f0e8` with radial gradients and linear-gradient background
- Resting mode shifts background to cooler tones (`#eeeae4`, `#f6f3ed`, `#e9e6df`)
- Display font: `Gowun Batang`, serif
- Body font: `Gowun Dodum`, sans-serif
- Ink: `#403737`, muted: `#8f827d`, rose: `#b96572`, sage: `#7f9273`
- Status tag: `#526346` on `rgba(255,252,247,.72)`

### F. Current buttons·tabs·modals
- Two choice buttons ("계속 자라기" / "잠시 쉬기") with `is-selected` toggle
- Two textareas (rest note, return note) with character counters
- Primary action button saves state; secondary "지금 다시 돌아오기" appears only when resting
- Toast notification (2200ms auto-dismiss)
- No tabs or modals in this screen

### G. State transitions
- `active` ↔ `resting` via button clicks
- `save()` persists `{status, note, returnNote}` to `localStorage` and shows toast
- `is-resting` class toggled on `.v4-lifecycle-page` to shift background
- Leaf opacity reduces when resting (`0.58 + (index % 3) * 0.08` vs `0.86`)

### H. localStorage key
`lovetree-v4-rest-state` — stores `{status, note, returnNote}`

### I. drag/pan/zoom/fullscreen
None. This screen has no drag, pan, zoom, or fullscreen behavior.

### J. Mobile structure
- ≤940px: grid collapses to single column, scene and journal stack vertically
- ≤620px: header becomes 2-column, brand centered; choice grid stacks; actions stretch full-width; scene/journal padding reduces
- `prefers-reduced-motion` disables all transitions/animations

### K. Current strengths to preserve
- Clear visual distinction between active and resting states via background shift and leaf opacity
- Memory cards preserved in SVG scene with date/title
- Preserved strip communicates what is retained during rest
- Non-destructive toggle: switching status does not delete any data
- Toast provides clear feedback on state change

### L. Items to compare once original is acquired
- Original HTML structure vs current SVG tree + memory card layout
- Original CSS variables and color palette vs current lifecycle.css variables
- Original background treatment vs current radial-gradient + is-resting shift
- Original button/tab design vs current choice grid
- Original state transition animation vs current CSS transition on filter/background
- Original mobile layout vs current responsive breakpoints
- Original localStorage shape vs current `{status, note, returnNote}`

---

## 2. tree-pause-issue-state

### A. Route
`/v4/trees/demo/state`

### B. Component
`app/components/v4/V4TreeState.tsx` (default export)

### C. CSS file and key classes
- `app/styles/v4/lifecycle.css`
- Key classes: `.v4-state-hero`, `.v4-state-grid`, `.v4-state-card`, `.v4-state-card-head`, `.v4-state-number`, `.v4-state-options`, `.v4-state-option`, `.v4-state-option.is-selected`, `.v4-state-card.is-issue`, `.v4-state-card.is-private`, `.v4-issue-timeline`, `.v4-issue-row`, `.v4-private-note`, `.v4-state-summary`, `.v4-life-actions`, `.v4-preserved-strip`, `.v4-life-toast`

### D. Current layout
Hero section (title + description), then 3-column grid of state cards (tree state, visibility, issue timeline), then 2-column grid (private note + current result summary), then summary bar with actions.

### E. Current color·typo·background
- Same lifecycle.css paper/ink/rose/sage palette as rest screen
- Issue card has warm gradient overlay (`rgba(244,226,225,.75)`)
- Private note card has sage gradient overlay (`rgba(230,237,224,.75)`)
- Status tag: `#526346` on `rgba(255,252,247,.72)`

### F. Current buttons·tabs·modals
- Three option buttons per card (tree state: active/resting/archived; visibility: private/link/public)
- Issue timeline with 3 hardcoded issue entries (date, title, detail)
- Private note textarea
- Summary result display showing current state/visibility labels
- "휴식 흐름 보기" link and "이 설정 저장" primary button
- Toast notification

### G. State transitions
- Tree state, visibility, and private note are independently selectable/editable
- `save()` persists `{treeState, visibility, privateNote}` to `localStorage`
- Toast confirms save with message about independent storage
- State label and visibility label derived from selected IDs

### H. localStorage key
`lovetree-v4-tree-state` — stores `{treeState, visibility, privateNote}`

### I. drag/pan/zoom/fullscreen
None. This screen has no drag, pan, zoom, or fullscreen behavior.

### J. Mobile structure
- ≤940px: state grid collapses to single column
- ≤620px: summary grid collapses to single column; actions stretch full-width
- Same `prefers-reduced-motion` handling as rest screen

### K. Current strengths to preserve
- Clear separation of tree state, visibility scope, and private note as independent concerns
- Issue timeline preserves historical moments without deletion
- Private note is visually and logically separated from public data
- Result summary shows the combined effect of all independent settings
- Non-destructive: no setting deletes data from other settings

### L. Items to compare once original is acquired
- Original HTML structure vs current card-grid layout
- Original CSS variables and color palette vs current lifecycle.css
- Original issue timeline design vs current hardcoded timeline
- Original state option styling vs current radio-style buttons with `is-selected`
- Original mobile layout vs current responsive breakpoints
- Original localStorage shape vs current `{treeState, visibility, privateNote}`

---

## 3. 300-plus-freegraph (300 이후 자유 성장)

### A. Route
`/v4/trees/demo/growth/300-plus`

### B. Component
`app/components/v4/V4MilestoneExperiences.tsx` — export `V4Growth300Plus`

### C. CSS file and key classes
- `app/styles/v4/milestone.css`
- Key classes: `.v4-plus-page`, `.v4-plus-top`, `.v4-plus-marker`, `.v4-plus-stage`, `.v4-plus-canvas`, `.v4-plus-edge`, `.v4-plus-node`, `.v4-plus-node.is-new`, `.v4-plus-minimap`, `.v4-plus-dot`, `.v4-plus-dot.is-new`, `.v4-plus-controls`, `.v4-plus-drawer`, `.v4-plus-field`, `.v4-plus-field input`, `.v4-plus-field textarea`

### D. Current layout
Full-viewport milestone page with header (breadcrumb, title, milestone markers 300/500/750/1000, zoom controls, add button), main stage (SVG tree with draggable nodes + pan/zoom canvas), fixed minimap (bottom-right), fixed controls bar (bottom-left), and slide-out drawer for adding new moments.

### E. Current color·typo·background
- Milestone page palette: `--m-paper: #fffdf9`, `--m-ink: #403536`, `--m-rose: #d27381`, `--m-rose2: #a55060`, `--m-sage: #7e9473`, `--m-violet: #936fc0`
- Background: linear-gradient with radial accents
- Node background: `rgba(255,253,249,.95)` with shadow
- New nodes (≥301) highlighted with rose border and glow
- Font: `Gowun Dodum` sans-serif, `Gowun Batang` serif for display

### F. Current buttons·tabs·modals
- Zoom controls (− / + / fit)
- "전체 맞춤" button
- "+ 순간 추가" button opens drawer
- Drawer: title input, note textarea, submit button, close button
- Node dragging via pointer events
- Canvas panning via pointer events
- Minimap shows all node positions

### G. State transitions
- Nodes are draggable within canvas bounds
- New nodes are added at parent position + offset
- Zoom range: 0.45–1.2
- Pan offset tracked and applied via CSS transform
- Drawer opens/closes without losing state
- 300+ nodes marked with `is-new` class

### H. localStorage key
None currently. The 300+ screen does not persist state to localStorage.

### I. drag/pan/zoom/fullscreen
- **Drag**: Individual nodes can be dragged via `onPointerDown`/`onPointerMove`/`onPointerUp` on each node button
- **Pan**: Canvas can be panned via `onPointerDown`/`onPointerMove`/`onPointerUp` on the stage
- **Zoom**: Zoom controls (− / + / fit) apply CSS `scale()` transform on canvas
- **Fullscreen**: Not implemented

### J. Mobile structure
- ≤1000px: no specific milestone.css changes for plus page
- ≤700px: plus-top wraps, plus-marker hidden, plus-minimap reduced to 130×90px
- `touch-action: none` on stage for touch pan/drag
- Drawer width uses `calc(100% - 36px)` for mobile

### K. Current strengths to preserve
- Free-form node placement with drag interaction
- Pan/zoom canvas for navigating large node graphs
- Minimap for overview of all nodes
- Visual distinction between original (≤300) and new (≥301) nodes
- Drawer-based add workflow keeps the canvas clean
- SVG tree edges connecting parent-child nodes

### L. Items to compare once original is acquired
- Original HTML structure vs current SVG tree + draggable node buttons
- Original CSS variables and color palette vs current milestone.css
- Original node rendering and connection lines vs current SVG edges
- Original drag/pan/zoom behavior vs current pointer event implementation
- Original minimap design vs current fixed-position minimap
- Original add-node workflow vs current drawer approach
- Original localStorage usage (none currently) vs original HTML's persistence
- Original mobile layout vs current responsive breakpoints

---

## 4. season-archive

### A. Route
`/v4/trees/demo/seasons`

### B. Component
`app/components/v4/V4MilestoneExperiences.tsx` — export `V4SeasonArchive`

### C. CSS file and key classes
- `app/styles/v4/milestone.css` (seasons section, lines 43+)
- Key classes: `.v4-season-page`, `.v4-season-app`, `.v4-season-top`, `.v4-season-hero`, `.v4-season-timeline`, `.v4-season-tab`, `.v4-season-layout`, `.v4-season-archive`, `.v4-season-cover`, `.v4-season-ribbon`, `.v4-season-cover-copy`, `.v4-season-tree`, `.v4-season-node`, `.v4-season-footer`, `.v4-season-stat`, `.v4-season-form`, `.v4-season-field`, `.v4-representative-grid`, `.v4-representative`

### D. Current layout
Two-column layout: left archive section (cover with SVG tree + nodes + footer stats), right form section (create new season form). Top: header with breadcrumb, title, season count badge. Below header: tab timeline for switching between seasons.

### E. Current color·typo·background
- Same milestone.css palette as 300+ screen
- Season cover uses dynamic CSS variables (`--season-color`, `--season-soft`) per theme
- Themes: rose (#c86e79), sage (#718767), violet (#8d70b4), gold (#bd945c)
- Background: radial gradients + linear-gradient warm paper
- Ribbon: rotated badge on cover showing ARCHIVED/ACTIVE status

### F. Current buttons·tabs·modals
- Season tab buttons (horizontal scrollable timeline)
- Theme selector (dropdown with 4 options)
- Representative memory connection buttons (3 choices)
- "기존 기록을 보존하고 다음 시즌 시작" primary button
- Form fields: name, start date, sentence, theme, representative
- Archive cover shows season stats (moments, branches, status)

### G. State transitions
- Season tabs switch between archived/active seasons
- Creating a new season archives the current active one
- Theme changes update cover color and tree stroke color
- Form inputs update local state; submit creates new season entry
- No localStorage persistence currently

### H. localStorage key
None currently. The season archive screen does not persist state to localStorage.

### I. drag/pan/zoom/fullscreen
None. This screen has no drag, pan, zoom, or fullscreen behavior.

### J. Mobile structure
- ≤1000px: season layout collapses to single column; bloom-detail border removed
- ≤700px: season-top wraps, season-hero stacks, representative-grid becomes single column
- Season tabs remain horizontal scrollable

### K. Current strengths to preserve
- Clear visual distinction between archived and active seasons
- Theme system with color-coded covers and tree strokes
- Ribbon badge for season status (ARCHIVED/ACTIVE)
- Preservation of previous season data when creating new season
- Summary stats (moments, branches, status) on archive cover
- Form for creating new seasons with validation (name, date, sentence, theme, representative)

### L. Items to compare once original is acquired
- Original HTML structure vs current two-column archive+form layout
- Original CSS variables and color palette vs current milestone.css seasons section
- Original season cover design vs current dynamic CSS variable cover
- Original tab timeline vs current flex scrollable tabs
- Original theme selector vs current select dropdown
- Original mobile layout vs current responsive breakpoints
- Original localStorage usage (none currently) vs original HTML's persistence
- Original season creation workflow vs current form-based approach

---

## 5. Cross-Screen Summary

### Shared CSS files
- `app/styles/v4/lifecycle.css` — used by rest and state screens
- `app/styles/v4/milestone.css` — used by 300-plus and season screens

### Shared patterns across all 4 screens
- All use `v4-lifecycle-page` or `v4-milestone-page` as root class
- All use `Gowun Batang` for display and `Gowun Dodum` for body
- All have responsive breakpoints at 940px and 620px (lifecycle) or 1000px and 700px (milestone)
- All support `prefers-reduced-motion`
- All use CSS custom properties for theming
- All have toast notification pattern (lifecycle.css)
- All use `box-sizing: border-box` reset

### localStorage usage
- Rest flow: `lovetree-v4-rest-state` — `{status, note, returnNote}`
- Tree state: `lovetree-v4-tree-state` — `{treeState, visibility, privateNote}`
- 300-plus: none
- Season archive: none

### Interaction patterns
- Rest: button toggle + textareas + toast
- State: button toggle (2 groups) + textarea + link + toast
- 300-plus: pointer drag/pan/zoom + drawer form
- Season: tab switching + form + dropdown + buttons

---

## 6. V4 Code Unmodified Confirmation

As of this audit, no V4 component or CSS files have been modified. The following files were read-only during this process:

- `app/components/v4/V4RestFlow.tsx`
- `app/components/v4/V4TreeState.tsx`
- `app/components/v4/V4MilestoneExperiences.tsx`
- `app/styles/v4/lifecycle.css`
- `app/styles/v4/milestone.css`
- `app/v4/trees/demo/rest/page.tsx`
- `app/v4/trees/demo/state/page.tsx`
- `app/v4/trees/demo/growth/300-plus/page.tsx`
- `app/v4/trees/demo/seasons/page.tsx`

---

## 7. PR #31 and Deployment Status

- PR #31 has not been modified
- No production, staging, or preview deployments have been changed
- No Cloudflare configuration has been modified
- No V1/V2/V3 files have been touched
- No push to `feat/v4-source-faithful-integration` has been made

---

## 8. SOURCE_COMMIT_SHA Status

Waiting for `SOURCE_COMMIT_SHA` from computer 1 (branch `chore/v4-add-four-missing-source-html`).

Once received, the following will proceed:
1. `git fetch origin --prune`
2. `git cherry-pick "$SOURCE_COMMIT_SHA"`
3. Full comparison of 4 original HTML files against current V4 implementations
4. Component/CSS modifications based on comparison results
5. Test validation and browser interaction verification
