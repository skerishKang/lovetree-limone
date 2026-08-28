# 설계팀장9기 — Track 71 V6 A6 Reference-Match Design-Tool Surface Proof 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**신규 버전 폴더:** `V6_A6_REFERENCE_MATCH_DESIGN_TOOL_SURFACE_PROOF`  
**Drive Folder ID:** `136LYzF0qNWpanbGhLpo4nJGn_dUwT8O7`

---

# 0. 현재 판정

```text
PAIR PROOF v1 = REJECT
PAIR PROOF v2 = REJECT
PAIR PROOF v3 = REJECT
PAIR PROOF v4 = REJECT
PAIR PROOF v5 = REJECT

METHOD v5 = REFERENCE-TRACE OPTICAL MAP
TRACE DIRECTION = PARTIALLY CORRECT
FINAL VISUAL = STILL FAIL

NEXT = V6 DESIGN-TOOL SURFACE PROOF
FULL STATIC SCREEN = NOT STARTED
6-LENS FULL COMPOSITION = NOT STARTED
FULL A6 HTML = NOT STARTED

GATE B = HOLD
GATE C = HOLD
```

---

# 1. v5 판정

v5는 v1~v4보다 방법론은 올바른 방향으로 전환했다.

확인된 개선:

- generic ellipse/blob 방식 중단
- REF 01/02/03을 직접 shape authority로 지정
- silhouette / dark reflection / caustic / deformation field를 trace
- primary + secondary refracted sample로 optical thickness 시도
- J1/J2/J3 별도 trace map 사용

그러나 실제 `JELLY_PAIR_PROOF_v5`는 아직 Reference와 동일 family로 읽히지 않는다.

## J1 문제

- Reference는 두꺼운 glass blob가 글자를 크게 휘게 한다.
- Candidate는 흰 반투명 lens 내부에서 black typography가 잘린 듯 보인다.
- optical edge가 Reference보다 지나치게 얇고 약하다.
- 실제 refraction보다 clipped typography가 먼저 보인다.

## J2 문제

- 가장 강한 distortion이 존재하지만,
- 검정 deformation이 surface refraction보다 black mask처럼 보인다.
- Reference의 clear center / thick edge 구조보다 graphic cut이 먼저 읽힌다.

## J3 문제

- shape는 세 후보 중 상대적으로 안정적.
- 그러나 body가 너무 희고,
- `LOVE` typography는 Reference 수준으로 크게 magnify/shear되지 않는다.
- Reference의 liquid-thickness, black edge reflection, orange/blue edge power가 부족하다.

---

# 2. v6 핵심 전환

이번 V6에서는 더 이상 WebGL shader 수치를 조금씩 바꾸지 않는다.

> **웹 구현 전에 디자인툴에서 “정답처럼 보이는 렌즈” 자체를 먼저 만든다.**

즉:

```text
REFERENCE
↓
DESIGN-TOOL STATIC MATCH
↓
OPTICAL MAP EXPORT
↓
WEB IMPLEMENTATION
```

순서로 바꾼다.

웹 코드는 아직 건드리지 않는다.

---

# 3. 왜 디자인툴 Proof가 먼저인가

현재 v1~v5의 실패는 기술이 부족해서가 아니라:

> **정답 surface를 먼저 확보하지 않은 채 shader를 계속 추정한 것**

이다.

디자인툴에서는:

- silhouette
- highlight
- dark reflection
- chromatic caustic
- magnification
- local warp

를 눈으로 직접 맞출 수 있다.

이번 Gate는 “물리적으로 정확한 shader”가 아니라:

> **Reference와 같은 물체로 보이는지**

만 확인한다.

---

# 4. 사용 가능한 툴

툴은 자유다.

예:

- Photoshop
- After Effects
- Figma
- Affinity Photo
- Blender compositing
- WebGL offscreen render
- 기타 디자인/합성 툴

단 결과는 **정지 비교본**으로 판단한다.

---

# 5. V6에서 웹 구현 금지

이번 V6에서 금지:

- full HTML
- shader integration
- motion
- parallax
- 6-lens layout
- video under jelly
- click interaction
- light/dark
- GATE B/C

오직 디자인툴 Surface Proof.

---

# 6. Reference Match 방식

REF 01 / REF 02 / REF 03 각각에 대해 Candidate를 만든다.

Pair:

```text
REF 01 | DESIGN-TOOL J1
REF 02 | DESIGN-TOOL J2
REF 03 | DESIGN-TOOL J3
```

Candidate typography는:

- `PATH`
- `MOMENT`
- `LOVE`

유지 가능.

단 Reference와 비슷한:

- stroke thickness
- lens overlap amount
- black/white balance

를 맞춘다.

---

# 7. Shape Fidelity

각 Candidate의 outer silhouette는 Reference와 최대한 동일.

HARD RULE:

- bounding box ±3~5%
- rotation ±3~5°
- aspect ratio 육안 동일
- blob bulge 위치 동일
- pinch / flatten / tilt 위치 동일

generic ellipse 금지.

---

# 8. Clear Body

body는:

- almost colorless
- transparent
- background-dominant

해야 한다.

금지:

- broad white fill
- gray/frosted body
- milky capsule
- white jelly mass

---

# 9. Optical Thickness

Reference의 edge 두께감은:

- double refraction
- dark reflective layer
- thin bright specular
- blue/amber chromatic separation

으로 만든다.

흰 outline을 두껍게 그려서 만들지 않는다.

---

# 10. Internal Typography Warp

이번 V6 핵심.

렌즈 안에서 black typography가 분명히:

- magnify
- compress
- shear
- bend
- shift

되어야 한다.

HARD RULE:

> 원래 글자가 거의 그대로 통과하면 FAIL.

특히 J1/J3는 v5보다 center deformation이 훨씬 커야 한다.

---

# 11. No Hard Cut

v5에서 black stroke가 잘린 것처럼 보이는 문제 제거.

금지:

- rectangular clipping
- hard mask edge
- chopped black typography
- sharp polygon cut

허용:

- stretched stroke
- curved distortion
- duplicated refraction
- smooth local discontinuity

---

# 12. Dark Reflection

Reference의 black reflection을 직접 복제.

각 lens:

- 1~3 strong black reflection zone
- surface edge와 연결
- typography와 구별 가능
- black paint처럼 보이지 않게

---

# 13. Blue / Amber / Red Caustic

Reference 위치를 따라간다.

- blue: cold optical hotspot
- amber/orange: warm burn
- red: tiny accent

Random 금지.

---

# 14. Design-Tool Candidate의 목적

이번 후보는 웹에 바로 넣을 최종 asset이 아니다.

목적은:

> **“정답 surface가 어떻게 보여야 하는지”를 고정하는 visual authority**

이다.

즉 디자인팀과 설계팀이 같은 정답 이미지를 보게 만드는 기준선이다.

---

# 15. Map Export

Design-Tool Surface가 PASS할 경우에만 다음 map을 export한다.

각 J1/J2/J3별:

1. `MASK`
2. `DISPLACEMENT`
3. `DARK_REFLECTION`
4. `CAUSTIC_SPECULAR`

권장 파일:

```text
J1_MASK.png
J1_DISPLACEMENT.png
J1_DARK_REFLECTION.png
J1_CAUSTIC.png

J2_...
J3_...
```

---

# 16. DISPLACEMENT MAP

단순 grayscale blur가 아니라
가능하면 방향 정보를 보존한다.

예:

- R = X displacement
- G = Y displacement

또는 별도 X/Y map.

하지만 기술 형식은 이후 Web 단계에서 확정 가능.

이번 V6에서는 시각 정답이 우선.

---

# 17. 제출물

이번 V6 필수 제출물:

1. `71_V6_A6_DESIGN_TOOL_PAIR_PROOF.png`
2. `71_V6_A6_DESIGN_TOOL_SURFACE_NOTES.md`

선택 제출:

3. `71_V6_A6_SURFACE_LAYER_BREAKDOWN.png`

Layer Breakdown에는:

- clear base
- refraction
- dark reflection
- blue/amber/red
- specular

를 분리해 보여준다.

---

# 18. 아직 export map 제출은 필수 아님

Pair Proof PASS 전에는
MASK/DISPLACEMENT map export에 시간을 쓰지 않는다.

먼저 정답처럼 보이는 surface를 확정한다.

---

# 19. PASS 기준

## PASS 1 — Immediate Recognition

1초 안에:

> “Reference와 같은 투명 glass/jelly object”

로 읽힘.

## PASS 2 — Clear Body

milky white body 없음.

## PASS 3 — Optical Mass

얇은 outline이 아니라 두께 있는 투명 물체로 보임.

## PASS 4 — Internal Warp

글자가 lens 내부에서 크게 변형됨.

## PASS 5 — Smooth Refraction

hard clipping 없음.

## PASS 6 — Dark Reflection

Reference 위치/밀도와 유사.

## PASS 7 — Caustic

blue/amber/orange optical accent 유사.

## PASS 8 — Shape

Reference outer silhouette와 유사.

---

# 20. 다음 단계

V6 Design-Tool Pair Proof가 PASS하면 그때:

```text
V7_A6_WEB_IMPLEMENTATION_FROM_APPROVED_SURFACE_MAP
```

신규 폴더를 만든다.

V7에서:

- approved mask
- displacement map
- reflection map
- caustic map

을 WebGL에 적용한다.

즉 **웹은 승인된 디자인 surface를 구현만 한다.**

---

# 21. 최종 지시

v5에서 Reference trace라는 방향은 맞았다.

그러나 trace를 곧바로 shader에 넣는 과정에서
다시 “웹이 만든 비슷한 렌즈”가 되어버렸다.

V6에서는 순서를 바꾼다.

> **먼저 디자인툴에서 Reference와 거의 같은 정답 렌즈를 만든다.**
>
> **그 정답을 승인한 뒤 웹으로 옮긴다.**

이번 V6의 목표는 기술 구현이 아니라
**시각 정답 확보**다.
