# Track 71 V2 — GATE A2 Notes

**Status:** `GATE A2 STATIC SUBMISSION / GATE B-C NOT STARTED`

**Authority:** `설계팀장9기_71_V2_GATE_A1_REJECT_A2_정밀교정지시_2026-08-17.md`

## A1 판정 반영

A1의 레이아웃 방향은 유지하고, A2에서는 지시된 정지화면 범위만 교정했다.

유지:
- 좌상단 작은 LoveTree
- 좌중단 설명 블록
- 좌하단 검정 원형 CTA
- 중앙~우측 초대형 흑백 타이포
- 우측 6개 독립 오브젝트
- white editorial background
- blue/orange chromatic accent

## A2 교정 내용

### 1. Geometry
A1의 circular tube 기반 torus를 제거하고 **broad annular band / flattened inflated loop** geometry로 교체했다.

- 원형 tube cross-section 사용 안 함
- band width : depth 비율을 크게 벌려 납작한 젤리 띠로 보이게 함
- rounded-rectangle 계열 cross-section 사용
- 각 loop마다 부분별 폭 variation과 비대칭 deformation 적용
- shallow depth extrusion 적용

### 2. 두께 / 면적
- A1 대비 실제 glass face area를 약 2배 이상 확대
- 하이라이트가 선이 아니라 넓은 face에서 읽히도록 수정
- 25% 축소 시에도 각 loop가 하나의 덩어리로 읽히도록 조정

### 3. 6개 개체 분리
- 중심 X를 서로 다르게 이동
- Z depth와 tilt를 개별화
- 중단/하단 white negative space 확대
- 하나의 spring/helix로 보이는 연속 정렬을 제거

### 4. Refraction priority
정지 Gate에서 background typography distortion이 먼저 읽히도록 broad annular mask 안에서:
- type 확대/압축
- X displacement
- skew
- contrast increase
을 적용했다.

실제 glass surface는 WebGL2 mesh이며, 정지화면 typography distortion은 CSS annular screen-space proxy를 함께 사용한다. GATE B 이전이므로 motion/refraction animation은 없다.

### 5. Material
- broad white specular highlight 강화
- dark Fresnel/internal reflection 강화
- blue/orange chromatic edge는 보조 수준으로 배치
- 투명 face + dark edge + chromatic split의 순서로 보이게 조정

### 6. Typography spacing
- `MOMENT` / `MEMORY` column gap 확대
- baseline offset 완화
- glass가 없을 때도 letterform을 읽을 수 있도록 중첩 감소
- `PATH` 상단 crop 유지
- 오른쪽 `LOVE` crop 유지

### 7. Left editorial block
- LoveTree brand 크기/무게 증가
- intro width/font size 증가
- CTA 크기 미세 확대

## GATE B/C 금지 상태 확인

A2 HTML에는 다음을 구현하지 않았다.

- idle motion
- cursor parallax
- video-under-glass
- click viewer
- ESC return
- light/dark transition
- menu expansion
- index

WebGL 렌더는 정지 상태이며 resize 외 animation loop가 없다.

## 제출물

- `71_V2_GATE_A2_REFERENCE_COMPARISON.png`
- `71_V2_GATE_A2.html`
- `71_V2_GATE_A2_NOTES.md`

## 현재 판정

`GATE A2 = SUBMITTED FOR REVIEW`

디자인팀 자체 PASS 선언 없음. GATE A2 승인 전 GATE B/C 진입 금지.
