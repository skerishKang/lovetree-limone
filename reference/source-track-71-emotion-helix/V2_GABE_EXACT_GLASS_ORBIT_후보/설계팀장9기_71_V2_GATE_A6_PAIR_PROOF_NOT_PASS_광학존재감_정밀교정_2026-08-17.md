# 설계팀장9기 — Track 71 V2 GATE A6 JELLY_PAIR_PROOF 미통과 / 광학 존재감 정밀교정 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 폴더:** `V2_GABE_EXACT_GLASS_ORBIT_후보`

**현재 상태**
- `GATE A5 = REJECT`
- `GATE A6 = IN PROGRESS`
- `JELLY_PAIR_PROOF = NOT YET PASS`
- `FULL STATIC SCREEN = NOT STARTED`
- `GATE B = HOLD`
- `GATE C = HOLD`

**이 문서가 A6 Pair Proof 수정의 최신 실행지시다.**

---

# 0. 현재 판정

현재 Pair Proof는 A5보다 방향은 개선됐지만 아직 PASS가 아니다.

현재 문제는:

> 흰 캡슐 느낌은 줄었지만, 반대로 Jelly Lens 자체의 광학적 존재감이 너무 약하다.

Reference처럼 보이려면 투명 body 자체는 거의 무색으로 유지하면서도,
뒤의 giant typography가 렌즈 안에서:

- 확대되고
- 압축되고
- 휘고
- 밀리고
- 일부 shear되고
- edge에서 더 강하게 꺾이는

현상이 즉각적으로 보여야 한다.

이번 수정은 **Pair Proof 내부에서만 수행**한다.

---

# 1. 전체 화면으로 넘어가지 말 것

아직 금지:

- `71_V2_GATE_A6_REFERENCE_COMPARISON.png`
- 6개 전체 배치
- 전체 A6 HTML 완성
- motion
- parallax
- video under jelly
- click viewer
- light/dark
- GATE B
- GATE C

현재 허용되는 산출물은:

`71_V2_GATE_A6_JELLY_PAIR_PROOF.png`

의 수정본뿐이다.

---

# 2. 중앙은 계속 CLEAR 유지

이번 수정에서 가장 조심할 부분이다.

광학 존재감을 키운다고:

- white fill 추가
- gray body 추가
- frosted glass 추가
- broad glow 추가

하지 않는다.

중앙 body는 계속:

- 거의 무색
- 투명
- background-visible

이어야 한다.

강화할 것은 **색/불투명도**가 아니라 **왜곡량**이다.

---

# 3. J1 / J2 / J3를 서로 다른 Optical Character로 고정

세 렌즈가 같은 shader preset을 공유하면 안 된다.

각각 아래처럼 다르게 만든다.

---

## J1 — WIDE DIAGONAL DISC

**목표**
Reference의 넓고 대각선으로 눕는 렌즈 느낌.

### Optical Character
- `magnifyX` 강함
- `magnifyY` 약함
- diagonal shear 중간
- center displacement 중간
- edge displacement 강함

### 보이는 결과
뒤 글자가 J1 안에서:

- 가로로 늘어나고
- 약간 비스듬히 밀리고
- outer edge 근처에서 크게 꺾여야 함

### 금지
그냥 넓은 투명 타원.

---

## J2 — SQUASHED LENS

**목표**
납작하고 눌린 optical lens.

### Optical Character
- `magnifyX` 중간
- `compressY` 강함
- center bulge 약함
- 좌우 edge bend 강함

### 보이는 결과
뒤 글자가:

- 위아래로 눌리고
- 좌우로 조금 넓어지고
- lens 양끝에서 더 세게 휘어야 함

---

## J3 — OBLIQUE BULGED LENS

**목표**
세로 bulge와 oblique 방향성이 분명한 렌즈.

### Optical Character
- local center magnification 강함
- diagonal shear 강함
- rotation이 J1/J2와 확실히 다름
- 한쪽 edge optical power가 비대칭적으로 강함

### 보이는 결과
뒤 글자 일부가:

- 중앙에서 커지고
- 한쪽 방향으로 밀리며
- 반대쪽 edge에서 급격하게 꺾여야 함

---

# 4. Center Refraction을 지금보다 강화

현재 Pair Proof에서 center가 너무 자연스럽게 보여
렌즈 존재감이 약하다.

이번에는 center에서도 실제 deformation이 읽혀야 한다.

권장 개념:

- center displacement: 현재 대비 약 1.5~2배
- center magnification: 약 1.03~1.10 체감
- local anisotropic scaling 허용
- local shear 허용

정확한 수치가 아니라 **Reference에서 육안으로 느껴지는 수준**에 맞춘다.

---

# 5. Edge Optical Power는 더 명확하게

Reference처럼 edge 일부에서:

- 글자가 급격히 꺾임
- dark reflection
- specular
- blue/amber caustic

이 동시에 겹치며 optical power가 강해져야 한다.

하지만 전체 edge를 동일하게 강화하지 않는다.

각 렌즈마다 **2~3개의 강한 optical zone**만 만든다.

---

# 6. Dark Reflection 강화

현재보다 조금 더 강해도 된다.

단 조건:

- 전체 outline 금지
- 국소 blob / sink 형태
- 1~2곳만 강하게

Reference처럼 edge 일부가 순간적으로 거의 검정으로 잠기는 느낌을 만든다.

---

# 7. Blue / Amber / Red Caustic 강화

현재보다 color hotspot 존재감을 약간 올린다.

하지만:

- RGB border
- rainbow outline

은 금지.

각 렌즈마다:

- Blue 1~2곳
- Amber/Orange 1~2곳
- Red는 보조 0~1곳

정도.

색보다 **광학적 hotspot**처럼 보이게 한다.

---

# 8. Silhouette 차이를 더 키울 것

J1/J2/J3의 shape 차이가 설명으로만 존재하면 안 된다.

Pair Proof 축소 상태에서도:

- J1 = wide diagonal
- J2 = flat/squashed
- J3 = oblique bulged

가 즉시 구별되어야 한다.

필요하면:

- width/height ratio
- local bulge
- pinch
- rotation

차이를 지금보다 15~25% 더 벌려도 된다.

---

# 9. Reference Crop과 1:1로 직접 맞춰라

이번 수정에서도:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

구조 유지.

각 pair:

- 동일 bounding box
- 동일 display size
- 후보만 크게 확대 금지
- Reference를 작게 축소 금지

직접 시각 비교한다.

---

# 10. Pair Proof 자체 검수 질문

각 J별로 아래 질문에 모두 YES여야 한다.

1. 중앙이 여전히 clear한가?
2. 뒤 글자가 center에서도 휘는가?
3. 단순 displacement가 아니라 확대/압축도 느껴지는가?
4. edge optical zone이 center보다 분명히 강한가?
5. dark reflection이 국소적으로 존재하는가?
6. blue/orange caustic이 국소적으로 존재하는가?
7. 다른 J와 silhouette가 확실히 다른가?
8. “흰 오브젝트”가 아니라 “투명 렌즈”로 보이는가?

---

# 11. 다음 단계 진입 기준

다음 문장이 시각적으로 성립해야 한다.

> **투명한 Jelly Lens가 뒤의 giant typography를 실제로 휘고 확대·압축해서 존재감이 드러난다.**

그리고 동시에:

> **렌즈 자체의 body color는 거의 느껴지지 않는다.**

둘 다 만족해야 한다.

---

# 12. 즉시 FAIL

아래 중 하나라도 해당하면 Pair Proof 계속 수정.

- white body가 다시 강해짐
- center가 평범한 투명창
- refraction이 edge에서만 보임
- J1/J2/J3가 비슷함
- caustic을 outline처럼 사용
- dark rim이 전체 둘레를 감쌈
- shape보다 효과가 먼저 보임
- Reference보다 candidate가 지나치게 흐려 존재감이 없음

---

# 13. 현재 Gate 상태

```text
GATE A1 = REJECT
GATE A2 = REJECT
GATE A3 = REJECT
GATE A4 = REJECT
GATE A5 = REJECT

GATE A6 = IN PROGRESS
JELLY_PAIR_PROOF = NOT YET PASS

FULL STATIC SCREEN = NOT STARTED
GATE B = HOLD
GATE C = HOLD
```

---

# 14. 최종 지시

이번 수정은 transparency를 낮추는 작업이 아니다.

**투명도는 유지하고 optical deformation을 강화하는 작업**이다.

> body는 거의 보이지 않되,
> 뒤 글자는 lens 안에서 분명하게 다르게 보여야 한다.

J1/J2/J3 각각의 magnification / compression / shear / edge power를
Reference에 맞춰 별도로 조정한다.

Pair Proof가 기준에 도달하기 전에는
전체 화면으로 절대 넘어가지 않는다.
