# LoveTree 49 · Moment Reveal Portal
# 3기 설계팀장 1차 디자인팀 실행지시서 v1

- 발행: LoveTree 3기 설계팀장
- 대상: LoveTree 디자인팀장
- 신규시안: `49_아이돌모먼트_리빌포털_분류대기`
- 기준 참고영상: `웹디자인레퍼런스_다중사이트분석.mp4`
- 결과물 상태: 신규 후보 / 승인 전
- 기존 채택본 덮어쓰기: 금지
- 48 Neon Pilot과 혼합 저장: 금지
- Production 반영: 금지
- 목표: **참고영상에서 확인된 4개의 핵심 웹 문법을 높은 충실도로 하나의 LoveTree 인터랙티브 홈페이지로 구현**

---

# 0. 제품 오너 지시의 해석

이번 작업은 “영상에서 아이디어만 얻어 LoveTree스럽게 새로 디자인”하는 작업이 아니다.

**영상에서 실제로 보이는 layout, scale, whitespace, glass material, portrait dominance, reveal interaction, landscape composition, modal behavior를 최대한 그대로 재현한 다음 내용만 LoveTree로 바꾼다.**

우선순위:

```text
Reference visual fidelity
> interaction fidelity
> spacing / scale / composition fidelity
> LoveTree content mapping
> 장식 추가
```

디자인팀장이 임의로:
- 종이 카드
- 꽃잎
- 큰 나무 일러스트
- 네온 HUD
- cockpit
- 복잡한 dashboard
를 추가해서 원본의 간결함을 깨면 안 된다.

---

# 1. 최종 산출물

이번 작업의 최우선 산출물:

```text
lovetree-49-moment-reveal-portal-v1.html
```

구성:

```text
01 Editorial Hero
02 Reveal Interaction
03 Moment Field
04 Tree Overview
05 Save Moment Modal
```

단일 HTML + assets 폴더를 허용한다.

작동하는 웹페이지여야 한다.

정적 스크린샷 연결은 불합격이다.

---

# 2. REFERENCE A — EDITORIAL HERO

참고영상 약 00:05~00:40, 03:35~05:55 구간의 흰색 Hero를 가장 충실하게 재현한다.

## 데스크톱 1440×900 기준 구성

### 배경
- `#F5F5F1` ~ `#FAFAF7`
- 순백보다 약간 따뜻한 ivory
- texture 거의 없음
- gradient 금지 또는 육안으로 거의 보이지 않는 수준

### Header
높이 약 64~74px.

좌:
```text
LOVETREE
```

중앙:
검정 pill navigation.

```text
Moments
Connections
Routes
Tree
```

우:
작은 pill.

```text
OPEN MY TREE
```

Header가 화면을 지배하면 안 된다.

### 중앙 Portrait

화면의 시각 우선순위 1위.

- viewport 폭 약 42~56%
- 세로는 화면 하단을 거의 가득 채움
- 머리는 viewport 중앙~상단 1/3
- 어깨/가슴이 화면 아래로 자연스럽게 잘림
- low-angle 느낌
- 인물을 카드 안에 넣지 않는다
- 그림자 box 금지
- 별도 frame 금지
- background와 인물이 직접 만남

### 좌측 Headline

예시:

```text
Keep the
moment that
moved you.
```

또는:

```text
Follow what
made your
heart move.
```

최종 문구는 디자인팀장이 임의로 장문 작성하지 말고 이 두 안 중 하나를 사용.

스타일:
- black
- 매우 굵은 grotesk/sans
- 72~104px desktop
- line-height 0.88~0.95
- letter-spacing -0.045em
- 최대 3줄
- 인물과 일부 시각적 긴장감을 만들되 얼굴을 가리지는 않음

### 작은 copy

headline 아래:
```text
Save first.
Understand the path later.
```

2줄 이내.

### 우측 secondary statement

영상의 “50+ Brands...” 위치를 가져오되 가짜 성과 숫자는 쓰지 않는다.

사용:
```text
ONE MOMENT
CAN OPEN
THE NEXT.
```

### 하단 meta

좌:
```text
MOMENT / CONNECTION / ROUTE
```

우:
```text
REPLAY THE PATH
```

---

# 3. HERO REVEAL — 이 작업의 대표 인터랙션

참고영상에서 원본 얼굴에 futuristic mask가 덧씌워지는 제작과정을 LoveTree의 `Moment Reveal`로 재현한다.

중요:
**인물이 통째로 다른 AI 얼굴로 변하면 안 된다.**

기본 얼굴은 동일해야 한다.

## 구현

HERO_PORTRAIT 위에:

```text
HERO_REVEAL_OVERLAY
```

를 동일 좌표로 겹친다.

Overlay는:
- 턱
- 입 주변
- 볼 일부
정도만 감싼다.

### pointer move
포인터가 인물 근처로 갈 때:
- overlay opacity 0.0 → 1.0
- clip-path가 중앙/하관에서 확장
- 450~700ms
- cubic-bezier(0.22,1,0.36,1)

### scroll
Hero를 아래로 스크롤하면:
- 0~35%: 원본 얼굴
- 35~70%: overlay reveal
- 70~100%: overlay fully visible + 아주 얇은 signal line

### 강조효과
- 광택 1회 sweep
- 1px tracing line
- subtle chromatic reflection
- 얼굴 자체 distortion 금지
- 과한 glitch 금지

텍스트:
```text
MOMENT REVEALED
```
를 아주 작게 1회 보여도 됨.

---

# 4. HERO → MOMENT FIELD 전환

일반 section scroll처럼 딱 끊기지 않는다.

Hero portrait가 약간 커지고:
- background white
- → pale green
- → landscape

로 연결되어야 한다.

권장:
- 100vh Hero pinned
- 다음 60~90vh 동안 transition
- portrait scale 1 → 1.06
- headline opacity 1 → 0
- reveal overlay glow
- landscape opacity 0 → 1

Moment Field가 보일 때 portrait는 사라진다.

---

# 5. REFERENCE B — MOMENT FIELD

참고영상 약 00:10~00:15 및 05:55~06:20의 초원/Glass Board를 높은 충실도로 구현한다.

## 배경

`LANDSCAPE_DAY`

전체 viewport cover.

필수:
- 살아있는 언덕/들판/산/계곡
- 화면 깊이
- 카드보다 배경이 먼저 보임

background:
```css
object-fit: cover;
```

Ken Burns:
- 12~20초에 scale 1.00 → 1.025
- 거의 느끼지 못할 정도

## Top controls

좌상단:
- 36~44px avatar
- day/night toggle

중앙:
pill status

```text
A moment is ready to revisit
```

우:
```text
Tree
Rooms
```

---

# 6. Floating Moment Cards

6개를 기본.

권장 grid:

```text
[ Moment A ][ Moment B ][ Moment C ]
[ Moment D ][ Moment E ][ Moment F ]
```

기계적으로 같은 크기로 만들지 않는다.

예:
- large
- medium
- narrow
크기를 2~3종 섞는다.

## Card style

DAY:
```css
background: rgba(255,255,255,.58);
backdrop-filter: blur(26px) saturate(120%);
border: 1px solid rgba(255,255,255,.55);
border-radius: 24px;
```

NIGHT:
```css
background: rgba(10,14,16,.48);
border: 1px solid rgba(255,255,255,.12);
```

shadow는 매우 약하게.

카드 내부:
- Moment title
- small source/type
- 2~4 avatars
- 작은 thumbnail 또는 waveform
- action dot/button

예시 데이터:

```text
The stage where I noticed him
First comeback night
That one fancam
The interview I replayed
The moment the song clicked
The photo I couldn't forget
```

이 텍스트는 prototype demo data다.

---

# 7. 기존 아이돌 자산 사용 지시

여기서 다시 새 사람을 20명 생성하지 않는다.

먼저 다음 기존 자산을 활용한다.

LoveTree 48:
```text
02_Gate0_캐스팅_얼굴
03_Gate1_전신CharacterBible
04_Gate2A_CardinalViews
05_Gate2B_IntermediateViews
09_재활용승격_아이돌MomentPool_v2
```

Moment card thumbnail에는:
- 서로 다른 얼굴
- 서로 다른 각도
- 전신
- 얼굴
- 손/의상 detail
을 섞는다.

48의 `ZZ_절대사용금지_초기실패봉인`은 절대 사용 금지.

---

# 8. Bottom Dock

참고영상의 하단 avatar dock을 그대로 활용한다.

화면 하단 중앙.

둥근 translucent rail.

안에 6~8개 circular control.

LoveTree 의미:
- ALL
- MEMBER
- MV
- FANCAM
- INTERVIEW
- PHOTO
- LIVE

글자를 전부 표시하지 말고 hover tooltip 허용.

selected item이 커지는 정도:
```text
scale 1.00 → 1.16
```

---

# 9. Day / Night Toggle

참고영상에서 같은 board가 white glass ↔ dark glass로 변하는 것이 중요하다.

toggle 클릭 시:

```text
LANDSCAPE_DAY
→ LANDSCAPE_NIGHT
```

transition:
- 900~1400ms cross dissolve

동시에:
- glass white → dark
- text dark → white
- ambient shadow 변화
- dock material 변화

layout 위치는 변하지 않는다.

**테마 변경 때문에 카드가 재배치되면 실패.**

---

# 10. Moment Card Interaction

Hover:
- translateY(-5px)
- scale 1.012 이하
- border highlight
- thumbnail 1.00→1.04

cursor parallax:
- 카드마다 최대 ±6px
- background 최대 ±3px
- 멀미나는 3D tilt 금지

Click:
Moment Detail overlay 또는 next section으로 연결.

이번 v1에서는 route preview를 작게 노출.

```text
THIS MOMENT
↓
NEXT CONNECTION
↓
NEXT MOMENT
```

---

# 11. REFERENCE C — TREE OVERVIEW

참고영상 약 08:10~10:35의 tropical/mountain dashboard를 따라간다.

Moment Field에서 아래로 더 스크롤하면:

```text
TREE OVERVIEW
```

로 진입.

배경:
- full-screen landscape
- twilight / mountain / forest / valley

카드가 배경을 덮지 않는다.

## Header
좌:
```text
My Tree
```

중앙:
```text
Overview
Moments
Connections
Routes
```

우:
avatar/settings

## Main

중앙 큰 제목:
```text
Overview
```

보조:
```text
A path made from the moments you kept.
```

## Demo metrics

HTML 안의 mock moment array를 실제 계산해서 보여준다.

예:
```js
moments.length
connections.length
routes.length
```

숫자를 HTML에 임의로 고정해서 “실제 사용자 수치”처럼 보이게 하지 않는다.

label:
```text
Moments
Connections
Routes
```

## Left glass panel
- current tree cover
- tree title
- short memory note
- visibility

## Center
- recent moment list
- thin connection lines
- very light timeline

## Right
- Quick actions
  - Save Moment
  - Revisit Route
  - Open Connections

재질:
solid white dashboard 금지.

outline + blur + transparent glass.

---

# 12. REFERENCE D — SAVE MOMENT MODAL

참고영상 약 10:40~11:05.

`Save Moment` 클릭 시:

배경 dim:
```css
rgba(0,0,0,.72)
```

center panel:
- width desktop 380~440px
- mobile calc(100vw - 32px)
- black/dark graphite
- 18~24px radius
- shadow
- thin border

상단:
```text
SAVE THIS MOMENT
```

image preview.

fields:
```text
What moved you?
Person / Work
Visibility
```

buttons:
```text
Cancel
Save Moment
```

저장 후:
작은 confirmation dialog.

```text
Moment saved.
Add a connection now?
```

actions:
```text
Later
Connect
```

실제 backend 저장은 이번 디자인 prototype에서 요구하지 않는다.
local state/localStorage mock은 허용.

---

# 13. 이미지 요구사항

## 13.1 HERO

우선순위:
1. 기존 LoveTree clean portrait 중 적합한 이미지 탐색
2. 없으면 신규 1장만 생성

신규 생성 시:

```text
young male idol / trainee editorial portrait
low-angle camera
clean ivory studio background
head and shoulders
black or muted modern styling
calm confident expression
high-end Korean fashion editorial
soft daylight
no text
no logo
no sci-fi background
```

비율:
4:5 또는 3:4
최소 2000px

## 13.2 REVEAL OVERLAY

새 인물 사진을 만들지 말고:
- SVG
- transparent PNG
- CSS shape
중 하나로 기존 portrait 위에 합성.

형태:
- polished translucent tech mask
- cheek/chin/jaw coverage
- clear acrylic + silver/graphite
- subtle blue/green highlight

## 13.3 LANDSCAPE PAIR

가능하면 한 쌍 신규 제작:

### DAY
- rolling green hills or mountain valley
- gentle sunlight
- premium cinematic photo
- no people
- no buildings dominating

### NIGHT
- same composition
- twilight/blue hour
- subtle stars or moonlight
- no fantasy castle
- no neon city

같은 구도 유지가 핵심.

---

# 14. TYPOGRAPHY

Hero는 참고영상처럼 강한 sans/grotesk.

우선 시스템에서 사용 가능한 폰트.

기준:
- title: weight 700~900
- small UI: 500~650
- letter spacing headline negative
- small UI uppercase는 약간 positive

사용 가능한 폰트를 확인하지 않고 특정 유료 폰트 파일을 프로젝트에 넣지 않는다.

---

# 15. 컬러

Hero:
```text
Ivory #F5F5F1
Ink #10110F
Muted #74766F
```

Moment Field:
background image dominant.

Glass:
white translucent.

Night:
navy/black translucent.

LoveTree accent는 최소 사용:
```text
#A6FF00 같은 Neon Pilot lime를 그대로 주색으로 쓰지 않는다.
```

이번 후보는 자연/편집디자인 계열.

필요한 accent:
- leaf green
- pale sky
- warm peach
중 하나만.

---

# 16. MOTION SYSTEM

전체 페이지가 과도하게 튀면 안 된다.

## Hero
- portrait float: 3~6px
- reveal: 450~700ms
- text fade/slide: 500~800ms

## Moment Field
- card entrance stagger 60~100ms
- hover 180~260ms
- landscape 12~20s slow zoom

## Overview
- glass panel fade 400~700ms
- line draw 600~1200ms

## Modal
- backdrop 180ms
- panel scale .97 → 1.00
- opacity 0 → 1
- 220~320ms

---

# 17. MOBILE

참고영상에서 mobile frame을 따로 검증하는 제작방식을 따른다.

390×844 필수.

Hero:
- header simplification
- portrait 90~110vw
- headline 46~62px
- headline은 얼굴 위를 심하게 덮지 않는다

Moment Field:
- 6개 card grid를 한 열로 길게 만들지 말 것
- horizontal spatial carousel 또는 2열 stagger
- 배경 scenery 계속 보이게 함

Overview:
- 주요 수치 3개 first row
- panels는 bottom sheet / horizontal swipe 허용

Modal:
- 거의 full-width
- keyboard overflow 점검

---

# 18. 구현 기술

허용:
- HTML/CSS/JS
- SVG
- Canvas 필요 시
- Web Animations API
- IntersectionObserver
- CSS mask / clip-path
- backdrop-filter
- localStorage demo

필수 아님:
- Three.js
- React
- 외부 backend

이번 v1에서 빠른 고충실도 HTML이 우선.

---

# 19. 반드시 구현할 실제 상호작용

체크리스트:

```text
[ ] Hero reveal 작동
[ ] Hero → landscape transition 작동
[ ] 6개 이상 Moment card
[ ] card hover
[ ] card click
[ ] day/night toggle
[ ] bottom dock filter 선택상태
[ ] Tree Overview
[ ] Save Moment modal
[ ] Save confirmation
[ ] desktop responsive
[ ] mobile responsive
[ ] console error 0
```

---

# 20. 자동 반려 기준

다음은 FAIL.

### A
흰색 Hero가 일반 LoveTree 카드형 홈페이지로 변형됨.

### B
대형 인물보다 기능 설명이나 카드가 먼저 보임.

### C
Hero portrait를 사각 카드에 넣음.

### D
Reveal이 인물 자체를 다른 얼굴로 바꾸는 AI crossfade가 됨.

### E
Moment Field 배경이 그냥 gradient이고 landscape가 없음.

### F
Glass cards가 불투명한 SaaS dashboard card처럼 보임.

### G
Day/Night toggle에서 layout까지 바뀜.

### H
Overview가 일반 관리자 dashboard처럼 보임.

### I
기존 LoveTree 48 Neon Pilot의 SF HUD를 이 후보에 과도하게 가져옴.

### J
영상 속 원 브랜드의 로고/이름/성과수치를 그대로 복사.

### K
정적 이미지 몇 장만 이어놓고 interaction이 없음.

---

# 21. 제출 파일

```text
lovetree-49-moment-reveal-portal-v1.html
```

support:

```text
assets/
implementation-report-v1.md
validation-results-v1.json
desktop-execution-v1.mp4
mobile-execution-v1.mp4
reference-vs-result-v1.jpg
```

프로젝트 폴더:

```text
49_아이돌모먼트_리빌포털_분류대기/
├─ 00_작업상태_설계지시/
├─ 01_참고영상_분석/
├─ 02_이미지자산/
├─ 03_HTML결과물/
└─ 90_이전버전/
```

---

# 22. 최종 PASS 질문

결과물을 본 사람이 영상의 레퍼런스와 비교했을 때:

> “흰색 대형 인물 Hero의 압도감, 얼굴 위 리빌, 초원 위 떠 있는 glass cards, 풍경 속 Overview, centered save modal을 그대로 가져와 LoveTree의 Moment 여정으로 바꿨다.”

라고 느껴져야 한다.

“LoveTree답게 새로 해석했다”는 이유로 원본 레이아웃이 사라지면 FAIL이다.

이번 v1에서는 **참고영상 충실도가 우선**이다.

---

# 23. 지금 바로 시작할 순서

```text
1. 기존 자산에서 HERO 후보 3개 확인
2. 가장 적합한 1개 선택
3. overlay는 SVG/PNG로 제작
4. landscape day/night pair 확보
5. Hero부터 HTML 구현
6. Moment Field 구현
7. Overview 구현
8. Save modal 구현
9. mobile 구현
10. reference 비교
```

이미지 제작 때문에 HTML을 멈추지 않는다.

HERO가 완벽하지 않아도 기존 자산으로 HTML 구조를 먼저 만든다.
그 후 필요성이 확인되면 HERO 1장 또는 LANDSCAPE pair만 신규 생성한다.
