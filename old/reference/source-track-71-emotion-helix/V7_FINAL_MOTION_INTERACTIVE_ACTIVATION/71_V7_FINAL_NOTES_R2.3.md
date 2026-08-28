# 71_V7_FINAL_NOTES_R2.3

## Status
- Track: 71_러브트리_감정경로헬릭스_인터랙티브대문_V1
- Revision: V7 R2.3 / ENDLESS REEL + ROUTE FIX
- Owner correction basis: 2026-08-18 uploaded recordings
- R2.2 preserved; no overwrite.

## Product-owner feedback corrected
1. Some Jelly template links did not open.
2. Vertical drag was clamped to ±300px, so the sequence visibly ended.
3. PATH / MOMENT / MEMORY / LOVE existed as one finite set rather than a continuously flowing reel.
4. Jelly sequence likewise stopped instead of continuing through the next set.

## R2.3 interaction model
- Removed the ±300px clamp entirely.
- Added a 940px vertical reel cycle.
- Giant typography is rendered in repeated copies above and below the viewport.
- All six LoveTree lens objects are repeated on the same reel cycle.
- Drag can continue in either direction without reaching a visual end.
- Release preserves inertia and decelerates.
- Mouse wheel adds reel velocity.
- Holding Arrow Up / Arrow Down continuously drives the reel; key release leaves short inertia.
- Left typing animation and WHITE/BLACK theme remain.
- Lens hover tilt / live refraction remains.
- Lens click still faces the lens to the front before route transition.

## Corrected route map
All paths below are resolved from:
03_디자인채택본/71_러브트리_감정경로헬릭스_인터랙티브대문_V1/V7_FINAL_MOTION_INTERACTIVE_ACTIVATION/

- FIRST
  ../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html
- MOMENTS
  ../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/track67_v2.4.2_works_compare_menu.html
- CONNECTION
  ../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V3.3.1_COMPARE_LAUNCHER.html
- REPLAY
  ../../14_러브트리_로테이팅메모리인덱스_V1/최종본.html
- MY TREE
  ../../15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html
- RETURN
  ../../70_모먼트리빌_퓨처에디토리얼/선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html

## QA
Chromium runtime:
- Reel moved beyond 1 full cycle without clamp: viewY ~= 1825.7px
- Reel cycle: 940px
- FIRST lens visible copies after >1 cycle: y ~= 45.7px and 985.7px
- This confirms wrap continuity instead of an empty end zone.
- WHITE / BLACK theme still works.
- QA activation was run for all six route labels; each reached its intended route state.
- No color caustic lines reintroduced.

## Evidence
- 71_V7_FINAL_INTERACTIVE_R2.3.html
- 71_V7_FINAL_ENDLESS_REEL_EVIDENCE_R2.3.mp4
- 71_V7_FINAL_STATIC_SCREEN_R2.3.png

## Review
Candidate only. No self-declared product-owner PASS.
