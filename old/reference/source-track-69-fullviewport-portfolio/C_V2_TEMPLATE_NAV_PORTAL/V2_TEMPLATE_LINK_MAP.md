# Track 69 V2 Template Navigation Map

STATUS: design-review candidate
BASE: `B_lovetree_adapted.html`
PURPOSE: Track 69 full-viewport MotionSites composition을 유지하면서 모든 메뉴/CTA를 실제 LoveTree HTML에 연결한다.

## Top desktop + mobile navigation

| Label | Track | Relative target |
|---|---:|---|
| CINEMATIC | 65 | `../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html` |
| FIRST TREE | 66 | `../../66_첫트리만들기_인터랙티브스크롤가이드/버전1.2_제품목적·실제Moment체험강화_후보/현재후보.html` |
| MEMORY TAPE | 67 | `../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/lovetree-memory-tape-v2.4.2-persistent-world.html` |
| MOTION ARCHIVE | 68 | `../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V7_portal_launcher.html` |
| DISCOVERY | 12 | `../../12_글로벌디스커버리_탐색홈/01_글로벌디스커버리_탐색홈.html` |
| WORKS | — | opens Track 69 WORKS overlay/dialog |

## Hero / footer CTA mapping

- `PLAY MEMORY PATH` → Track 68 V7 portal launcher
- `DISCOVER 01` → Track 65 cinematic clue
- `CONNECT 02` → Track 66 first-tree flow
- `REPLAY 03` → Track 68 motion archive
- `Plant a moment` → Track 66 first-tree flow
- LoveTree logo → reload current Track 69 portal

## WORKS overlay

Behavior follows the interaction pattern used by Track 67 V2.4.2:

- modal dialog overlay
- close button
- backdrop click closes
- Escape closes
- focus returns to previous opener
- hover/focus updates selected-work preview metadata
- each work opens in a new tab so Track 69 remains available for comparison

Rows:

- 69 FULL VIEWPORT PORTAL — current
- 65 CINEMATIC CLUE
- 66 FIRST TREE
- 67 MEMORY TAPE
- 68 MOTION ARCHIVE
- 12 GLOBAL DISCOVERY
- 23 LIVING MEMORY GRAPH (Track 67 WORKS copy)
- 13 MEMORY ATLAS (Track 67 WORKS copy)
- 62 MEMORY SCULPTURE (Track 67 WORKS copy)

## Path rule

This HTML must remain directly inside:

`03_디자인채택본/69_풀뷰포트폴리오_러브트리모션랜딩/C_V2_TEMPLATE_NAV_PORTAL/`

The `../../` targets depend on that depth. Moving the HTML deeper requires path updates.
