# 설계팀장9기 — Track 71 V2 GATE A6 Pair Proof v2 REJECT / v3 Optical Perimeter·Internal Refraction 정밀교정

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 루트:** `V2_GABE_EXACT_GLASS_ORBIT_후보`

## 현재 판정

```text
GATE A5 = REJECT
GATE A6 = IN PROGRESS

JELLY_PAIR_PROOF_v2 = REJECT
JELLY_PAIR_PROOF_v3 = REQUIRED

FULL STATIC SCREEN = NOT STARTED
GATE B = HOLD
GATE C = HOLD
```

**이 문서가 A6 Pair Proof의 최신 실행지시다.**

---

# 0. v2 실제 화면 판정

v2는 A5보다 다음은 개선됐다.

- white capsule body 대폭 제거
- 중앙 clear 유지
- J1/J2/J3 distortion character 분리 시도
- 내부 typography displacement 증가
- 전체 white/gray fill 재도입 없음

그러나 Reference와 실제 Pair를 나란히 보면 아직 통과할 수 없다.

핵심 실패는 다음이다.

> **투명 body를 없애는 과정에서 Jelly Lens의 광학적 경계와 질량감까지 같이 사라졌다.**

Reference는 투명하더라도:
- lens silhouette가 즉시 보이고
- edge 일부에 강한 black reflection
- blue / amber / orange caustic
- 두꺼운 optical refraction line
- 내부 typography의 확대·압축·휘어짐
이 동시에 존재한다.

v2 Candidate는:
- J1: PATH 글자가 일부 휘지만 lens perimeter가 거의 안 읽힘
- J2: MOMENT 글자 일부가 꺾이지만 “투명 렌즈”보다 단순 distortion mask처럼 보임
- J3: LOVE 아래 희미한 white/gray 흔적만 보여 lens silhouette 인지가 매우 약함

따라서 **v2는 REJECT**한다.

---

# 1. 이번 v3의 핵심 정의

A6 v3의 목표는:

> **CLEAR BODY + STRONG OPTICAL PERIMETER + STRONG INTERNAL REFRACTION**

이다.

중요:

`OPTICAL PERIMETER`는 ring/annulus geometry를 다시 만들라는 뜻이 아니다.

금지 geometry는 그대로 유지:

- torus
- annulus
- donut
- inner hole
- ribbon
- helix

이번 perimeter는 **filled transparent blob의 표면 가장자리에서 발생하는 Fresnel/refraction/reflection 효과**다.

즉:

> 물체 자체는 solid filled transparent lens이고, 가장자리의 광학효과 때문에 silhouette가 읽혀야 한다.

---

# 2. v3에서 반드시 해결할 것

## 문제 A — Silhouette가 너무 안 보임

현재 Candidate는 투명도가 높은 게 문제가 아니라,
**외곽선이 optical object로 읽히지 않는 것**이 문제다.

v3:

- lens perimeter의 약 55~75%는 최소한의 광학 신호가 있어야 함
- 단 전체가 같은 굵기/색의 outline이면 안 됨
- 강한 zone과 거의 사라지는 zone을 섞음

구성:

```text
20~30% = strong optical edge
30~45% = medium/subtle edge
25~40% = nearly invisible
```

정확한 비율은 Reference를 보고 조정.

---

# 3. Reference의 Edge를 그대로 관찰할 것

Reference의 투명 Jelly에는 단순 white highlight가 아니라 다음이 섞여 있다.

1. **dark black reflective edge**
2. **thin bright white specular**
3. **blue electric caustic**
4. **amber/orange hot caustic**
5. **local red accent**
6. **background typography가 edge에서 급격히 휘는 refraction**

v3는 이 6개를 한 edge에 동시에 전부 넣지 않는다.

각 위치마다 1~3개 효과만 조합한다.

---

# 4. White Body는 여전히 금지

v3에서 silhouette를 살린다고 body를 다시 하얗게 만들면 안 된다.

Center:

```text
white body fill = 0 또는 체감상 거의 0
```

Mid body:

```text
background visible = dominant
```

Edge:

```text
specular / reflection / caustic / refraction = strong local zones
```

즉 **몸체색이 아니라 optical boundary로 형상을 보이게 한다.**

---

# 5. J1 v3 지시 — Wide Diagonal Disc

현재 J1은 PATH 일부가 변형되지만 candidate lens의 전체 형태가 거의 안 읽힌다.

v3 J1:

- wide diagonal silhouette를 더 분명하게
- 좌상↔우하 diagonal tilt 유지
- upper-left 또는 lower-right edge에 dark reflection 강한 zone
- 반대편 edge에 blue/amber caustic
- PATH 글자가 lens 중앙을 통과할 때 x축으로 명확히 magnify
- edge 진입/이탈 시 letter stroke가 분명히 꺾여야 함

### J1 PASS 인상

> PATH 위에 투명하고 넓은 대각 glass disc가 실제로 놓여 있다.

---

# 6. J2 v3 지시 — Squashed Lens

현재 J2는 black typography가 꺾이는 것은 보이나,
shape가 lens라기보다 불규칙 mask처럼 느껴진다.

v3 J2:

- squashed oval silhouette를 명확히
- 높이는 낮고 폭은 넓음
- 좌우 edge optical power 강화
- MOMENT typography가 y축으로 압축되는 현상을 더 크게
- center는 clear
- lower edge 한쪽에 dark reflection
- opposite edge에 amber/blue caustic

### J2 PASS 인상

> 눌린 투명 렌즈 때문에 MOMENT가 실제로 압축되고 휘었다.

---

# 7. J3 v3 지시 — Oblique Bulged Lens

J3가 현재 가장 약하다.

v2 J3는 거의 invisible에 가까워 Reference family로 읽히지 않는다.

v3 J3:

- silhouette visibility를 J1/J2보다 20~30% 더 강하게
- oblique rotation 명확하게
- center bulge magnification 가장 강하게
- LOVE stroke 일부가 lens center에서 크게 부풀어 보이게
- 한쪽 edge는 black reflective pool
- 다른 edge는 bright + blue/orange caustic
- lower/side edge가 white blur로만 끝나지 않게 함

### J3 PASS 인상

> 투명한 bulged glass lens가 LOVE를 크게 부풀리고 한쪽으로 휘게 한다.

---

# 8. Typography deformation 최소 체감 기준

숫자는 물리값이 아니라 육안 QA 기준이다.

각 Candidate 내부에서 Reference처럼:

## Center
- 원래 글자 stroke 대비 위치 차이가 명확히 보여야 함
- 단순 1~2px 수준의 미세 displacement 금지
- magnification/compression이 육안으로 보일 것

## Edge
- stroke가 들어갈 때 또는 빠져나갈 때 방향이 확실히 꺾일 것
- local chromatic split 허용
- 원본 글자와 겹쳐 보이는 ghost edge 일부 허용

---

# 9. “Distortion Mask”처럼 보이면 FAIL

v2 J2처럼 글자 일부만 찢어진 듯 보이고
렌즈의 전체 표면이 느껴지지 않으면 FAIL.

렌즈는 반드시:

```text
silhouette
+
internal deformation
+
edge optics
```

세 가지가 동시에 있어야 한다.

---

# 10. Pair Proof 배경 조건

v3도 동일하게:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

유지.

단 Candidate의 giant typography가 lens와 겹치는 영역을 더 충분히 확보한다.

렌즈 대부분이 흰 빈 배경 위에 떠 있으면
refraction을 검증할 수 없으므로 FAIL.

각 lens 면적의 최소 45~60% 정도는 black typography와 실제로 교차하도록 구성한다.

---

# 11. Candidate Typography 위치도 Reference 검증에 맞춰라

현재 v2는 일부 lens가 typography가 없는 흰 영역까지 크게 걸쳐
transparent/refraction 증명이 약하다.

v3:

- J1: PATH 두꺼운 stroke 2~3개 이상과 교차
- J2: MOMENT 2~3 letter stroke와 교차
- J3: LOVE의 최소 2 letter stroke와 교차

이렇게 해야 internal deformation이 명확히 보인다.

---

# 12. Dark Reflection 강도

현재보다 강하게.

단:

- 전체 검정 테두리 금지
- 1~2개 local zone
- Reference처럼 glass 내부로 조금 번지는 black reflective pool 허용

강한 zone은 edge thickness가 실제로 느껴져야 한다.

---

# 13. Caustic 강도

v2는 색 광학효과가 너무 약해 Reference와의 family match가 떨어진다.

v3에서는 색을 조금 더 과감하게 허용.

각 lens:

- blue: 최소 1곳
- amber/orange: 최소 1곳
- red: 선택적 0~1곳

단 색선 전체 outline 금지.

---

# 14. White Specular

thin bright specular는 필요하다.

그러나:

- broad white body 금지
- blur로 넓게 퍼지는 흰 덩어리 금지

Reference처럼 edge 일부에서 날카로운 반사로 사용.

---

# 15. Pair Proof v3 제출 전 자체 체크

각 Candidate에 대해 8항목 모두 YES.

1. lens silhouette를 1초 안에 찾을 수 있는가?
2. body는 여전히 clear한가?
3. black typography가 center에서 확대/압축되는가?
4. edge에서 typography가 더 강하게 꺾이는가?
5. dark reflection zone이 보이는가?
6. blue/amber caustic이 국소적으로 보이는가?
7. J1/J2/J3 shape가 즉시 다르게 읽히는가?
8. Reference와 같은 “transparent optical object family”로 보이는가?

---

# 16. v3 PASS 전 전체 화면 금지

다음은 계속 금지:

- `71_V2_GATE_A6_REFERENCE_COMPARISON.png`
- 6개 전체 Jelly 배치
- 전체 A6 HTML 완성본
- idle motion
- parallax
- video under jelly
- click viewer
- light/dark
- GATE B
- GATE C

---

# 17. v3 제출물

이번 단계에서도 딱 2개만 제출.

1. `71_V2_GATE_A6_JELLY_PAIR_PROOF_v3.png`
2. `71_V2_GATE_A6_PAIR_NOTES_v3.md`

---

# 18. Gate 상태

```text
GATE A1 = REJECT
GATE A2 = REJECT
GATE A3 = REJECT
GATE A4 = REJECT
GATE A5 = REJECT

GATE A6 = IN PROGRESS
PAIR PROOF v1 = REJECT
PAIR PROOF v2 = REJECT
PAIR PROOF v3 = REQUIRED

FULL STATIC SCREEN = NOT STARTED
GATE B = HOLD
GATE C = HOLD
```

---

# 19. 최종 지시

v2에서 transparency 방향은 맞췄다.

이번 v3에서는 투명도를 다시 낮추지 않는다.

대신:

> **렌즈의 존재를 body fill이 아니라, 강한 내부 굴절 + 부분적인 optical perimeter로 증명한다.**

Reference를 보면 투명 object임에도 경계가 사라지지 않는다.

v3 목표는:

> **“거의 투명하지만 분명히 존재하고, 뒤 글자를 강하게 휘게 만드는 젤리 렌즈.”**

Pair Proof v3가 이 수준에 도달하기 전에는 전체 화면으로 넘어가지 않는다.
