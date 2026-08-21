# LoveTree 49번 Storyboard ↔ Implementation Visual Gate Checklist v1
## 4-3기 Shot-by-Shot 검수표

**대상:** `49_아이돌모먼트_리빌포털_분류대기 / V2 STORYBOARD LOCK IMPLEMENTATION`  
**목적:** 좋은 storyboard가 HTML/영상 구현 단계에서 변질되는 것을 방지  
**작성일:** 2026-08-09

---

# 1. 사용법

각 단계마다 승인 storyboard와 실제 구현 결과를 **같은 shot끼리 나란히** 놓고 판정한다.

판정은:

- `PASS`
- `REVISION`
- `FAIL`

세 가지뿐이다.

"비슷한 느낌", "대체로 구현", "기술상 가능"은 PASS 사유가 아니다.

---

# 2. 전역 Hard Gate

아래 하나라도 FAIL이면 다음 단계 진행 금지.

| 항목 | 기준 | 판정 |
|---|---|---|
| PRIMARY Identity | 핵심 solo shot 전부 동일 인물 | |
| Storyboard Fidelity | 승인 storyboard의 구도·거리·색이 보존됨 | |
| Scene Quality | cutout/카드가 아니라 실제 공간 장면으로 보임 | |
| Motion Quality | CSS 확대가 아니라 장면/카메라가 움직임 | |
| LoveTree Causality | Save → Connection → Next Moment 인과가 보임 | |
| Tree Causality | 앞 Connection이 마지막 Tree로 회수됨 | |
| Superhuman Language | close/wide, white/dark/red/cyan, glass/portal energy가 살아있음 | |
| No Random Cast | solo에서 새로운 남성 identity 없음 | |
| No Floating Slideshow | portrait strip/card wall 중심 아님 | |
| Video First | 승인 shot clip 이후 HTML 제작 | |

---

# 3. Shot Registry 필수 필드

각 shot마다 다음을 기록한다.

```text
Shot ID:
Semantic Beat:
Reference Timing:
Storyboard File/Frame:
Scene Master File:
Motion Clip File:
Primary Identity:
Camera:
Lighting:
Transition In:
Transition Out:
Connection Meaning:
Storyboard Match:
Known Difference:
Gate:
```

---

# 4. Shot별 Gate

## S01 — FIRST GLIMPSE

**Semantic Goal:** 처음 눈이 멈추는 Moment.

검수:

- [ ] storyboard와 같은 PRIMARY
- [ ] dark / cyan / silver
- [ ] close 또는 extreme close 거리 유지
- [ ] 첫 1~2초 hook
- [ ] 얼굴이 AI morph로 흔들리지 않음
- [ ] 단순 zoom이 아니라 light/camera/subject micro-motion 존재
- [ ] 다른 남성 등장 없음

**FAIL 조건:** 그냥 멋있는 남자 portrait.

---

## S02 — AFTERIMAGE / MEMORY BREATH

**Semantic Goal:** 첫 Moment가 머릿속에 남음.

- [ ] S01과 동일인
- [ ] reflection/glass/water 계열 잔상
- [ ] 실제 depth 존재
- [ ] 얼굴 복제 collage 금지
- [ ] S01의 기억이 이어지는 느낌

**FAIL 조건:** 새 인물 또는 random glass effect.

---

## S03 — PERSON REVEAL

**Semantic Goal:** "저 사람 누구지?"가 선명해짐.

- [ ] 같은 PRIMARY
- [ ] white/high-key 공간
- [ ] close→wide 또는 공간 확장 충격
- [ ] 얼굴 품질 최우선
- [ ] clean K-pop teaser visual

**FAIL 조건:** 흰 배경 portrait 한 장.

---

## S04~S07 — DELICATE MOMENTS / RAPID BURST

**Semantic Goal:** 작은 행동·표정·디테일이 더 궁금하게 만듦.

- [ ] 같은 PRIMARY의 서로 다른 Moment
- [ ] hand / mic / stage / smile / movement / detail
- [ ] micro-cut rhythm
- [ ] shot마다 다른 감정 정보
- [ ] 다른 남성 얼굴 릴레이 아님
- [ ] portrait grid가 아니라 개별 cinematic shot

**FAIL 조건:** MANY MOMENTS를 MANY PEOPLE로 구현.

---

## SAVE THIS MOMENT

**Semantic Goal:** "이 순간은 남기고 싶다."

- [ ] 이전 Moment를 실제로 lock/freeze하는 사건
- [ ] light trace 발생
- [ ] Saved trace가 다음 Connection의 source가 됨
- [ ] SAVE UI가 화면을 지배하지 않음
- [ ] 임의 SF reticle/HUD 없음

**FAIL 조건:** 글자 `SAVE`만 표시.

---

## CONNECTION / WHY NEXT?

**Semantic Goal:** 왜 다음 Moment를 찾아갔는가.

- [ ] SAVE trace에서 출발
- [ ] path/portal이 인과적으로 생성
- [ ] camera가 path를 따라 이동
- [ ] path가 다음 scene을 실제로 엶
- [ ] Connection 이유가 앞 Moment와 연결됨
- [ ] generic sci-fi tunnel 단독 장면이 아님

**FAIL 조건:** 아무 이유 없는 portal insert.

---

## NEXT MOMENT

**Semantic Goal:** 앞 Moment 때문에 발견한 새로운 면.

- [ ] 동일 PRIMARY
- [ ] 앞 장면과 다른 상황/감정
- [ ] "그래서 또 봤다"가 느껴짐
- [ ] 새 남자 소개가 아님

---

## DEEPENING / MANY MOMENTS

**Semantic Goal:** 한 사람의 여러 Moment가 쌓임.

- [ ] Stage
- [ ] Interview
- [ ] Backstage
- [ ] Smile
- [ ] Walking
- [ ] Live/Performance
- [ ] Detail
- [ ] 모두 PRIMARY 중심
- [ ] secondary는 context뿐

**FAIL 조건:** 여러 남자 montage.

---

## MEMORY FIELD / PATH REVEAL

**Semantic Goal:** 저장된 Moment와 Connection의 경로가 공간으로 드러남.

- [ ] Moment가 path 위에 존재
- [ ] 3D depth
- [ ] foreground/mid/background
- [ ] Connection traces가 누적
- [ ] 단순 floating-card gallery가 아님
- [ ] 모든 card가 같은 속도로 떠다니지 않음
- [ ] 마지막 Tree로 이어질 branch logic이 시작됨

---

## GROUP CONTEXT

- [ ] shared perspective
- [ ] shared lighting
- [ ] floor/space 존재
- [ ] full/half body
- [ ] formation
- [ ] PRIMARY가 여전히 식별 가능
- [ ] 얼굴 cutout 집합 아님

---

## TREE EMERGES

**Semantic Goal:** 지금까지의 경로가 Tree였다는 reveal.

- [ ] 이전 Connection path가 남아 있음
- [ ] path → root/branch 변환이 눈에 보임
- [ ] camera pullback
- [ ] Moment points가 branch 끝에서 점등
- [ ] Tree asset 갑작스러운 fade-in 없음
- [ ] Tree가 제품 의미의 결과

**FAIL 조건:** 마지막이니까 나무 PNG 표시.

---

## LOVETREE TITLE

- [ ] Tree climax 이후 title
- [ ] title이 Tree를 가리지 않음
- [ ] 짧은 hold
- [ ] CTA는 마지막
- [ ] 브랜드가 영상보다 먼저 튀지 않음

---

# 5. Identity Continuity Gate

PRIMARY 핵심 shot들을 한 줄 contact sheet로 만든다.

필수 비교:

```text
FIRST GLIMPSE
AFTERIMAGE
PERSON REVEAL
SAVE
NEXT MOMENT
STAGE
INTERVIEW
BACKSTAGE
SMILE
FINAL ECHO
```

### PASS
10장을 보고 별도 설명 없이 같은 사람으로 느껴짐.

### FAIL
"같은 캐릭터라고 설정했습니다"라는 설명이 필요함.

---

# 6. Storyboard Frame Match Gate

각 shot마다:

```text
LEFT  = APPROVED STORYBOARD
RIGHT = IMPLEMENTED FRAME
```

로 비교한다.

다음 7개를 각각 PASS/FAIL.

| 기준 | 판정 |
|---|---|
| Composition | |
| Camera distance | |
| Subject placement | |
| Lighting direction | |
| Color family | |
| Environment | |
| Emotional read | |

7개 중 2개 이상 FAIL이면 해당 scene 재제작.

---

# 7. Motion Gate

정지 프레임을 1초 간격으로 봤을 때가 아니라,
실제 playback으로 판정한다.

### 필수
- [ ] camera movement
- [ ] subject micro-motion
- [ ] depth/parallax
- [ ] lighting change
- [ ] transition motivation
- [ ] temporal rhythm

### 금지
- [ ] `scale()`만 있음
- [ ] `translateX/Y()`만 있음
- [ ] opacity fade만 있음
- [ ] CSS blur만 있음
- [ ] portrait가 화면 안에서 떠다님

---

# 8. 12초 Motion Proof Gate

12초 Proof에서 아래 전부 PASS해야 한다.

| 질문 | PASS/FAIL |
|---|---|
| 첫 2초가 강한가 | |
| PRIMARY가 기억되는가 | |
| 스토리보드가 실제로 움직이는 느낌인가 | |
| Afterimage가 첫 Moment의 기억으로 연결되는가 | |
| Detail이 같은 사람의 여러 Moment인가 | |
| SAVE가 사건인가 | |
| SAVE 흔적이 CONNECTION으로 이어지는가 | |
| 카메라가 실제 공간을 통과하는가 | |
| Superhuman 에너지가 있는가 | |
| 아마추어 fan edit 느낌이 없는가 | |

**하나라도 FAIL → Full 29초 제작 금지.**

---

# 9. Full Cinematic Gate

최종 29.252초 제출 시:

- [ ] uninterrupted playback
- [ ] 30fps 이상
- [ ] click 없음
- [ ] skip 없음
- [ ] modal 없음
- [ ] loading 없음
- [ ] clean capture
- [ ] benchmark rhythm side-by-side
- [ ] storyboard side-by-side
- [ ] identity contact sheet

기능 QA는 별도.

---

# 10. HTML Gate

HTML은 영상 승인 후 검수한다.

### PASS
- [ ] shot clip preload
- [ ] seamless playback
- [ ] audio/sound handling
- [ ] skip
- [ ] replay
- [ ] ENTER LOVETREE
- [ ] responsive crop
- [ ] mobile fallback
- [ ] no console errors
- [ ] no horizontal overflow

### 중요한 원칙

> **HTML PASS가 Visual PASS를 대신하지 않는다.**

---

# 11. 승인 체계

각 단계 상태는 아래만 사용.

```text
SCENE_MASTER_GATE_PENDING
SCENE_MASTER_PASS
ANIMATIC_GATE_PENDING
ANIMATIC_PASS
12SEC_MOTION_GATE_PENDING
12SEC_MOTION_PASS
FULL_CINEMATIC_GATE_PENDING
FULL_CINEMATIC_PASS
HTML_QA_PENDING
```

팀 자체 `FINAL PASS` 금지.

---

# 12. 한 줄 검수 기준

> **구현자가 새로운 작품을 만들었는지 보지 말고, 제품 오너가 좋아한 storyboard가 실제 영상으로 살아났는지만 본다.**

**STORYBOARD MATCH FIRST. IMPLEMENTATION CREATIVITY SECOND.**

**END OF CHECKLIST**
