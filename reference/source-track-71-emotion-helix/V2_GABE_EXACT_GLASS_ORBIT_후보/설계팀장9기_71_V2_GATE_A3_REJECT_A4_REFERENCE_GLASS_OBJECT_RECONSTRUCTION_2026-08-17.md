# 설계팀장9기 — Track 71 V2 GATE A3 REJECT / A4 Reference-Faithful Glass Object Reconstruction

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 폴더:** `V2_GABE_EXACT_GLASS_ORBIT_후보`  
**현재 판정:** `GATE A3 = REJECT`  
**다음 단계:** `GATE A4 — REFERENCE-FAITHFUL GLASS OBJECT RECONSTRUCTION`  
**GATE B/C:** 계속 금지  
**이 문서가 Track 71 V2의 최신 MASTER다.**

---

# 0. 판정 요약

A3에서 코드상으로는 다음을 구현했다.

- 실제 background texture sampling
- RGB refraction offset
- dark internal reflection
- local chromatic caustic
- mesh UV keyword texture

그러나 **최종 판정 기준은 코드가 아니라 실제 렌더 결과**다.

A3 비교본에서 candidate는 Reference와 달리:

- clear glass가 아니라 **거대한 흰색/반투명 ribbon**
- 6개 독립 object가 아니라 **하나의 연속된 spiral/helix**
- 얇고 투명한 liquid lens가 아니라 **넓은 white band**
- 글자가 glass에 붙은 것보다 **큰 리본 위에 인쇄된 텍스트**
- black type를 비틀어 보여주는 렌즈보다 **배경을 덮는 조형물**

로 읽힌다.

따라서 A3는 FAIL이다.

---

# 1. A2 LOCK 해제

A3 지시에서는 A2 geometry를 LOCK했으나,
실제 A3 render에서 그 geometry가 Reference와 다른 최종 silhouette를 만든 것이 확인됐다.

따라서 다음 LOCK을 해제한다.

- 6-object scale
- band width
- band depth
- local placement
- object rotation
- object silhouette

유지 LOCK:

- 좌측 LoveTree
- 좌측 설명 block
- 좌측 원형 CTA
- white editorial background
- 중앙/우측 giant black typography의 기본 방향
- Reference B 18.0s를 primary comparison frame으로 사용

---

# 2. 가장 중요한 수정 — “Broad Ribbon”을 버려라

현재 `broad annular band / flattened inflated loop`가 너무 넓다.

Reference의 object는 넓은 리본이 화면을 덮는 형태가 아니다.

Reference는:

> **각각 독립된 투명 glass ring / inflated lens / warped loop가 서로 겹쳐 떠 있는 군집**

이다.

A4에서는 각 object를 다시 개별 단위로 보이게 한다.

### 금지

- 화면 폭 35~45%를 차지하는 거대한 white band
- 한 object가 다음 object에 시각적으로 이어지는 spiral
- helix처럼 위→아래 하나의 ribbon path로 읽히는 구조
- face area를 white fill로 보여주는 방식

---

# 3. Reference Silhouette 기준

Reference 18초 frame을 다시 보고 각 object의 silhouette를 직접 trace한다.

A4에서는 최소 5개, 권장 6개 object를 사용한다.

각 object는:

- 서로 다른 중심 X
- 서로 다른 중심 Y
- 서로 다른 장축/단축
- 서로 다른 tilt
- 서로 다른 inner-hole 크기
- 서로 다른 twist

를 가진다.

하지만 **각 object의 전체 bounding box가 명확히 분리**되어야 한다.

### HARD GATE

25% 축소했을 때도:

`O O O O O`

처럼 여러 개 object로 읽혀야 한다.

`~~~~~`

같은 하나의 ribbon/coil로 읽히면 FAIL.

---

# 4. Object 크기를 줄여라

A3 candidate의 각 band가 너무 크다.

Reference에서는 개별 object가 크더라도
우측 영역 안에서 서로 구별된다.

A4 권장:

- 가장 큰 object width: 화면 전체의 약 20~26%
- 일반 object width: 약 16~22%
- height: 약 10~18%
- 일부 overlap 허용
- overlap은 전체 면적의 20~35% 정도
- object 사이 white gap을 반드시 남김

정밀 픽셀 수치가 아니라 reference silhouette discipline용 기준이다.

---

# 5. 실제 Clear Glass Alpha 수정

A3 fragment shader는 `alpha`를 대략 `0.90~0.985`로 두고 있다.

이는 이름과 달리 **거의 불투명**이다.

A4에서 clear glass face는:

- white background 위: 거의 invisible
- black typography 위: refraction으로 존재
- edge/specular에서 존재

해야 한다.

### 권장 alpha 개념

- base face alpha: `0.04 ~ 0.16`
- Fresnel edge: `0.30 ~ 0.65`
- specular hotspot: 별도 additive
- dark reflection: local only

정확한 값은 shader에 맞춰 조정하되,
**전체 면을 0.9 이상 alpha로 두는 방식 금지.**

---

# 6. Background Sampling은 유지하되 “glass가 배경을 덮지 않게”

A3의 실제 background texture sampling 방향은 맞다.

이를 유지하되:

- background sample 자체를 glass base color로 거의 그대로 사용
- white additive 최소화
- broad specular는 매우 국소화
- glass body는 거의 무색
- black type가 있는 곳에서만 distortion이 강하게 드러나게 한다

Reference에서 glass는 “흰 물체”가 아니라
**배경을 뒤틀어 존재하는 물체**다.

---

# 7. Refraction Strength는 위치별로 다르게

A3처럼 전체 면에 같은 강도로 offset을 적용하면
넓은 ribbon 전체가 graphic처럼 변한다.

A4에서는 curvature/thickness에 따라:

- 중앙 flat area: 약한 refraction
- inner rim: 강한 refraction
- outer rim: 중간 refraction
- local bulge: 강한 refraction

을 준다.

즉 glass object 안에서도 optical power가 다르게 보이게 한다.

---

# 8. Dark Reflection은 더 Reference처럼 “덩어리”로

Reference에는 black edge가 line으로 둘러진 게 아니라
일부 지점에서 검은 물방울/반사 덩어리처럼 나타난다.

A4:

- 각 object 1~3곳
- local black reflection blob
- curved elongated dark patch
- inner rim black sink

허용.

단 전체 outline 금지.

---

# 9. Chromatic Caustic 위치를 Reference에 맞춰 수동 배치

A3에서 procedural hotspot을 넣었지만
실제 화면에서는 일부 색이 여전히 ribbon edge decoration처럼 보인다.

A4에서는 각 object별로 Reference를 보고
blue/orange/red hotspot 위치를 **수동 seed/anchor**한다.

예:

Object 1:
- upper-left blue
- lower-right orange

Object 2:
- left blue
- lower edge amber

Object 3:
- right orange
- inner rim blue

처럼 object별 optical signature를 만든다.

---

# 10. Keyword는 surface에 남기되 크기 축소

A3의 surface-bound keyword 접근은 방향이 맞다.

그러나 현재 candidate에서는 keyword가 너무 크고
리본의 연속성을 더 강조한다.

A4:

- Reference의 `Home / Projects / About / Contact` 크기 비례에 맞춤
- object마다 하나의 keyword
- 글자 높이는 object 높이의 약 18~32%
- text baseline이 object curvature를 따라감
- 일부는 edge 뒤로 가려짐
- 일부는 refraction에 의해 부분 왜곡

### LoveTree keyword 후보

- `MOMENTS`
- `CONNECTION`
- `REPLAY`
- `MY TREE`
- `RETURN`

`FIRST MOMENT`는 길어 Reference 비율을 깨면
`FIRST` 또는 `FIRST MOMENT` 중 더 자연스러운 것을 선택한다.

---

# 11. Giant Typography는 object 사이로 보여야 한다

A3 candidate는 white ribbon이 너무 넓어
background typography를 크게 가린다.

Reference에서는 giant black type가:

- glass 뒤
- glass 사이
- glass 안 굴절

세 상태로 동시에 보인다.

A4 HARD RULE:

첫 화면에서 giant typography의 black 면적이
glass 때문에 50% 이상 사라져 보이지 않게 한다.

glass cluster 사이에
white/black negative space가 충분히 남아야 한다.

---

# 12. Object별 독립 Transform

A4에서 각 object는 별도 mesh instance로 관리한다.

각각:

```js
{
  x,
  y,
  z,
  scaleX,
  scaleY,
  rotX,
  rotY,
  rotZ,
  innerRadius,
  widthProfile,
  bulgeProfile,
  refractionStrength,
  darkHotspots,
  chromaticHotspots,
  keyword
}
```

를 가진다.

전역 helix phase나 연속 path 개념 금지.

---

# 13. Reference Trace Board 제출

A4에서는 HTML 전에
간단한 silhouette trace board도 함께 만든다.

`71_V2_GATE_A4_OBJECT_TRACE_BOARD.png`

내용:

- 왼쪽: Reference 18s crop
- 가운데: Reference object 1~6 outline 표시
- 오른쪽: Candidate object 1~6 outline

목적:

**shader 이전에 silhouette가 맞는지 검증.**

---

# 14. A4에서도 기능 금지

계속 금지:

- idle motion
- parallax
- video under glass
- click viewer
- ESC
- light/dark
- menu/index
- auto rotation

A4는 여전히 STATIC Gate다.

---

# 15. A4 제출물

1. `71_V2_GATE_A4_OBJECT_TRACE_BOARD.png`
2. `71_V2_GATE_A4_REFERENCE_COMPARISON.png`
3. `71_V2_GATE_A4.html`
4. `71_V2_GATE_A4_NOTES.md`

---

# 16. A4 PASS 기준

## PASS 1 — Independent Objects
25% 축소해도 5~6개의 독립 glass object로 보인다.

## PASS 2 — Clear Glass
흰 배경 위에서 body가 거의 투명하다.

## PASS 3 — Typography Visibility
거대 black type가 object 사이로 충분히 보인다.

## PASS 4 — Refraction
black type가 glass 내부에서 실제로 휘고 확대/압축된다.

## PASS 5 — No White Ribbon
전체 화면을 덮는 흰 ribbon/spiral 느낌이 없다.

## PASS 6 — Surface Keyword
각 object에 keyword 하나가 표면에 자연스럽게 붙는다.

## PASS 7 — Reference Recognition
Reference와 나란히 보면
“같은 구성의 glass-object editorial page를 LoveTree로 치환했다”
는 인상이 먼저 온다.

---

# 17. 판정 기록

- `GATE A1 = REJECT`
- `GATE A2 = REJECT`
- `GATE A3 = REJECT`
- `GATE B/C = NOT STARTED`

A3에서 확인된 사실:

- real background sampling 구현 자체는 유효
- UV keyword binding 접근도 유효
- 그러나 final visual silhouette/material 결과는 Reference fidelity 미달

따라서 A4에서는
**A3 shader 자산 중 유효한 부분은 재사용하되, object scale/silhouette/alpha를 Reference 기준으로 다시 맞춘다.**

이번 A4의 목적은 기술적으로 더 복잡하게 만드는 것이 아니다.

> **Reference에서 보이는 물체와 같은 크기·투명도·분리감으로 보이게 만드는 것.**

A4 승인 전 GATE B/C로 넘어가지 않는다.
