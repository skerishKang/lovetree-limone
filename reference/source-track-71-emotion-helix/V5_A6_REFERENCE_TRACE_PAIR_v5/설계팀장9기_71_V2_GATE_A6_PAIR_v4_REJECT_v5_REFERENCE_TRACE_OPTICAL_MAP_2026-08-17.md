# 설계팀장9기 — Track 71 V2 GATE A6 Pair Proof v4 REJECT / v5 Reference-Trace Optical Map 재구성 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `71_러브트리_감정경로헬릭스_인터랙티브대문_V1`  
**작업 루트:** `V2_GABE_EXACT_GLASS_ORBIT_후보`

## 현재 판정

```text
GATE A5 = REJECT
GATE A6 = IN PROGRESS

PAIR PROOF v1 = REJECT
PAIR PROOF v2 = REJECT
PAIR PROOF v3 = REJECT
PAIR PROOF v4 = REJECT
PAIR PROOF v5 = REQUIRED

FULL STATIC SCREEN = NOT STARTED
6-LENS FULL COMPOSITION = NOT STARTED
FULL A6 HTML = NOT STARTED

GATE B = HOLD
GATE C = HOLD
```

**이 문서가 A6 Pair Proof의 최신 MASTER다.**

---

# 0. v4 실제 화면 판정

v4는 v3보다 hard clipping과 gray/frosted pool을 줄였지만,
Reference fidelity 기준으로는 아직 통과할 수 없다.

실제 Pair Proof에서:

### J1
- smooth해졌으나 거의 **희미한 타원 outline**으로 읽힌다.
- `PATH` 내부 변형이 Reference보다 훨씬 약하다.
- Reference의 두꺼운 optical edge / black reflection / chromatic caustic 질량감이 없다.
- lens 안을 통과하는 typography가 “렌즈 안에서 크게 바뀐다”는 느낌이 약하다.

### J2
- 세 후보 중 내부 distortion은 가장 강하지만,
- black deformation이 하나의 glass surface가 아니라 **검정 mask / 잘린 graphic**처럼 읽힌다.
- Reference의 transparent thickness보다 black patch가 먼저 보인다.

### J3
- silhouette는 v3보다 정돈됐지만,
- `LOVE`가 거의 원래 형태 그대로 통과한다.
- thin oval perimeter는 보이지만 Reference의 bulged glass optical mass가 부족하다.
- clear lens라기보다 **얇은 투명 타원선**처럼 읽힌다.

결론:

> v4의 문제는 더 이상 단순 shader strength 문제가 아니다.

현재 generic ellipse/blob shader를 수치 조정하는 방식으로는
Reference의 실제 optical shape를 계속 놓치고 있다.

따라서 v5부터는 **Reference-Trace 방식으로 전환**한다.

---

# 1. v5 핵심 전환

## 기존 방식
`generic blob → magnification/shear 값 조절 → edge effect 튜닝`

## v5 방식
`Reference 실제 silhouette trace → Reference optical zones trace → 그 map으로 distortion 생성`

즉 더 이상 “비슷한 타원을 만들어 효과를 조절”하지 않는다.

> **Reference의 실제 lens shape와 optical distribution을 1:1로 읽어 가져온다.**

---

# 2. 새 공식 방식 — REFERENCE-TRACE OPTICAL MAP

각 REF 01 / 02 / 03에 대해 아래 4개 map을 직접 만든다.

## MAP A — SILHOUETTE MASK
Reference의 실제 glass outline을 trace.

- ellipse 추정 금지
- generic oval 금지
- Reference 외곽을 직접 따라감
- smooth bezier / SDF로 정리

## MAP B — REFRACTION FIELD
Reference 안에서 글자가 어떻게:
- 확대
- 압축
- shear
- bend
되는지 위치별로 trace.

## MAP C — DARK REFLECTION MAP
Reference의 검정 reflection 위치만 따로 기록.

## MAP D — CAUSTIC / SPECULAR MAP
Reference의:
- blue
- amber/orange
- tiny red
- white specular

위치를 따로 기록.

---

# 3. v5에서는 “모양을 새로 디자인”하지 않는다

J1/J2/J3는 각각 대응하는 Reference crop의 shape를 직접 따른다.

금지:

- “J1은 wide disc니까 이런 타원”
- “J2는 squashed니까 이런 oval”
- “J3는 bulged니까 이런 ellipse”

같은 추상화.

이제는:

> **REF 01 자체가 J1 shape authority**
> **REF 02 자체가 J2 shape authority**
> **REF 03 자체가 J3 shape authority**

다.

---

# 4. Pair Proof의 Candidate 배경 typography도 Reference 검증용으로 조정

현재 `PATH / MOMENT / LOVE`를 유지할 수 있다.

그러나 중요한 것은 글자 자체가 아니라 **Reference와 비슷한 굵기와 교차 밀도**다.

Candidate typography는:

- Reference와 비슷한 stroke thickness
- lens 면적 55~75% 정도와 교차
- lens center와 edge를 모두 지나감

하도록 위치를 조정한다.

---

# 5. Reference와 Candidate의 동일 bounding box를 더 엄격히

v5 Pair Proof:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

유지.

추가 HARD RULE:

- outer lens bbox 크기 오차 ±5% 이내
- rotation 오차 육안 ±5° 이내
- aspect ratio도 Reference 기준
- Candidate만 더 크게/작게 보여 유리하게 비교 금지

---

# 6. J1 v5 — REF 01 직접 Trace

현재 v4 J1의 타원형 generic contour 폐기.

REF 01에서 보이는 실제 glass contour를 trace한다.

특히:

- 상단/우측 arc
- 하단 double optical edge
- black reflection이 강해지는 구간
- blue hotspot
- amber hotspot
- 내부 black typography가 급격히 휘는 영역

을 1:1로 옮긴다.

### PASS 기준

Candidate J1을 보면:

> “PATH에 효과를 얹은 것”이 아니라  
> “REF 01과 같은 glass object가 PATH 위에 놓였다”

라고 보여야 한다.

---

# 7. J2 v5 — REF 02 직접 Trace

v4의 black mask 느낌을 제거한다.

REF 02의 실제 lens는:

- center는 transparent
- edge에서 강한 refraction
- black reflection은 surface 일부에만 존재
- typography는 내부에서 연속적으로 왜곡

된다.

v5 J2는 black deformation을 크게 칠하는 대신
Reference에서 실제로 black reflection이 있는 위치만 사용한다.

### PASS 기준

> 투명 lens가 `MOMENT`를 눌러 보이게 하는 것이 먼저 보여야 하고,
> 검정 patch는 보조 optical reflection이어야 한다.

---

# 8. J3 v5 — REF 03 직접 Trace

현재 v4 J3는 가장 정돈됐지만 너무 약하다.

REF 03에서:

- outer shape
- bulged center
- dark edge
- blue/amber zones
- sharp glass edge

를 직접 map으로 옮긴다.

`LOVE`는 center에서 최소한 육안상 크게:
- magnify
- shear
- bend

되어야 한다.

### PASS 기준

> 얇은 oval outline이 아니라 두께 있는 transparent glass blob가 보여야 한다.

---

# 9. Optical Thickness를 “edge width”가 아니라 refraction으로 표현

Reference의 두께감은
두꺼운 흰 outline이 아니라:

- double refraction
- displaced duplicate stroke
- local dark reflection
- chromatic split

로 생긴다.

v5에서는 필요하면:

```text
outer sample
inner sample
```

두 개의 background sample을 서로 다른 offset으로 사용해서
glass edge thickness를 만든다.

---

# 10. Double Refraction 허용

Reference edge는 일부 위치에서
하나의 선이 아니라 double glass boundary처럼 보인다.

v5에서 허용:

- primary refracted sample
- secondary refracted sample
- 서로 2~8px offset
- local RGB split

단 전 perimeter에 uniform 적용 금지.

---

# 11. Center Refraction은 v4보다 명확하게

v4 J1/J3는 center가 너무 그대로 보인다.

v5:

- center에서도 background stroke가 “다른 위치/크기”로 보일 것
- magnification 단독이 아니라 anisotropic warp 허용
- Reference와 비교했을 때 deformation 체감량이 비슷해야 함

---

# 12. Edge Black은 Typography와 분리

현재 J2처럼 black warp와 typography가 합쳐져
검정 mask로 보이면 실패.

방법:

- reflection map은 typography와 다른 방향/곡률
- opacity/local blur 차별화
- edge 위치에만 집중

---

# 13. Caustic 위치를 랜덤 생성하지 않는다

v5부터:
- blue
- amber
- red
- white

highlight 위치를 random/parameter로 배치하지 않는다.

**Reference crop에서 보이는 위치를 따라간다.**

---

# 14. v5에서 새로 제출할 Trace Evidence

이번에는 Pair Proof 외에 trace가 실제 Reference 기반임을 증명한다.

필수 3개:

1. `71_V2_GATE_A6_REF_TRACE_MAP_v5.png`
2. `71_V2_GATE_A6_JELLY_PAIR_PROOF_v5.png`
3. `71_V2_GATE_A6_PAIR_NOTES_v5.md`

---

# 15. REF_TRACE_MAP 구성

한 장 안에:

```text
REF 01
- silhouette trace
- dark reflection zones
- blue/amber zones
- deformation arrows

REF 02
- silhouette trace
- dark reflection zones
- blue/amber zones
- deformation arrows

REF 03
- silhouette trace
- dark reflection zones
- blue/amber zones
- deformation arrows
```

를 보여준다.

이 trace map 자체가 부정확하면 Pair Proof 제작을 중단한다.

---

# 16. v5 PASS 기준

## PASS 1 — Shape
Candidate outer shape가 Reference에 즉시 대응된다.

## PASS 2 — Clear body
white/gray body fill 없음.

## PASS 3 — Optical mass
thin outline이 아니라 두께 있는 transparent glass로 읽힌다.

## PASS 4 — Center deformation
글자가 center에서도 명확히 변한다.

## PASS 5 — Edge refraction
edge에서 typography가 급격히 휘지만 hard clipping은 없다.

## PASS 6 — Reflection
black reflection이 typography와 구별된다.

## PASS 7 — Caustic
blue/amber/red 위치가 Reference distribution과 유사하다.

## PASS 8 — Immediate family match
나란히 보면 “같은 optical object family”라고 1초 내 읽힌다.

---

# 17. 전체 화면 진행 금지

v5 Pair Proof 명시 PASS 전:

- full Reference Comparison
- six-lens composition
- full HTML
- motion
- parallax
- video
- click
- light/dark
- GATE B
- GATE C

전부 금지.

---

# 18. 최종 상태

```text
PAIR PROOF v1 = REJECT
PAIR PROOF v2 = REJECT
PAIR PROOF v3 = REJECT
PAIR PROOF v4 = REJECT

PAIR PROOF v5 = REQUIRED
METHOD = REFERENCE-TRACE OPTICAL MAP

FULL STATIC SCREEN = NOT STARTED
```

---

# 19. 최종 지시

v1~v4까지 반복된 문제는
Reference를 보고도 generic ellipse/blob를 다시 발명했다는 것이다.

v5부터는 새로 발명하지 않는다.

> **Reference의 실제 shape와 optical distribution을 trace해서 그대로 재현한다.**

이번 Gate의 목적은 기술적 우아함이 아니라
**Reference와의 시각적 동일 family 확보**다.

v5 Pair Proof가 승인되기 전에는 전체 화면으로 절대 넘어가지 않는다.
