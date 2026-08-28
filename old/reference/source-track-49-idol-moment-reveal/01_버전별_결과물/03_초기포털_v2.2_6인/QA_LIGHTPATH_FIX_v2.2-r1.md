# LoveTree 49 · V2.2 R1 Light Path QA Fix

## 발견
초기 V2.2 Contact Sheet에서 Light Path가 SVG `<use>` 요소에 glow stroke가 적용되지 않아 검은 선처럼 렌더링되는 시각 결함을 확인했다.

## 수정 범위
- `.trails use`에 `fill:none`
- thin `stroke: var(--accent2)`
- state accent 기반 soft glow
- 기존 dash animation 유지

## 변경하지 않은 것
- 6 Hero state mapping
- 3 cast
- Main Hero position / crop
- Moment Portal 배치
- pointer reveal architecture
- Moment Field
- Connection Preview
- Tree
- Save
- mobile layout

초기 V2.2 파일은 Drive에서 overwrite하지 않고 보존한다.
R1을 제품 오너 시각검토용 최종 후보로 사용한다.
