# Track 70 — Moment Reveal / Future Editorial

STATUS: DESIGN CANDIDATE / NOT OWNER-APPROVED
OWNER: 디자인팀장18기
DATE: 2026-08-17

## Purpose
MotionSites 무료 프롬프트의 원본 디자인 권위를 먼저 보존한 뒤,
같은 구조·리빌 알고리즘·이미지·유체 타이포 시스템을 LoveTree 의미로만 치환하여 비교한다.

## Files
- `70_A_ORIGINAL_LGPSM_PROMPT_REPLICA.html`
  - 원문 LGPSM 무료 프롬프트의 기준선 재현 후보.
  - 패션 카피, SHOP/COLLECTIONS/JOURNAL/CART 구조 유지.
- `70_B_LOVETREE_MOMENT_REVEAL.html`
  - 같은 구조·이미지·마우스 mask reveal을 LoveTree Moment/Path/Journal/My Tree로 치환.
  - 여자 얼굴을 없애지 않고 `첫 인상 ↔ 감정이 바뀐 뒤의 잔상`으로 해석.
- `70_COMPARE.html`
  - A/B 동시 iframe 비교 및 단독 전환.

## Locked comparison rules
1. A는 LoveTree 문구를 섞지 않는다.
2. B는 A의 흰색/검정/회색 미학과 portrait reveal을 유지한다.
3. B에 꽃·크림·핑크·literal tree를 추가하지 않는다.
4. 기존 Track68 파일은 수정하지 않는다.
5. 이 Track70은 별도 후보이며 승인본이 아니다.

## LoveTree semantic substitution
- SHOP → MOMENTS
- COLLECTIONS → PATHS
- JOURNAL → JOURNAL
- CART → MY TREE
- ADD → PLANT
- FUTURE FORWARD FASHION → MOMENTS BECOME PATHS
- BEYOND TRENDS. BUILT FOR TOMORROW. → A MOMENT MOVES. A PATH REMAINS.

## Runtime notes
- desktop: two supplied portrait images + offscreen-canvas radial mask reveal
- mouse smoothing: 0.1
- radius: clamp(160px, 16vw, 420px)
- grid parallax easing: 0.06
- mobile: static BG1
- Escape/backdrop close supported
- reduced-motion fallback supported

## Next review
제품 오너가 A/B를 직접 비교한 뒤,
B의 LoveTree 치환 강도와 portrait 유지 여부를 판단한다.
