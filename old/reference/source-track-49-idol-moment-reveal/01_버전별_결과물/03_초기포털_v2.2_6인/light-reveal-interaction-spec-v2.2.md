# LoveTree 49 · V2.2 Light Reveal Interaction Spec

## Desktop pointer reveal
Hero Stage 안에서 포인터 좌표를 4개 의미 영역으로 해석한다.

- upper-left → Stage
- upper-right → Smile
- lower-left → Backstage
- lower-right → Walking

포인터 주변에는 hard clip circle이 아니라 feathered elliptical light mask가 생성된다.
그 mask 안에서 현재 main Hero 위/주변으로 `same cast / different Moment` 이미지가 드러난다.

### 함께 변하는 항목
- Reveal image
- reveal glow center
- 활성 Moment Portal halo
- 우측 Moment copy
- Connection Preview의 THIS/NEXT Moment

### 금지
- face material / acrylic patch
- polygon mask
- 얼굴 deformation
- HUD/network line

## Small Moment Portal
Portal hover 또는 click/tap 시 해당 Moment를 즉시 reveal한다.

## Hero state navigation
- Previous / Next arrow
- Keyboard ArrowLeft / ArrowRight
- Mobile horizontal swipe
- 6-state indicator dots

강제 자동재생은 사용하지 않는다.

## Mobile
- Main Hero는 자연스러운 cutout 유지
- Portal 4개를 더 작은 원형으로 재배치
- tap으로 reveal
- swipe로 H1~H6 state 이동
- pointer-only 기능에 의존하지 않음

## Reduced motion
`prefers-reduced-motion: reduce`에서 CSS transition/animation을 최소화하고 travelling light/star animation을 숨긴다.
