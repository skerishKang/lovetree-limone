# 71_V7_FINAL_NOTES_R2.2

## Status

- Track: `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`
- Revision: `V7 R2.2 / REFERENCE-STYLE INTERACTION EXPANSION`
- Execution owner: LoveTree 디자인팀장 21기
- R2 / R2.1 are preserved; R2.2 is a separate candidate.
- No Production deployment / main merge.

## Product-owner correction implemented

R2.2 adds four interactions requested after reviewing the reference video:

1. Mouse/pointer vertical drag to move the right optical scene up/down.
2. User-selectable WHITE / BLACK background states.
3. Left copy types in like a typewriter on entry.
4. Clicking a Jelly Lens turns it to a front-facing state before navigating to an existing LoveTree template.

## Drag behavior

- Drag anywhere on the scene except the theme controls / CTA.
- Vertical drag changes the shared scene offset, including giant typography and all six lenses.
- Range: approximately `-300px ~ +300px` in the 1448×937 design coordinate system.
- A movement threshold distinguishes drag from click, so a drag over a lens does not accidentally open a template.
- Mouse wheel and Arrow Up / Arrow Down also move the scene as secondary controls.
- Left LoveTree / copy / CTA remain fixed while the optical scene moves.

## WHITE / BLACK theme

Top-right control:

- `WHITE`
- `BLACK`

The switch updates:

- paper background
- giant typography
- left UI
- CTA inversion
- lens keyword color
- neutral lens edge/reflection treatment

R2.1's correction remains: no blue/orange/red chromatic caustic lines are used.

## Typewriter copy

Text:

`Moments that moved your heart,`
`connected into the path`
`that made you a fan.`

- Starts after a short entry delay.
- Variable per-character timing gives a typed feel.
- A caret blinks while typing and disappears at completion.
- `prefers-reduced-motion` shows the complete copy immediately.

## Lens click -> face front -> template

A short click activates a lens.

Transition sequence:

1. local hover tilt is released
2. `rotateX/rotateY` response eases toward zero
3. lens base Z tilt eases toward zero
4. lens scales to approximately 1.075
5. status pill shows destination
6. short white/black theme-aware fade
7. `location.href = new URL(relativePath, location.href)`

The face-front interpolation is runtime state, not a pre-rendered asset.

## Existing LoveTree template routes

R2.2 uses existing project templates, not invented routes.

| Lens | Destination |
|---|---|
| FIRST | `65_입덕단서_시네마틱에디토리얼/.../★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html` |
| MOMENTS | `67_메모리테이프_인터랙티브롤/track67_v2.4.2_works_compare_menu.html` |
| CONNECTION | `68_인물감정경로_모션아카이브/V6_CODEX_PORTALS/68_V3.3_COMPARE_LAUNCHER.html` |
| REPLAY | `14_러브트리_로테이팅메모리인덱스_V1/최종본.html` |
| MY TREE | `15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html` |
| RETURN | `70_모먼트리빌_퓨처에디토리얼/선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html` |

The `MY TREE` circular CTA uses the same Biosphere destination as the `MY TREE` lens.

## QA

Chromium runtime checks:

- initial theme = WHITE
- BLACK selection updates runtime theme state
- vertical drag produced approximately `-261px` scene movement in test
- after hover, CONNECTION retains live local orientation response
- activation test: CONNECTION face interpolation reached about `0.96 / 1.00` after ~0.42s
- QA route resolved to `CONNECTION · MOTION ARCHIVE`
- mobile 390×844 horizontal overflow = `0`
- typewriter completes full three-line copy
- no blue/orange/red caustic line code remains

QA mode for non-navigating checks:

- set `window.__LOVE_TREE_QA__ = true` before activation
- the front-facing animation runs, but navigation is suppressed and the lens returns to runtime state

## Deliverables

1. `71_V7_FINAL_INTERACTIVE_R2.2.html`
2. `71_V7_FINAL_INTERACTION_EVIDENCE_R2.2.mp4`
3. `71_V7_FINAL_STATIC_SCREEN_R2.2.png`
4. `71_V7_FINAL_NOTES_R2.2.md`

## Review state

SUBMITTED AS PRODUCT-OWNER INTERACTION CORRECTION CANDIDATE.
No self-declared product-owner PASS.
