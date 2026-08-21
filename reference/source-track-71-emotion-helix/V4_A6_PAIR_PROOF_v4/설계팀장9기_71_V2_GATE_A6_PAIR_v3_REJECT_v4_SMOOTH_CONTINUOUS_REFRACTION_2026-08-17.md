# 설계팀장9기 — Track 71 V2 GATE A6 Pair Proof v3 REJECT / v4 Smooth Continuous Refraction Surface 정밀교정

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
PAIR PROOF v4 = REQUIRED

FULL STATIC SCREEN = NOT STARTED
6-LENS FULL COMPOSITION = NOT STARTED
FULL A6 HTML = NOT STARTED

GATE B = HOLD
GATE C = HOLD
```

**이 문서가 A6 Pair Proof의 최신 실행지시다.**

---

# 0. v3 실제 화면 판정

v3는 v2보다 개선됐다.

특히:

- clear body 유지
- white capsule 재발 없음
- partial optical perimeter 존재
- dark reflection / blue·amber caustic 존재
- J1 / J2 / J3 character 차이 증가
- J3 silhouette visibility 개선

은 확인된다.

그러나 Reference와 Pair로 비교하면 아직 PASS할 수 없다.

이번 실패는 “효과가 약해서”가 아니라:

> **굴절면이 매끈한 유리 표면으로 이어지지 않고, 일부 구간에서 typography가 찢기거나 잘린 mask처럼 보이는 문제**

다.

---

# 1. v3 개별 판정

## J1 — REJECT

좋아진 점:
- wide diagonal family는 읽힘
- upper-right amber edge와 lower-left blue zone 존재
- PATH 내부 deformation 증가

문제:
- 좌측 시작부가 매끈한 jelly contour가 아니라 뾰족한 wedge처럼 보임
- 상부 black reflection과 원래 typography가 합쳐져 “유리 반사”가 아니라 “검정 도형”처럼 보임
- 하부 perimeter가 너무 희미해 전체 lens silhouette가 끊김
- refraction이 smooth bending보다 hard clipping처럼 보이는 구간이 있음

### v4 J1 목표
> 넓은 대각 disc 전체가 한 장의 매끈한 투명 렌즈로 연결되어 보여야 한다.

---

## J2 — REJECT

좋아진 점:
- squashed family는 J1과 구별됨
- 좌측 blue / 우측 amber hotspot 확인
- Y compression 의도 확인

문제:
- 렌즈 하단 절반의 perimeter가 거의 사라짐
- MOMENT black stroke가 상단에서 갑자기 잘린 것처럼 보여 refraction보다 mask cut로 읽힘
- 오른쪽 black 영역이 너무 직선적/사각형적임
- center deformation이 렌즈 전체 면적으로 연결되지 않음

### v4 J2 목표
> 눌린 투명 lens의 전체 타원형 면이 하나로 이어지고, MOMENT가 그 안에서 부드럽게 압축되어야 한다.

---

## J3 — CONDITIONAL BASELINE / 아직 PASS 아님

셋 중 가장 좋다.

좋아진 점:
- silhouette를 가장 빨리 찾을 수 있음
- oblique bulged family가 분명
- LOVE와 실제로 충분히 교차
- dark / amber zone 존재
- center bulge가 J1/J2보다 명확

문제:
- 우하단 gray/dark pool이 조금 뭉쳐 “회색 젤리 덩어리”처럼 보임
- left/lower perimeter는 너무 옅고, right edge는 상대적으로 과강함
- Reference처럼 얇고 날카로운 glass edge와 내부 clear face의 대비가 더 필요
- 일부 refraction transition이 아직 부드럽지 않음

### v4 J3 지시
**J3의 현재 optical presence는 기준으로 보존한다.**
다만 perimeter 분포와 gray pool만 정리한다.

---

# 2. v4 핵심 목표

v4는 효과를 무작정 더 강하게 넣는 단계가 아니다.

목표:

> **SMOOTH CONTINUOUS REFRACTION SURFACE**

즉:

- silhouette는 보임
- body는 clear
- background typography는 강하게 휨
- 그러나 변형이 한 장의 매끈한 렌즈 표면을 따라 연속적으로 이어짐

이어야 한다.

---

# 3. Hard Cut / Polygonal Warp 금지

v3에서 가장 큰 문제 중 하나.

다음처럼 보이면 FAIL:

- 글자 stroke가 칼로 잘린 듯 끊김
- straight rectangular black block
- triangular wedge
- refraction boundary에서 갑자기 위치가 점프
- mask clipping처럼 보임

v4에서는 UV displacement / magnification / shear가 lens field 안에서 연속적으로 변해야 한다.

---

# 4. Refraction Field는 C1 수준으로 부드럽게

기술 구현 방식은 자유지만 시각적으로:

- center → mid → edge
- edge strong zone → weak zone

사이에 급격한 discontinuity가 없어야 한다.

권장 개념:

```text
center mild warp
   ↓ smooth gradient
mid magnification / compression
   ↓ smooth gradient
edge strong bend
```

hard step 함수 남발 금지.

---

# 5. Filled Blob SDF는 유지

형태 정의는 계속:

- filled solid blob mask
- no hole
- no ring geometry

유지.

단 blob boundary에 noise를 너무 크게 넣어:
- 뾰족한 cusp
- 찢어진 edge
- 삼각 wedge

가 생기지 않게 한다.

---

# 6. Perimeter Continuity

v3는 “일부 edge만 강하게” 지시를 따르다가 J1/J2의 전체 silhouette가 끊겼다.

v4에서는:

## 모든 perimeter
아주 약한 optical signal은 존재.

## strong zone
일부만 강함.

즉:

```text
100% perimeter = 최소한의 미세 refractive edge
25~35% perimeter = strong dark/specular/caustic zone
```

이렇게 한다.

중요:

> 전체 outline을 진하게 두르라는 뜻은 아니다.

아주 약한 baseline optical edge가 전체 shape를 연결하고,
일부 zone만 Reference처럼 강하게 치고 올라온다.

---

# 7. Thin Glass Edge 추가

Reference에는 매우 얇고 선명한 glass edge가 있다.

v4에서 허용:

- 1~3px equivalent thin bright edge
- thin dark refraction line
- local blue/amber accent

금지:

- broad white halo
- 10~20px 두꺼운 white rim
- rainbow full outline

---

# 8. Typography Warp는 “찢김”이 아니라 “렌즈 변형”

Reference의 글자는:
- 늘어나고
- 눌리고
- 뒤틀리고
- 경계에서 꺾이지만

stroke 자체가 사각형 mask로 잘린 것처럼 보이지 않는다.

v4에서:

- magnification
- compression
- shear
- displacement

은 계속 강하게 유지하되,
transition을 smooth하게 만든다.

---

# 9. Typography Coverage 조정

v3는 검정 typography가 너무 크고 강해
reflection과 원래 글자를 구분하기 어려운 구간이 있다.

v4 Pair Proof에서는 candidate lens 면적 기준:

- black typography coverage 약 45~65%

를 목표로 한다.

너무 적으면 refraction 증명 실패.
너무 많으면 lens contour가 검정 글자에 묻힘.

---

# 10. J1 v4 세부지시

- current wide diagonal silhouette 유지
- 좌측 pointed wedge 제거
- upper surface의 black region을 typography와 명확히 구분
- lower perimeter 전체에 very subtle refractive line 추가
- PATH stroke는 center에서 X magnify
- edge에서 smooth bend
- amber/blue zone은 유지하되 더 얇고 선명하게

### J1 PASS 기준
한눈에:

> “PATH 위에 넓은 투명 glass disc가 대각으로 놓여 있다.”

---

# 11. J2 v4 세부지시

- current flattened proportion 유지
- 하부 perimeter를 완전히 연결
- 좌우 edge optical power 유지
- right black rectangle 느낌 제거
- MOMENT가 upper half에서 갑자기 잘리지 않도록 continuous compression
- center 전체에 약한 lensing을 분산

### J2 PASS 기준
한눈에:

> “MOMENT가 눌린 투명 lens 전체 안에서 부드럽게 압축된다.”

---

# 12. J3 v4 세부지시

J3는 현재 형태를 크게 바꾸지 않는다.

보존:
- oblique family
- bulged silhouette
- current center magnification
- amber strong zone

수정:
- lower-right gray pool 약 20~30% 감소
- left/lower weak edge를 미세하게 연결
- black reflection을 좀 더 날카로운 glass reflection으로 정리
- surface transition smooth화

### J3 PASS 기준
Reference와 같은 투명 optical object family로 즉시 읽힘.

---

# 13. Edge Intensity Hierarchy

각 lens에서:

```text
Baseline perimeter = 매우 약함
Strong reflection zone = 1~2곳
Strong caustic zone = 1~2곳
Bright specular = 1~2곳
```

전부 같은 위치에 겹치지 않는다.

---

# 14. Color Caustic

유지하되 조금 더 정교하게.

- Blue = cool electric line/hotspot
- Amber = warm optical burn
- Red = 매우 제한적 accent

v3처럼 색 자체는 이미 충분하므로
v4에서는 “더 세게”보다 “더 얇고 날카롭게”가 우선.

---

# 15. Gray/Frost 느낌 제거

특히 J3 lower-right.

Reference는 clear glass인데
v3 candidate 일부가 gray smoky gel처럼 보인다.

v4:

- gray blur 폭 축소
- dark reflection은 더 날카롭게
- clear center 유지
- fog/frosted appearance 금지

---

# 16. Pair Proof 형식 유지

제출:

```text
REF 01 | CANDIDATE J1
REF 02 | CANDIDATE J2
REF 03 | CANDIDATE J3
```

동일 bounding box.

다른 방식으로 유리하게 비교 금지.

---

# 17. v4 자체 체크

각 Candidate:

1. 전체 silhouette가 끊기지 않는가?
2. white body 없이 clear한가?
3. typography deformation이 smooth한가?
4. hard clipping / rectangular cut가 없는가?
5. edge bend가 center보다 강한가?
6. dark reflection이 typography와 구별되는가?
7. blue/amber caustic이 얇고 국소적인가?
8. Reference와 동일한 clear-glass family로 읽히는가?

8개 모두 YES여야 제출.

---

# 18. v4 제출물

이번에도 딱 2개.

1. `71_V2_GATE_A6_JELLY_PAIR_PROOF_v4.png`
2. `71_V2_GATE_A6_PAIR_NOTES_v4.md`

---

# 19. 전체 화면 진입 금지

v4 명시 PASS 전:

- `71_V2_GATE_A6_REFERENCE_COMPARISON.png`
- 6-lens full composition
- full A6 HTML
- motion
- parallax
- video
- click
- GATE B
- GATE C

금지.

---

# 20. 최종 판정 기록

```text
PAIR PROOF v1 = REJECT
PAIR PROOF v2 = REJECT
PAIR PROOF v3 = REJECT
PAIR PROOF v4 = REQUIRED

J3 v3 = CONDITIONAL BASELINE
J1/J2 v3 = REJECT

FULL STATIC SCREEN = NOT STARTED
```

---

# 21. 최종 지시

v3에서 “보이는 투명 렌즈”까지는 가까워졌다.

v4에서는 이제:

> **효과를 더 세게 하는 것이 아니라, 하나의 매끈한 유리 표면으로 연결하는 것**

이 핵심이다.

Reference의 오브젝트는
투명하지만 형태가 분명하고,
굴절은 강하지만 찢어지지 않는다.

v4 Pair Proof에서 이 두 조건을 동시에 맞춘다.
