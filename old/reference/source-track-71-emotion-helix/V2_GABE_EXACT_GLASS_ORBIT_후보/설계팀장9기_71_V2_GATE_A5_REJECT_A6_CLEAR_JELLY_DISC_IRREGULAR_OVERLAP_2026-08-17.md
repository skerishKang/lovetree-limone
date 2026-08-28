# 설계팀장9기 — Track 71 V2 GATE A5 REJECT / GATE A6 CLEAR JELLY DISC · IRREGULAR OVERLAP 정밀교정 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**현재 판정:** `GATE A5 = REJECT`  
**다음 단계:** `GATE A6 — CLEAR JELLY DISC / IRREGULAR OVERLAP STATIC FIDELITY`  
**GATE B/C:** 계속 금지  
**이 문서가 Track 71 V2의 최신 MASTER다.**

---

# 0. A5 판정

A5는 이전 A1~A4와 달리 오브젝트 정의 자체는 올바른 방향으로 전환했다.

확인된 개선:

- `torus / ring / annulus / inner hole / donut / ribbon / helix` 폐기
- 중앙 cutout 제거
- filled blob 사용
- 실제 background sampling 유지
- center refraction 존재
- edge refraction 강화
- local dark reflection / chromatic caustic 존재
- 6개 독립 instance 사용

그러나 **실제 최종 렌더는 Reference fidelity 미달**이다.

A5 Shape Proof와 전체 비교본에서 candidate는:

> **투명 젤리 렌즈가 아니라 흰색 반투명 타원 캡슐 / 흰 소시지 모양 6개**

처럼 보인다.

Reference는:

> **거의 무색·투명한 젤리/유리 덩어리가 서로 다른 크기와 각도로 겹치며, 뒤의 검정 글자가 렌즈 전체에서 크게 휘고, 가장자리 일부에서만 검정/파랑/주황 optical effect가 생기는 형태**

다.

따라서 A5는 PASS하지 않는다.

---

# 1. A5에서 가장 큰 실패 — BODY가 너무 WHITE

A5 shader는 base white mix를 낮췄다고 보고했지만,
실제 화면에서는 object body 대부분이 흰색으로 채워져 보인다.

Shape Proof에서도:

- 중앙이 clear glass로 보이지 않고
- white/gray gradient fill이 먼저 보이며
- 뒤 타이포는 렌즈 일부에서만 보인다.

이는 Reference와 반대다.

## A6 HARD RULE

Jelly body의 70~90%는:

> **“물체 색”이 아니라 “뒤 배경이 굴절되어 보이는 것”**

이어야 한다.

흰색 body fill을 시각적 주효과로 쓰지 않는다.

---

# 2. `SOLID`의 의미를 다시 정확히 정의

`SOLID JELLY LENS`에서 SOLID는:

> 중앙에 구멍이 없다는 뜻

이지

> 불투명하게 흰색으로 채운다는 뜻

이 아니다.

A6에서는:

- shape = solid filled mask
- material = almost clear / colorless

로 이해한다.

---

# 3. A6 목표 형태

A6 object는 다음처럼 보여야 한다.

```text
      거의 보이지 않는 투명 몸체
        _________
     __/         \__
   /                 \
  |  뒤 글자가 휘어짐  |
  |  확대/압축/밀림     |
   \__   optical   __/
      \___________/
       일부 edge만 강함
```

중앙은:

- transparent
- refractive
- slightly magnified
- slightly displaced

가 되어야 한다.

---

# 4. A5의 “가로 캡슐 6개 적층” 폐기

전체 비교본에서 현재 6개가:

- 거의 비슷한 가로 타원
- 거의 비슷한 폭
- 거의 비슷한 Y 간격
- 거의 수평
- 위→아래 규칙적 적층

으로 보인다.

이 때문에 Reference의 organic cluster가 아니라
**stacked pills / UI toggles**처럼 읽힌다.

A6에서는 6개가 각각 전혀 다른 silhouette/rotation을 가진다.

---

# 5. 6개 Shape를 명시적으로 다르게

A6 6개는 다음 family로 고정한다.

## J1 — LARGE OVAL
- 가장 큰 타원
- 약간 좌상단→우하단 tilt
- smooth but asymmetrical

## J2 — WIDE SQUASHED DISC
- 가로형
- 한쪽 edge가 눌린 형태
- J1보다 낮음

## J3 — ROUND BULGED LENS
- 거의 원형
- 한쪽 bulge
- 다른 object보다 두꺼워 보임

## J4 — DIAGONAL OVAL
- 분명한 diagonal rotation
- 중앙 cluster의 방향을 깨는 역할

## J5 — SMALL IRREGULAR BLOB
- 작고 조금 찌그러짐
- 큰 lens 사이에 끼어 있음

## J6 — PARTIAL / CROPPED LENS
- 우측 또는 하단 일부가 viewport 밖으로 잘림
- Reference의 화면 밖 확장감을 만듦

**6개를 같은 ellipse parameter 복사본처럼 만들면 FAIL.**

---

# 6. Rotation 범위

A5처럼 대부분 수평 금지.

A6에서 시각적으로:

- 2개: 약한 tilt `±5~12°`
- 2개: 중간 tilt `±15~28°`
- 1개: 강한 tilt `±30~45°`
- 1개: 거의 horizontal

정도로 섞는다.

정확한 값은 Reference를 보고 조정.

---

# 7. Overlap이 있어야 한다

A5에서는 white gap을 너무 강조해
각 object가 따로 떠 있는 캡슐처럼 보인다.

Reference에서는 object들이:

- 일부 겹치고
- 앞뒤가 생기고
- 하나가 다른 것을 부분적으로 가린다.

A6:

- 6개 중 최소 4개는 다른 jelly와 overlap
- 15~35% 정도의 partial overlap
- 완전히 분리된 card stack 금지

---

# 8. Depth / Front-Back

단순 2D overlay라도 z-order를 의도적으로 구성한다.

예:

```text
Back: J1
Mid-back: J2
Mid: J3
Front: J4
Mid-front: J5
Front partial: J6
```

중첩부에서:

- highlight
- dark optical line
- background refraction

이 달라져야 한다.

---

# 9. WHITE MIX 대폭 축소

현재 shader의 white body mix를 더 줄인다.

A6 원칙:

### Center
white mix 거의 0.

### Mid body
0~1.5% 수준.

### Edge
필요한 곳에서만 local white specular.

즉:

`body is white`가 아니라  
`edge catches white light`

이어야 한다.

---

# 10. Neutral Rim 전체 적용 금지

A5 코드에서 edge에 neutral/dark rim이 넓게 적용되어
흰 capsule outline처럼 보이는 부분이 있다.

A6에서는:

- 전체 perimeter rim 금지
- edge의 20~35% 구간만 strong
- 나머지는 거의 invisible

Reference처럼 물체 외곽선이 중간중간 사라져야 한다.

---

# 11. Background Typography가 더 많이 보여야 한다

A5 전체 비교에서 lens 내부가 white fill 때문에
`PATH / MOMENT / MEMORY / LOVE`가 지나치게 사라진다.

A6 HARD RULE:

렌즈 중앙의 큰 면적에서
뒤 black typography가 **계속 보여야 한다.**

단 원래 위치 그대로가 아니라:

- bend
- stretch
- compress
- magnify
- slight RGB separation

되어야 한다.

---

# 12. Center Refraction 강도 증가

A5 center refraction은 존재하지만
정지화면에서는 체감이 약하다.

A6에서는 중앙에서도:

- 약 2~6px equivalent displacement
- mild local magnification
- local shear

를 준다.

edge는 그보다 강하게.

즉 center가 단순 투명창처럼 보이지 않는다.

---

# 13. Lens Magnification

Reference 일부 glass 안에서는
뒤 글자가 단순 이동뿐 아니라 크게 늘어나거나 눌린다.

A6에서는 각 lens마다:

- `magnifyX`
- `magnifyY`
- `shear`
- `offset`

을 다르게 가진다.

예:
- J1: x magnification
- J2: y compression
- J3: center bulge magnification
- J4: diagonal shear

모든 lens가 같은 굴절식을 공유하지 않는다.

---

# 14. Dark Reflection

A5 local dark reflection 방향은 유지.

단 더 Reference처럼:

- 얇은 검정 선이 아니라
- 일부 edge에서 깊게 잠기는 black liquid patch
- object overlap 지점에서 dark optical depth

로 보이게 한다.

각 lens 1~2곳만.

---

# 15. Chromatic Caustic

A5 방향 유지.

그러나 Reference처럼 국소성 강화:

- blue hotspot
- amber/orange burn
- tiny red edge

각 lens 1~3곳.

전체 outline 금지.

---

# 16. Surface Keyword — A6에서는 더 작게

A5 전체 비교에서:

- FIRST
- MOMENTS
- CONNECTION
- REPLAY
- MY TREE
- RETURN

이 일부 너무 작거나 왜곡되어
물체 형태 확인을 방해한다.

A6에서는:

- shape fidelity가 1순위
- keyword는 2순위

권장:
- J1/J2/J3에만 먼저 3개 keyword
- 나머지 3개는 A6에서 생략 가능

Reference의 글자 크기와 placement를 맞추는 것이 우선.

---

# 17. 좌측 레이아웃

좌측 구조는 유지한다.

단 참고화면에서 로고가 serif `GABE`처럼 보여도,
LoveTree에 한국어가 들어갈 경우 명조 금지.

현재 영문 `LoveTree` serif 사용은 이번 Gate의 핵심 병목이 아니므로
유지 가능하지만,
한국어가 추가되면 sans-only.

---

# 18. 가장 중요한 시각적 체크

A6 후보를 25%로 축소했을 때:

### FAIL
`흰색 캡슐 6개가 쌓여 있다`

### PASS
`투명한 젤리/유리 덩어리들이 글자를 휘게 하면서 우측에서 겹쳐 떠 있다`

이 차이가 가장 중요하다.

---

# 19. 구현 기술 우선순위

이번에도 기술 순수성보다 visual fidelity가 우선이다.

## 허용
- WebGL
- SVG filter
- CSS/SVG hybrid
- precomputed displacement map
- 2.5D compositing

## 금지
- 실제 3D라는 이유로 Reference보다 못생긴 결과 유지
- shader 복잡도 자체를 성과로 주장
- 물리 정확성을 이유로 white body를 유지

---

# 20. A6 Shape Proof 방식 변경

A5 Shape Proof도 Reference와 candidate scale/shape 차이가 너무 컸다.

A6에서는 3개 candidate를 임의로 보여주지 말고
**Reference crop 바로 옆에 1:1 pair**로 놓는다.

파일:

`71_V2_GATE_A6_JELLY_PAIR_PROOF.png`

구성:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

각 pair 동일 bounding box 크기.

---

# 21. A6에서 비교해야 할 항목

Pair별:

1. silhouette
2. tilt
3. body transparency
4. visible background typography
5. refraction
6. edge highlight
7. dark reflection
8. caustic

8개를 직접 체크.

---

# 22. 전체 화면 제출물

필수:

1. `71_V2_GATE_A6_JELLY_PAIR_PROOF.png`
2. `71_V2_GATE_A6_REFERENCE_COMPARISON.png`
3. `71_V2_GATE_A6.html`
4. `71_V2_GATE_A6_NOTES.md`

---

# 23. A6 PASS 기준

## PASS 1 — NO WHITE CAPSULE
흰 타원 캡슐처럼 보이지 않는다.

## PASS 2 — CLEAR BODY
body 대부분은 실제 background를 보여준다.

## PASS 3 — IRREGULARITY
6개 silhouette가 서로 다르다.

## PASS 4 — ROTATION VARIETY
6개가 모두 수평이 아니다.

## PASS 5 — OVERLAP
여러 lens가 자연스럽게 겹친다.

## PASS 6 — BACKGROUND TYPE
black giant type가 lens 내부에서 충분히 보인다.

## PASS 7 — REFRACTION
center와 edge 모두에서 실제 왜곡이 체감된다.

## PASS 8 — REFERENCE FAMILY
나란히 놓으면 Reference의 투명 jelly object family로 즉시 읽힌다.

---

# 24. Gate 상태

```text
GATE A1 = REJECT
GATE A2 = REJECT
GATE A3 = REJECT
GATE A4 = REJECT
GATE A5 = REJECT
GATE A6 = REQUIRED

GATE B = HOLD
GATE C = HOLD
```

---

# 25. 최종 지시

A5에서 “구멍 없는 solid shape”는 맞췄다.

하지만 다음 단계는:

> **solid shape를 흰색으로 보이게 하는 것이 아니라, 거의 투명하게 만들고 서로 다른 방향으로 겹쳐 놓는 것**

이다.

이번에는 다시 새로운 3D 아이디어를 발명하지 않는다.

**Reference처럼 투명하고, 뒤 글자가 보이고, 불규칙하고, 겹치고, 일부 edge만 강하게 빛나는 Jelly Lens를 만든다.**

A6 승인 전 GATE B/C 진행 금지.
