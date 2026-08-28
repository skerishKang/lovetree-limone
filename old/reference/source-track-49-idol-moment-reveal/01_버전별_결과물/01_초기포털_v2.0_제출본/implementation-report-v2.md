# LoveTree 49 · Moment Reveal Portal V2 구현 보고서

## 상태
- `PASS_CANDIDATE_PENDING_PRODUCT_OWNER_VISUAL_REVIEW`
- V1 보존. overwrite 없음.
- Production 반영 없음.

## V2 핵심 변경
V1의 얼굴 위 acrylic / metallic / chromatic ornament 방식은 전면 제거했다. V2 Hero는 하나의 editorial Moment를 기본 상태로 두고, pointer 또는 tap으로 같은 가상 캐스트의 Stage / Smile / Backstage / Walking Moment가 실제 사진 창 안에서 열린다.

## Hero / Reveal
- warm ivory editorial composition 유지
- 대형 3/4 portrait + oversized grotesk headline
- desktop: pointer-follow Moment Reveal Window
- mobile: tap 또는 4개 moment selector
- reveal content는 사진 Moment이며 얼굴 위 polygon/patch/clip-path 없음
- Hero와 reveal은 한 synthetic identity source sheet를 기준으로 함

## Product flow
`Hero Moment → Reveal another Moment → Follow this moment → Landscape Moment Field → Connection Preview → Tree Overview → Save Moment`

Connection Preview는 원/선 그래프 대신 `THIS MOMENT → emotional cause → NEXT MOMENT`의 실제 콘텐츠 이동으로 구성했다.

## Moment Field / Tree
- 실제 raster day/night landscape 재사용
- 6개 mixed-cast prototype Moment cards
- Day/Night에서 card DOM/position 변화 없음
- Tree metrics = mock arrays에서 계산: Moments 6 / Connections 6 / Routes 3
- Tree UI는 scenery 우선 thin glass panels

## Save
- What moved you? / Person-Work / Visibility
- localStorage demo
- Save 후 `Moment saved. Add a connection now?` → Later / Connect

## 검증
- Desktop 1440×900: console/page error 0, horizontal overflow 0, reveal PASS, day/night layout shift 0px, route PASS, save confirmation PASS
- Mobile 390×844: console/page error 0, horizontal overflow 0, tap reveal PASS, day/night layout shift 0px, route PASS, save confirmation PASS
- HTML 외부 http/https dependency 없음
- visible source에서 Neon/HUD/Cockpit/Aircraft 및 acrylic/chromatic/clip-path 없음

## Identity caveat
Hero와 파생 Moment는 동일 synthetic sheet에서 생성·분리한 prototype이다. 시각적으로 같은 캐스트를 의도하고 V2 prototype consistency는 통과했지만, biometric identity verification을 주장하지 않는다. 제품 오너의 시각 검토 전에는 승인 master가 아니다.
