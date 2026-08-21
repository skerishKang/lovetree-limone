# LoveTree 디자인팀장 6기 — 신규 작업지시
## Track 57 · LIVING GLASS MOMENT CARDS V1
### `컬러카드마인드맵_자동전개.mp4` 분석 기반 / 44 자동전개 마인드맵과 분리

작성일: 2026-08-11  
담당: **LoveTree 디자인팀장 6기**  
상태: **신규 후보 제작 / 제품 오너 승인 전 미채택**  
신규 트랙: `57_LoveTree_Living_Glass_Moment_Cards_V1`

---

# 0. 제품 오너 최신 정정 — 44와 합치지 않는다

이 작업은 기존 LoveTree 44 `자동전개 마인드맵 / Tree Composer`의 후속 버전이 아니다.

이전의:
`04_44_COLOR_GLASS_CARD_AUTO_UNFOLD_V2.5_디자인팀장6기_수정지시_2026-08-11`

은 **잘못된 계열 매칭이므로 실행하지 않는다.**

44는 그대로 보존한다.

이번 참고영상은 기능적으로 다음 계열이다.

> **interactive glass card**
> + **3D tilt-on-hover**
> + **spring return**
> + **cursor-following glare**
> + **layered depth**

따라서 **신규 Track 57**로 분리한다.

---

# 1. 참고영상에서 실제로 가져갈 것

참고영상:
`컬러카드마인드맵_자동전개.mp4`

영상에서 시각적으로 중요한 것은 “마인드맵”이 아니다.

핵심은 화면 중앙에 놓인 여러 개의 독립적인 Glass Card가
사용자 포인터에 따라 살아 있는 물체처럼 반응하는 인터랙션이다.

관찰해야 할 요소:

1. dark graphite / smoky background
2. violet / rose / amber 계열의 컬러 glass card
3. 카드 표면의 반투명 재질
4. 카드 안쪽의 깊이 있는 gradient
5. 넓게 번지는 colored glow
6. 둥근 모서리와 미세한 glass border
7. 카드 hover 시 실제 입체판처럼 기울어지는 tilt
8. 포인터 위치를 따라가는 glare/highlight
9. pointer leave 후 딱 끊기지 않고 spring처럼 복귀
10. card 내부 icon / title / short text / pill CTA의 계층
11. 여러 카드가 각각 다른 색을 갖지만 전체 화면은 하나의 premium system으로 보임

중요:

**이 영상에서 마인드맵 노드 자동전개, branch 생성, Connection graph가 핵심이라고 해석하지 않는다.**

---

# 2. LoveTree 적용 정의

이번 기능의 이름:

## `LIVING GLASS MOMENT CARD`

정의:

> **사용자가 저장한 Moment를 평면 카드가 아니라, 감정과 기억의 깊이를 가진 “살아 있는 기억 조각”처럼 보여주는 LoveTree의 premium interactive card language.**

이것은 새로운 저장 데이터 모델이 아니다.

기존 LoveTree Moment 데이터를 표현하는 **새로운 View / reusable visual component**다.

LoveTree Core는 그대로 유지한다.

`Moment → Connection → Next Moment → Emotional Path → Tree`

Track 57은 여기서 **Moment의 표현 방식**을 발전시킨다.

---

# 3. 44 / 54 / 55 / 57 역할 분리

## 44
`Tree Composer / Structure View`

- 다수 Moment
- Connection
- branch
- 자동전개
- 구조 보기

## 54
`Studio / 팬심 다이어리 + 감정경로 편집`

- 날짜
- 감정
- 메모
- 출처
- 팬심 단계
- 다시보기 순서

## 55
`LUPT Connection Router`

- 사용자가 Connection을 직접 연결
- free wiring
- reroute

## 57
`Living Glass Moment Cards`

- 한 Moment 자체를 premium interactive object처럼 감상
- hover / tilt / glare / spring / depth
- Signature Moments / Recent Moments / Highlight Moments 등에 재사용

**57에 마인드맵 기능을 억지로 넣지 않는다.**

---

# 4. 제품에서 어디에 쓰는가

57은 단독 “또 하나의 메인 메뉴”를 먼저 만드는 것이 아니다.

우선 다음 위치에서 재사용 가능한 카드 시스템으로 본다.

### A. Signature Moments
사용자가 특히 아끼는 3~8개의 Moment를 고급 카드로 보여준다.

### B. Tree Detail
Tree 안에서 선택한 핵심 Moment를 Living Glass Card로 확대 감상한다.

### C. Recent Moments
최근 저장한 Moment를 평범한 리스트 대신 살아 있는 카드로 보여주는 특수 View 후보.

### D. Milestone / Retrospective
100개, 300개 같은 특정 수치를 정책으로 고정하지 말고,
마일스톤 회고 화면에서 “기억 카드” 표현에 사용할 수 있다.

### E. Share / Profile Highlight
공유 가능한 핵심 Moment 카드의 premium visual template 후보.

이번 V1에서는 **A. Signature Moments**를 대표 데모로 사용한다.

---

# 5. V1 데모 제품명

화면 브랜드:

**LOVETREE · LIVING MOMENTS**

보조명:

`GLASS MEMORY COLLECTION`

설명:

`가장 오래 남은 순간을, 살아 있는 기억 카드로 다시 봅니다.`

generic SaaS 문구 금지.

---

# 6. 첫 화면 — 3개의 Signature Moment

처음 화면에는 3개의 카드가 보여도 된다.

하지만 의미는 반드시 LoveTree여야 한다.

예:

## CARD 1
`FIRST MOMENT`
`처음 눈에 들어온 무대`
`4월 6일`
`설렘`

## CARD 2
`TURNING MOMENT`
`계속 찾아보게 된 직캠`
`4월 23일`
`몰입`

## CARD 3
`NOW`
`지금 가장 아끼는 순간`
`8월 11일`
`확신`

각 카드에는 실제 Moment thumbnail 또는 미디어 layer가 있어야 한다.

빈 컬러 카드 3개에 텍스트만 넣고 끝내지 않는다.

---

# 7. Card Visual Anatomy

각 카드 최소 layer:

1. **back glow**
2. **glass body**
3. **media image/video thumbnail layer**
4. **dark/colored overlay**
5. **emotion aura**
6. **small type label**
7. **Moment title**
8. **date + emotion**
9. **small Connection cue**
10. **CTA**
11. **cursor glare**
12. **edge highlight**

카드 내부 요소가 모두 한 평면에 붙어 보이면 안 된다.

---

# 8. 진짜 핵심 — 3D Tilt-on-Hover

WebGL 필요 없다.

이번 작업에서 56처럼 억지 3D mesh를 만들지 않는다.

DOM/CSS transform 기반의 고품질 2.5D가 적합하다.

권장:

`perspective: 1000~1400px`

포인터 위치를 카드 중심 기준 정규화:

- x = -1 ~ 1
- y = -1 ~ 1

target:

- `rotateY`: 약 -8° ~ +8°
- `rotateX`: 약 +6° ~ -6°

과도하게 15~25° 돌리지 않는다.

카드는 “장난감 카드”가 아니라
**묵직한 glass slab**처럼 움직여야 한다.

---

# 9. Spring Physics

pointer leave 시:

`transform: rotateX(0) rotateY(0)`

로 단순 CSS transition 복귀만 하지 않는다.

spring / damped motion을 구현한다.

필수 감각:

- 약간의 inertia
- overshoot는 매우 작게
- 빠르게 흔들리지 않음
- 450~750ms 안에 안정화
- premium, calm

직접 spring solver / requestAnimationFrame 가능.
적절한 기존 local utility가 있으면 사용 가능.

외부 dependency를 단순 효과 하나 때문에 추가하지 않는다.

---

# 10. Cursor-following Glare

이번 벤치마크의 핵심.

마우스 좌표가 카드에서 움직이면
glare hotspot도 함께 이동해야 한다.

단순:

`box-shadow:hover`

금지.

권장:

- CSS custom properties `--mx`, `--my`
- radial-gradient center가 pointer와 연결
- upper highlight + lower color reflection 분리
- 각도에 따라 edge highlight도 변화

glare는 흰 동그라미처럼 보여선 안 된다.

느낌:

**유리 표면에 주변 광원이 반사되는 것**

---

# 11. Layered Parallax

카드가 tilt할 때 내부도 약간 다른 깊이로 움직인다.

예:

- media: translateZ(8~14px)
- title: 18~24px
- emotion chip: 24~30px
- icon: 30~38px
- glare: surface layer

단, 과장 금지.

텍스트가 카드 밖으로 튀어나오는 게임 HUD처럼 보이면 FAIL.

---

# 12. 카드 재질

색상:

- violet / indigo
- rose / magenta
- amber / warm gold
- 필요 시 cyan / pearl ivory

하지만 색은 랜덤이 아니다.

**Moment emotion을 기반으로 tone을 선택**한다.

예:

- 궁금함 → violet
- 설렘 → rose
- 몰입 → indigo
- 감동 → deep rose
- 편안함 → cyan / pearl
- 확신 / 따뜻함 → amber
- 그리움 → muted violet rose

카드에는 반드시 emotion text도 표시한다.

색만으로 의미 전달하지 않는다.

---

# 13. Background

참고영상처럼 dark premium background 사용 가능.

그러나 generic AI dashboard가 되면 안 된다.

권장:

- near-black / charcoal
- subtle rose/violet memory haze
- 아주 낮은 opacity의 petal trace
- soft vignette
- slow ambient gradient shift

금지:

- polygon HUD
- cockpit
- radar
- cyber grid
- 과도한 particle storm
- fluorescent neon tunnel

---

# 14. Hover / Focus State

## Idle
카드는 이미 아름다워야 한다.

## Hover
- tilt
- glare
- glow +10~20%
- edge highlight
- 아주 작은 float

## Selected
클릭하면 해당 카드가 focus된다.

- scale 1.02~1.05
- 주변 카드 slightly dim
- card detail 열림
- connection cue 표시

다른 카드를 완전히 숨기지 않는다.

---

# 15. 카드 클릭 후 실제 LoveTree 정보

카드를 클릭하면 상세 layer 또는 side/bottom panel이 열린다.

최소:

- Moment title
- date
- emotion
- source / media
- 내 메모
- person(optional)
- privacy indicator
- Connection reason

Connection reason:

`왜 다음 순간으로 이어졌나요?`

예:

`이 표정이 계속 생각나서 다른 직캠을 찾아봤어요.`

이 내용은 57이 예쁜 포트폴리오 카드 사이트로 끝나지 않게 하는 핵심이다.

---

# 16. Next Moment Transition

57은 graph가 아니지만
LoveTree의 Connection을 느낄 수 있어야 한다.

Selected card detail에서:

**`다음 순간 보기`**

를 누르면:

1. 현재 card glow가 edge 방향으로 흐름
2. 작은 luminous thread가 다음 카드 방향을 암시
3. 다음 card가 focus
4. WHY NEXT가 짧게 표시
5. 기존 card는 다시 idle

즉 **card-to-card emotional navigation**이다.

선을 전체 화면에 상시 그리는 마인드맵은 아니다.

---

# 17. Connection Cue

각 카드 하단 또는 edge에 아주 작게:

`다음으로 이어진 이유`

또는

`+2 CONNECTIONS`

같은 cue를 둘 수 있다.

hover / select 전에는 과도한 설명을 하지 않는다.

카드의 visual fidelity가 먼저다.

---

# 18. 미디어

실제 Moment의 핵심은 콘텐츠다.

지원 표현:

- photo
- video thumbnail
- YouTube thumbnail
- text-only Moment fallback

카드 안에서 video 자동재생 금지.

필요 시:
`Moment 열기`

→ modal / expanded viewer.

---

# 19. 카드 수

벤치마크가 3카드라고 해서 제품을 3개로 제한하지 않는다.

V1 데모:

- 3개의 Signature Moment main
- 하단 또는 next control로 6~8 Moment 추가 탐색 가능

많은 Moment 전체를 이 View에 한꺼번에 펼치지 않는다.

이것은 Tree 전체 구조 화면이 아니라
**선택된 기억을 고품질로 보는 View**다.

---

# 20. 모바일

hover가 없으므로 별도 interaction 필요.

모바일:

- 카드 touch + small drag → tilt
- release → spring return
- tap → select/detail
- horizontal swipe → next card

device orientation permission은 V1 필수 아님.

모바일에서도 glare를 단순 중앙 고정하지 말고
touch position에 반응 가능하면 구현.

---

# 21. Reduced Motion

`prefers-reduced-motion` 대응.

reduced motion:

- tilt amplitude 0 또는 최소화
- spring 제거
- glare는 부드러운 opacity 이동
- 카드 정보 기능은 동일

---

# 22. Visual Fidelity Gate — 기능보다 먼저

이번 작업은 **첫 화면 비주얼을 먼저 검증**한다.

HTML 전체 기능을 다 만들기 전에
첫 화면 3카드 상태를 완성하고 캡처한다.

PASS 기준:

- 참고영상처럼 glass depth가 느껴짐
- 카드가 단순 CSS gradient box처럼 안 보임
- glare가 표면 반사처럼 보임
- tilt가 싸구려 hover effect 같지 않음
- 텍스트 hierarchy가 premium
- dark background와 카드가 분리됨
- Moment media가 자연스럽게 material 안에 녹아 있음

이 Gate 실패 상태에서 기능을 계속 쌓지 않는다.

---

# 23. Reference Fidelity

참고영상에서 반드시 재현해야 하는 “동작 속성”:

1. pointer-responsive card
2. 3D tilt
3. smooth spring return
4. cursor-follow glare
5. layered depth
6. colored glass glow
7. independent card identities
8. premium dark composition

반드시 그대로 복제할 필요 없는 것:

- 원 영상의 텍스트
- 원 영상의 icon
- generic CTA
- 정확한 카드 색 순서
- 카드 개수 3 고정
- 원 배경의 장식

---

# 24. LoveTree Identity

LoveTree답게 만드는 요소는 다음이다.

- 실제 Moment media
- emotion
- date
- note
- WHY NEXT
- Connection cue
- First Moment / Turning Moment / Now
- rose/violet/ivory emotional palette
- subtle petal/branch motif

큰 나무 그림을 카드마다 넣지 않는다.

LoveTree라는 의미를
**데이터와 상호작용**으로 만든다.

---

# 25. 폰트

한국어 우선.

권장:

- Pretendard
- SUIT
- Noto Sans KR
- Apple SD Gothic Neo
- Malgun Gothic
- system sans

serif / 명조 금지.

영문 label은 작게 병기 가능.

---

# 26. 사용자 카피

예:

`FIRST MOMENT`
`처음 눈에 들어온 무대`

`TURNING MOMENT`
`계속 찾아보게 된 직캠`

`NOW`
`지금 가장 아끼는 순간`

CTA:

- `Moment 열기`
- `다음 순간 보기`
- `이 Connection 보기`
- `내 메모`
- `다시 보기`

---

# 27. 기술 구현 방향

권장:

- semantic HTML
- CSS 3D transform
- pointer events
- requestAnimationFrame spring
- CSS custom property glare
- local assets

Three.js / raw WebGL은 필요 없음.

**이번 작업은 “진짜 3D 모델” 경쟁이 아니다.**

고급스럽고 매끄러운 interactive surface가 목표다.

---

# 28. 실제 데이터 구조

Prototype 최소:

```js
moments = [
  {
    id,
    title,
    date,
    emotion,
    tone,
    mediaType,
    thumbnail,
    source,
    note,
    privacy,
    nextConnections:[]
  }
]

connections = [
  {
    id,
    fromMomentId,
    toMomentId,
    whyNext
  }
]
```

카드의 color/tone은 moment emotion에서 파생 가능.

---

# 29. 필수 Interaction QA

Desktop:

- hover tilt 5/5
- glare follows pointer 5/5
- pointer leave spring return 5/5
- fast pointer enter/leave 안정
- card select 5/5
- detail open/close
- next Moment transition
- WHY NEXT
- media viewer
- keyboard focus
- Escape close

Mobile:

- touch tilt
- release spring
- tap select
- swipe next
- detail
- overflow 0

Runtime:

- console error 0
- page error 0
- failed asset 0
- external hotlink 0

---

# 30. Visual QA

반드시 실제 화면을 보고 판단.

HARD FAIL:

- hover가 scale 1.05뿐
- glare가 중앙 흰 원
- 카드가 flat rectangle
- spring 없이 딱 멈춤
- text가 unreadable
- neon이 과도함
- 모든 카드가 같은 움직임만 반복
- media가 카드 위에 그냥 붙은 thumbnail처럼 보임
- generic AI dashboard 느낌
- 카드만 예쁘고 Moment/Connection 의미가 없음

---

# 31. 폴더 구조

신규:

`57_LoveTree_Living_Glass_Moment_Cards_V1/`

루트:

- `★_현재후보_57_LIVING_GLASS_MOMENT_CARDS.html`
- `★_실행영상_57_LIVING_GLASS_MOMENT_CARDS.mp4`
- `★_참고영상_컬러카드마인드맵_자동전개.mp4`
- `★_57_LIVING_GLASS_MOMENT_CARDS_사용설명서.txt`
- `57_LIVING_GLASS_MOMENT_CARDS_PACKAGE.zip`

하위:

- `01_지시·분석`
- `02_HTML`
- `03_ASSETS`
- `04_QA·리뷰`

제품 오너가 폴더를 열자마자
HTML / 실행영상 / 참고영상을 바로 비교할 수 있게 한다.

---

# 32. 사용설명서 TXT 필수

내용:

1. 이 화면이 무엇인지
2. 30초 빠른 시작
3. 카드에 마우스를 올리기
4. tilt / glare 의미
5. Moment 선택
6. Moment 열기
7. 감정 색
8. Connection 이유
9. 다음 순간 보기
10. 모바일 조작
11. prototype 한계

---

# 33. 실행영상

실제 Chromium 녹화.

반드시 포함:

1. 첫 화면 3카드
2. violet card hover
3. pointer를 좌/우/상/하로 움직여 tilt 확인
4. glare가 pointer 따라 이동
5. pointer leave spring return
6. rose card hover
7. amber card hover
8. card select
9. detail open
10. WHY NEXT
11. `다음 순간 보기`
12. next card focus
13. media viewer
14. mobile interaction 일부 또는 별도 영상

합성 영상 금지.

---

# 34. 44와 혼동 방지

다시 명시한다.

Track 57에 다음을 넣지 않는다.

- auto-unfold tree
- radial mind map
- branch editor
- Person / Emotion / Season projection tabs
- Tree Composer 기능 복제
- 44의 v2.4 코드 대규모 복사

44는 구조를 보는 도구.

57은 Moment를 살아 있는 glass object로 보는 표현 시스템.

---

# 35. 제품 적용 판단

현재 단계:

**제안 / 후보**

아직 LoveTree 기본 카드 UI로 채택하지 않는다.

V1에서 먼저 검증할 것:

- 실제로 참고영상 수준의 premium tactile feeling이 나는가
- 팬 Moment를 더 소중하게 느끼게 하는가
- 과한 효과 때문에 읽기 불편하지 않은가
- 반복 사용 시 피로하지 않은가

PASS하면 이후:
- Signature Moments
- Tree Detail
- Profile Highlight
- Milestone
등에 선택적으로 접목 검토.

---

# 36. 성공 기준

제품 오너가 설명 없이 만져보고:

> “카드가 진짜 유리 조각처럼 살아 움직이네.”

> “마우스 위치대로 빛이 움직이는 게 참고영상 느낌이 난다.”

> “그냥 예쁜 카드가 아니라 내가 저장한 Moment를 보는 방식이구나.”

> “감정에 따라 카드 색이 달라지고, 다음 순간으로 이어진 이유도 볼 수 있네.”

라고 느껴야 성공이다.

---

# 최종 명령

**THIS IS NOT LOVE TREE 44.**

**DO NOT BUILD A MIND MAP.**

**BUILD A LIVING MOMENT CARD.**

**MATCH THE REFERENCE IN TILT, SPRING, GLARE, GLASS DEPTH, AND PREMIUM FEEL.**

**USE CSS/DOM 2.5D IF IT LOOKS BETTER. DO NOT FORCE WEBGL.**

**THE CARD IS A MOMENT.**

**COLOR IS EMOTION.**

**THE GLASS IS THE MEMORY MATERIAL.**

**THE NEXT CARD IS REACHED THROUGH A CONNECTION REASON.**

**MAKE THE USER FEEL THAT A SAVED MOMENT IS SOMETHING WORTH TOUCHING AGAIN.**
