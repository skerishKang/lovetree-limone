# 설계팀장9기 — Track 71 V2 GATE A4 REJECT / GATE A5 SOLID JELLY LENS 긴급 재정의 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 폴더:** `V2_GABE_EXACT_GLASS_ORBIT_후보`  
**현재 판정:** `GATE A4 = REJECT`  
**다음 단계:** `GATE A5 — SOLID JELLY LENS / TRANSPARENT GLASS BLOB STATIC FIDELITY`  
**GATE B/C:** 계속 금지  
**이 문서가 Track 71 V2의 최신 MASTER다.**

---

# 0. 제품오너 최신 정정 — 최우선

지금까지 참고영상의 우측 투명 오브젝트를 `ring / loop / annulus / torus`로 해석한 것이 잘못이었다.

이번 A5부터 오브젝트 정의를 완전히 바꾼다.

> **참고영상의 우측 물체는 구멍이 뚫린 링이 아니다.**
>
> **속이 꽉 찬 투명한 원형·타원형 Jelly Lens / Glass Blob이다.**

가장자리에서 굴절·반사·색 번짐이 강하게 보여
테두리가 있는 링처럼 착시가 날 뿐이다.

중앙은 비어 있는 hole이 아니라 **투명한 유리 면**이다.

따라서 기존 ring 계열 geometry를 계속 개선하지 않는다.

---

# 1. A4 판정

`GATE A4 = REJECT`

A4는 A3보다 다음을 개선했다.

- broad white ribbon 제거
- global helix 제거
- 6개 독립 object 분리
- white gap 확보
- base alpha 감소
- actual background refraction 유지
- local reflection/caustic 적용

그러나 근본적으로 각 object가 여전히:

- ring
- annulus
- inner hole
- donut
- band

개념으로 구성돼 있다.

이는 제품오너가 지적한 참고영상의 실제 형태와 다르다.

A4 파일은 **FAILURE COMPARISON ONLY**로 보존한다.

A4를 직접 수정해서 ring을 조금 더 두껍게/얇게 만드는 식의 작업 금지.

---

# 2. A5에서 금지되는 개념

A5부터 아래 용어와 geometry를 모두 금지한다.

- `torus`
- `ring`
- `annulus`
- `inner radius`
- `inner hole`
- `donut`
- `band`
- `ribbon`
- `helix`
- `loop with hole`

코드에 위 개념이 핵심 geometry로 남아 있으면 FAIL.

---

# 3. 새 공식 오브젝트 정의

공식 명칭:

## `SOLID JELLY LENS`

또는

## `TRANSPARENT GLASS BLOB`

형태:

- 속이 꽉 찬 투명 원판
- 약간 찌그러진 원 / 타원
- 매우 매끄러운 표면
- 젤리처럼 약간 부풀어 보임
- 중심은 투명
- 가장자리만 두께감이 강함
- 뒤의 검정 타이포가 내부에서 휘어 보임

사용자가 처음 봤을 때:

> “투명한 젤리 원이 떠 있다”

라고 느껴야 한다.

> “유리 링이 떠 있다”

라고 느끼면 FAIL.

---

# 4. A5의 가장 쉬운 구현 방식을 우선

이번 Gate의 목적은 고급 3D 기술 증명이 아니다.

**Reference와 최대한 똑같이 보이는 정지 화면**이 목적이다.

따라서 복잡한 3D mesh를 만들 필요 없다.

## 1순위 권장 — 2.5D WebGL Plane + Blob Mask

각 Jelly Object는:

1. rectangle plane
2. 원/타원/비대칭 blob SDF mask
3. 내부 transparent fill
4. background texture refraction
5. edge thickness
6. local highlight
7. local dark reflection
8. local blue/orange/red caustic

로 만든다.

즉:

```text
Plane
 └─ Solid Blob Mask
      ├─ Clear center
      ├─ Refracted background
      ├─ Thick optical edge
      ├─ White specular
      ├─ Local dark reflection
      └─ Local chromatic caustic
```

---

# 5. 3D가 꼭 필요한 경우에도 “Solid Disc” 기반

WebGL mesh를 쓰더라도:

- flat/convex lens
- rounded disc
- pillowy ellipse
- inflated blob

형태를 사용한다.

구멍을 뚫지 않는다.

권장 단면:

```text
          ___
      ___/   \___
    /             \
   |   clear lens  |
    \___       ___/
        \_____/
```

중앙은 투명한 면이다.

---

# 6. Blob Shape 규칙

각 오브젝트는 완전한 정원이 아니라
약간씩 다르게 찌그러진다.

예:

- 원형
- 가로로 늘어난 타원
- 세로로 눌린 타원
- 한쪽이 볼록한 blob
- 살짝 비틀린 oval
- 한 부분이 눌린 jelly disc

하지만 모두:

> **solid filled transparent lens**

여야 한다.

---

# 7. 개수

Reference 기준:

**5~6개**

권장 6개.

각 object는 별도 instance.

서로 겹칠 수 있으나
중심과 bounding box는 독립적이어야 한다.

---

# 8. 배치

참고영상처럼 우측에 세로로 군집한다.

예시 방향:

1. 상단 큰 lens
2. 상단-중단 작은 lens
3. 중앙 lens
4. 중앙-하단 lens
5. 하단 lens
6. 우측 하단 partial lens

정확한 위치는 Reference 18초 frame을 직접 trace해 결정한다.

---

# 9. 크기

Reference에 맞춰:

- Large lens: 화면 폭 약 20~27%
- Medium lens: 16~23%
- Small lens: 12~18%

한 오브젝트가 우측 전체를 덮지 않게 한다.

---

# 10. Solid Center — 가장 중요한 HARD RULE

A5 object 중심은:

- hole 아님
- transparent empty cutout 아님
- background가 그냥 뚫려 보이는 공간 아님

**유리를 통과해서 보이는 투명 면**이다.

따라서 중심에서도:

- 약한 refraction
- 약한 magnification
- subtle distortion
- slight specular

이 존재해야 한다.

---

# 11. Edge

가장자리에서만 물체가 더 강하게 보인다.

### 필수

- 두꺼운 optical edge
- white highlight
- dark reflective patch
- local blue
- local amber/orange
- tiny red

단 전체 둘레 RGB outline 금지.

---

# 12. Refraction

참고영상의 핵심은 뒤의 giant typography가
Jelly Lens 안에서 실제로 휘는 것이다.

A5에서는 background type를 실제 texture로 샘플링한다.

중앙:
- 약한 확대/압축

가장자리:
- 더 강한 displacement

bulge:
- local distortion

예:

```glsl
vec2 offset = normal.xy * strength;
vec3 refracted = texture(background, uv + offset).rgb;
```

구현 방식은 자유다.

핵심:

> 실제 뒤 글자가 lens를 통과하면서 휘어야 한다.

---

# 13. Alpha / Transparency

A5 base body는 clear.

권장 개념:

- center face alpha: 0.03~0.12
- edge: 0.20~0.55
- specular hotspot: additive
- dark reflection: local

전체 object를 `opacity: 0.5` 같은 단순 투명 div로 만드는 것도 금지.

---

# 14. Video Under Jelly — 아직 구현하지 말 것

제품오너가 제안한 최종 구조는 유효하다.

향후 GATE C 후보:

```text
[ Actual Moment Video ]
          +
[ Transparent Jelly Lens ]
```

또는:

```text
[ Video Texture inside Jelly ]
```

하지만 A5에서는 영상 재생 기능을 구현하지 않는다.

먼저:

> **젤리 렌즈 자체를 Reference와 똑같이 보이게 하는 것**

만 한다.

---

# 15. Keyword

Reference의:

- Home
- Projects
- About
- Contact

위치/크기/경사감을 참고한다.

LoveTree 치환:

- MOMENTS
- CONNECTION
- REPLAY
- MY TREE
- RETURN
- FIRST

중 5~6개 사용.

---

# 16. Keyword Placement

키워드는 Jelly Lens에 붙어 있는 느낌이어야 한다.

하지만 이번 A5에서는 복잡한 UV mapping 때문에
shape fidelity가 무너진다면 우선순위를 낮춘다.

우선순위:

1. Jelly shape
2. transparency
3. refraction
4. position
5. keyword

필요하면 A5 정지 화면에서는
DOM/SVG text를 perspective transform해서
Jelly 위에 정확히 배치해도 된다.

**기술 순수성보다 visual fidelity가 우선이다.**

---

# 17. 좌측 / 중앙 레이아웃 LOCK

A5에서 아래는 다시 디자인하지 않는다.

## 좌측 상단
`LoveTree`

## 좌측 중간
짧은 설명문

## 좌측 하단
검정 원형 CTA

## 중앙
초대형 흑백 영문 타이포

## 우측
Solid Jelly Lens 5~6개

이 구조를 유지한다.

---

# 18. 중앙 Giant Typography

Reference처럼:

- 매우 큰 black letters
- 일부 crop
- Jelly 뒤
- Jelly 사이
- Jelly 내부 refraction

세 상태가 모두 보여야 한다.

LoveTree 후보:

- PATH
- MOMENT
- MEMORY
- LOVE
- TREE

기존 배치는 필요 시 미세 조정 가능.

---

# 19. 한국어 타이포 공통 규칙

LoveTree 최신 공통 규칙:

> **한국어 명조체 / Serif 금지**

A5에 한국어가 들어갈 경우:

```css
font-family:
  Pretendard,
  "Noto Sans KR",
  SUIT,
  "Apple SD Gothic Neo",
  "Malgun Gothic",
  sans-serif;
```

사용.

영문 장식 타이포만 필요 시 serif 가능.

---

# 20. A5에서 절대 하지 말 것

1. 또 ring 만들기
2. donut 만들기
3. 중앙에 hole 만들기
4. torus extrusion
5. annular band
6. ribbon
7. helix
8. 3D 기술 과시
9. 복잡한 physics
10. motion 먼저 만들기
11. video 먼저 넣기
12. click viewer 먼저 만들기

---

# 21. GATE A5 제출 절차

이번에는 HTML부터 완성하지 않는다.

## Step 1 — Shape Proof

`71_V2_GATE_A5_JELLY_SHAPE_PROOF.png`

내용:

- Reference object 3개 crop
- Candidate Jelly Lens 3개
- 흰 배경
- black typography 일부 뒤에 배치

검증:

- hole 0개
- solid center
- clear lens
- edge optical effect

---

## Step 2 — Full Static Screen

Shape Proof가 자체 검수 PASS일 때만:

`71_V2_GATE_A5_REFERENCE_COMPARISON.png`

제작.

좌:
Reference 18s

우:
Candidate

---

# 22. 제출물

필수 4종:

1. `71_V2_GATE_A5_JELLY_SHAPE_PROOF.png`
2. `71_V2_GATE_A5_REFERENCE_COMPARISON.png`
3. `71_V2_GATE_A5.html`
4. `71_V2_GATE_A5_NOTES.md`

---

# 23. A5 PASS 기준

## PASS 1 — NO HOLE

6개 object 모두 중앙이 뚫리지 않는다.

## PASS 2 — Solid Jelly

각 object가:

> 투명한 원형/타원형 젤리 덩어리

로 보인다.

## PASS 3 — Clear Center

중앙에서도 background가 lens를 통해 왜곡되어 보인다.

## PASS 4 — Optical Edge

가장자리에서만:

- white highlight
- dark reflection
- blue/orange/red caustic

이 강해진다.

## PASS 5 — Independent Blob

5~6개가 독립적으로 보인다.

## PASS 6 — Reference Composition

좌상단 logo / 좌중단 copy / 좌하단 CTA / 중앙 giant type / 우측 jelly cluster 구조가 Reference와 가깝다.

## PASS 7 — Immediate Recognition

Reference와 나란히 놓았을 때:

> “같은 투명 젤리 원형 오브젝트다.”

라는 인상이 1초 안에 와야 한다.

---

# 24. 이후 Gate 방향 — 아직 실행 금지

A5 PASS 후에만 GATE B.

## GATE B
- idle floating
- slight jelly deformation
- cursor parallax
- light/dark state

## GATE C
- video under jelly
- click
- video viewer
- ESC return

A5 승인 전 금지.

---

# 25. 판정 기록

- `GATE A1 = REJECT`
- `GATE A2 = REJECT`
- `GATE A3 = REJECT`
- `GATE A4 = REJECT`
- `GATE A5 = REQUIRED`
- `GATE B/C = NOT STARTED`

이번 실패의 원인은 기술 난이도가 아니다.

> **Reference object를 처음부터 ring으로 잘못 정의한 설계 문제다.**

A5에서는 복잡하게 만들지 않는다.

> **원/타원 Jelly Lens를 만들고, 투명하게 하고, 뒤 글자를 굴절시키고, 가장자리에만 광학 효과를 넣는다.**

이것만 정확히 한다.

**새로운 콘셉트 발명 금지. Reference 최대한 그대로 재현.**
