# LoveTree 55 — LUPT Living Connection Router V1
## 디자인팀장 5기 1차 작업지시서
작성일: 2026-08-10  
상태: **NEW CANDIDATE / PRODUCT OWNER REVIEW 전**  
담당: **LoveTree 디자인팀장 5기**

---

# 0. 이번 지시의 한 문장

**첨부 벤치마크 영상의 “케이블이 묶이고, 갈라지고, 노드가 움직이면 연결선 전체가 실시간으로 다시 정리되는 구조”를 거의 그대로 LoveTree의 Moment–Connection 시스템에 이식하고, 그 연결을 정리하고 타고 다니는 새로운 `LUPT(럽트)` 후보를 실제 HTML 인터랙션으로 만든다.**

이번 작업은 단순 이미지 시안이 아니다.

**실제 드래그 / 실제 연결선 재계산 / 실제 path-following light / 실제 Moment 선택이 되는 standalone HTML**을 만든다.

---

# 1. 제품 오너 최신 결정 — 최우선

## 확정
- LoveTree의 기본 단위는 `Moment`다.
- `Connection`은 단순 선이 아니라 **“왜 다음 순간을 찾아갔는가”라는 감정의 인과관계**다.
- 사용자는 먼저 쉽게 저장하고, 나중에 정리할 수 있어야 한다.
- Tree는 정적 저장목록이 아니라 **처음의 감정을 다시 재생하는 경로**다.
- 이번 벤치마크의 케이블 관리 방식은 LoveTree의 Connection과 매우 잘 맞는다.
- 디자인팀장 5기가 기존에 잘 구현한 Track 53의 path-following light 엔진은 재사용 가치가 높다.
- 새로 만드는 럽트는 **기존 럽트를 삭제·덮어쓰는 것이 아니라 별도 후보**다.

## 금지
- 기존 승인된 캐릭터/파일 덮어쓰기 금지.
- Production 반영 금지.
- main 병합 금지.
- 기존 럽트 자산 삭제 금지.
- “벤치마크 비슷한 느낌”만 내고 실제 인터랙션 없이 끝내기 금지.
- Blender UI를 그대로 복제하거나 원본 영상/브랜드 자산을 페이지에 삽입하는 방식 금지.

---

# 2. 벤치마크 원본

파일:
`녹화_2026_08_09_17_12_36_587.mp4`

분석 기준:
- 전체 길이 약 **17.17초**
- 1920×1080
- 약 29.94fps
- 초반 약 1초는 X 게시물 화면
- 실제 벤치마크 본편은 Blender Geometry Nodes 계열의 **dynamic cable management** 데모

원본 게시물 화면에 보이는 핵심 문구:
- “yoooo cable management is catching up”
- quoted post: “kinda got it working”
- `#geometrynodes`

즉 이번 벤치마크의 본질은 **노드 디자인 자체가 아니라 cable routing behavior**다.

---

# 3. 영상 분석 — 반드시 그대로 이해할 것

## 3.1 화면 구조

벤치마크에는 여러 개의 직사각형 노드가 존재한다.

각 노드는:
- 고유 헤더 색
- 여러 input/output socket
- 여러 connection cable

을 가진다.

케이블은 단순히 A→B를 직선으로 잇지 않는다.

### 중요한 특징
1. 여러 선이 일정 구간에서 **평행한 묶음(bundle)** 으로 모인다.
2. 묶음은 하나의 공통 trunk처럼 움직인다.
3. 목적지에 가까워지면 다시 각 socket으로 **fan-out** 한다.
4. 중간에 작은 junction/reroute point가 존재한다.
5. junction을 움직이면 관련된 모든 선이 동시에 재배치된다.
6. 노드 위치가 바뀌어도 연결 endpoint는 끊기지 않는다.
7. 선이 순간이동하지 않고, 구조가 **탄성 있게 따라간다.**
8. 선들이 서로 완전히 겹쳐 한 줄이 되지 않고 일정 간격을 유지한다.
9. 여러 개가 하나의 경로를 공유하더라도 각 선의 identity는 유지된다.
10. 구조를 움직일 때 “spaghetti”가 아니라 **정리된 harness/cable loom**처럼 보인다.

---

# 4. 시간대별 핵심 동작

## A. 초기 상태
여러 노드와 여러 연결선이 존재한다.

각 선은 자기 source socket과 destination socket을 정확히 유지한다.

## B. Bundle 생성
여러 개의 연결선이 하나의 좁은 통로로 모인다.

핵심은:
- 완전 merge가 아니라
- **평행 lane을 유지한 bundle**

이다.

## C. Junction 이동
중간의 reroute/junction을 드래그한다.

그러면:
- bundle 전체가 따라 움직이고
- 앞·뒤 segment 길이가 바뀌고
- bend 위치가 실시간으로 조정된다.

## D. Destination 이동
오른쪽 목적 노드가 움직여도 cable topology가 깨지지 않는다.

새로운 bend가 생기거나 기존 bend가 이동하면서:
- source
- shared trunk
- branch
- destination

구조가 유지된다.

## E. 재정렬
마지막에는 다시 정돈된 상태로 수렴한다.

### 절대 놓치면 안 되는 느낌
**“선을 그리는 UI”가 아니라 “살아 있는 연결 다발을 손으로 정리하는 느낌”**

---

# 5. LoveTree로의 의미 변환

벤치마크의 요소를 아래처럼 바꾼다.

| Benchmark | LoveTree |
|---|---|
| Node | Moment Card |
| Socket | Moment의 감정/출처/Connection Port |
| Cable | Connection |
| Cable Bundle | 여러 순간이 공유하는 Emotional Path |
| Reroute Junction | LUPT Junction |
| Drag Node | Moment 재배치 |
| Drag Junction | 감정 경로 정리 |
| Fan-out | 공통 감정 경로에서 다음 Moment들로 분기 |
| Cable identity | 각 Connection의 이유/관계 보존 |
| Cable reflow | 트리/그래프 자동 재정리 |

---

# 6. 새로운 럽트 후보 — `LUPT / CONNECTION KEEPER`

## 제안
이번 V1의 럽트는 기존의 일반적인 “캐릭터 마스코트”를 또 만드는 방식으로 시작하지 않는다.

**럽트 자체가 Connection 안에 사는 작은 살아 있는 Junction**처럼 보이게 한다.

### 기본 외형
- 26~38px 정도의 작은 luminous core
- 중심은 ivory/white
- 주변 cyan + violet + rose halo
- 2개의 아주 작은 표정 점 또는 눈은 선택 가능
- 과도한 얼굴/팔/다리 금지
- 처음에는 **“빛나는 연결 생명체”** 쪽에 가깝게

### 핵심 정체성
럽트는 선 밖에서 설명만 하는 봇이 아니다.

**Connection 위에 실제로 올라가서 움직이고, 여러 연결을 모으고, 가지를 나누고, 경로를 정리하는 존재**다.

---

# 7. 럽트의 기능

## 7.1 AUTO TIDY
Moment가 추가되거나 이동하면 럽트가 해당 구간으로 이동한다.

말풍선:
- `이 길들을 같이 묶어둘게.`
- `여기서 마음이 갈라졌네.`
- `이 두 순간은 같은 이유로 이어졌어.`
- `다음 순간까지 길을 정리했어.`

그리고 실제 cable route가 재배치된다.

## 7.2 DRAG LUPT
사용자가 럽트를 직접 잡아 드래그할 수 있다.

럽트를 다른 위치에 놓으면:
- shared trunk 위치가 바뀌고
- 관련 Connection bundle 전체가 따라온다.

즉 벤치마크의 reroute point dragging을 LoveTree에서는 **럽트 dragging**으로 바꾼다.

## 7.3 FOLLOW CONNECTION
Connection 하나를 클릭하면 럽트가 그 선을 따라 이동한다.

이때 Track 53에서 검증한 방식처럼:
- `getTotalLength()`
- `getPointAtLength()`
- hot tip
- fading trail

을 적극 재사용한다.

## 7.4 WHY NEXT?
럽트가 목적 Moment에 도착하면:

`WHY NEXT?`

버튼 또는 작은 relation chip을 열고 실제 이유를 보여준다.

예:
- `웃는 표정이 더 궁금해서`
- `댓글 추천을 따라가서`
- `무대 밖 모습이 궁금해서`
- `같은 공연의 다른 직캠을 찾아서`

## 7.5 WALK THIS PATH
버튼 클릭 시:

`FIRST MOMENT → shared bundle → branch → NEXT MOMENT`

순으로 럽트와 빛이 함께 이동한다.

Tree가 단순 지도에 머무르지 않고 **Emotional Path Replay**가 되어야 한다.

---

# 8. 첫 프로토타입 화면 구조

V1은 너무 많은 기능을 넣지 않는다.

## 화면
- Full-screen dark canvas
- Moment 6~8개
- Connection 8~12개
- LUPT 1개
- 상단 최소 navigation
- 우측 또는 하단 작은 상태 패널

### Moment 카드
각 카드에:
- 썸네일
- Moment 번호
- 짧은 제목
- 감정 1개
- 날짜 또는 출처
- Connection port

정도만 표시한다.

카드가 Blender node처럼 보이면 안 된다.

**벤치마크의 구조는 가져오되 LoveTree의 Moment 카드로 재디자인**한다.

---

# 9. 추천 데모 데이터

하나의 팬 입덕 경로를 예시로 만든다.

### Moment 01
`처음 본 무대`
Emotion: CURIOSITY

↓

### Moment 02
`이 표정 뭐지?`
Emotion: SURPRISE

↓

### Moment 03
`웃는 모습`
Emotion: CUTE

여기까지 3개의 Connection이 한동안 같은 bundle을 공유한다.

그 뒤:

### Moment 04
`다른 직캠`
### Moment 05
`인터뷰`
### Moment 06
`팬미팅`
### Moment 07
`결정적 순간`

으로 가지가 갈라진다.

중요:
**여러 사람이 아니라 한 PRIMARY의 여러 Moment**를 사용한다.

---

# 10. Interaction Scenario

## STEP 1 — LOAD
처음 열면 6~8개의 Moment가 이미 연결되어 있다.

화면 중앙에 3~4개의 Connection이 깔끔한 bundle로 지나간다.

럽트는 bundle 위를 천천히 이동한다.

---

## STEP 2 — DRAG MOMENT
사용자가 Moment 03을 아래로 드래그한다.

### 반드시 발생해야 함
- 연결선 endpoint가 카드에서 떨어지지 않는다.
- shared bundle이 실시간으로 변형된다.
- branch angle이 조정된다.
- 다른 선과 겹치지 않도록 lane spacing을 유지한다.
- 애니메이션 도중 선이 사라지지 않는다.

---

## STEP 3 — DRAG LUPT
사용자가 럽트를 중앙 아래쪽으로 끌어간다.

그러면 럽트가 새로운 junction이 되고:
- 관련 3~4개 Connection이 럽트 위치로 모인다.
- 이후 목적지 쪽으로 다시 갈라진다.

**이 장면이 벤치마크와 가장 닮아야 한다.**

---

## STEP 4 — SELECT CONNECTION
선 하나를 클릭.

다른 선은 0.18~0.28 정도로 낮추고 선택 경로는:
- skeleton
- active glow
- hot tip
- fading trail

4-layer 구조로 강화.

럽트가 선택 경로를 따라 이동한다.

---

## STEP 5 — ARRIVAL
다음 Moment에 도착하면:
- Moment border pulse
- thumbnail glow
- 작은 꽃/빛 arrival reaction
- relation label 표시

---

## STEP 6 — ADD MOMENT
`+ MOMENT` 클릭.

새 Moment가 오른쪽에 생성된다.

새 Connection이 기존 bundle의 적절한 지점까지 합류한 뒤 목적지로 분기된다.

“한 줄이 새로 생겼다”가 아니라:

**“기존 감정 경로에 새로운 길이 자연스럽게 합류했다.”**

로 느껴져야 한다.

---

# 11. Cable Routing Engine 요구사항

이번 작업의 핵심이다.

## HARD REQUIREMENT

### 11.1 SVG 기반
Connection은 SVG path를 우선 사용한다.

### 11.2 Anchor
각 Moment port의 실제 DOM 위치를 기준으로 source/destination anchor를 계산한다.

### 11.3 Bundle Lane
같은 trunk를 공유하는 선은:
- 4~7px 정도의 일정 간격
- 서로 평행
- 각 identity 유지

### 11.4 Junction
각 bundle에는 최소:
- entry junction
- exit junction

을 둔다.

럽트가 junction 중 하나를 대표할 수 있다.

### 11.5 Live Reflow
`pointermove` 중 실시간으로 path를 갱신한다.

마우스를 놓은 뒤만 갱신하면 FAIL.

### 11.6 Bend
sharp 90° 꺾임보다는:
- rounded elbow
- cubic/quadratic curve
- short easing bend

를 사용한다.

### 11.7 No Teleport
드래그 중 path가 갑자기 다른 topology로 튀면 안 된다.

가능하면 이전 route와 새로운 route 사이를 continuous하게 유지한다.

### 11.8 ResizeObserver
브라우저 resize와 카드 크기 변화에 대응한다.

---

# 12. Track 53 엔진 재사용

새 모션 엔진을 처음부터 다시 만들 필요 없다.

가능하면 기존 53에서 잘 된 다음 요소를 가져온다.

- `getTotalLength()`
- `getPointAtLength()`
- hot tip
- fading trail
- Connection travel
- arrival reaction
- ResizeObserver
- Replay controls

이번 55의 새 개발 포인트는:

**`LIVE CABLE BUNDLE ROUTING + DRAGGABLE LUPT JUNCTION`**

이다.

즉 53의 빛 여행 엔진 위에 benchmark의 cable management를 얹는다.

---

# 13. Connection 시각 계층

평상시에도 Connection 자체가 보이지 않는 문제는 다시 만들지 않는다.

### 기본 skeleton
Opacity: 대략 0.16~0.24

### Hover
0.35~0.50

### Active Path
0.72~0.92

### Completed Path
0.28~0.42

### Hot Tip
가장 밝게.

### Fading Trail
tip 뒤를 따라 15~25% 구간 정도 잔광.

---

# 14. Color

Blender 색을 그대로 가져오지 않는다.

LoveTree palette로 변환한다.

- Background: deep navy / near-black
- Primary Connection: luminous violet
- Secondary: cyan
- Emotion accent: rose / magenta
- Arrival: ivory / warm white
- LUPT core: ivory
- LUPT aura: cyan → violet → rose

중요:
색은 풍부해야 하지만 **게임 HUD처럼 보이면 안 된다.**

---

# 15. UI 문구

추천:

상단:
`LOVETREE / LIVING CONNECTION`

작은 설명:
`Every path remembers why you kept going.`

버튼:
- `WALK THIS PATH`
- `AUTO TIDY`
- `+ MOMENT`
- `REPLAY`
- `RESET LAYOUT`

Moment 선택 시:
- `OPEN MOMENT`
- `WHY NEXT?`

럽트 상태:
- `LUPT IS TIDYING YOUR PATH`
- `LUPT FOUND A SHARED ROUTE`
- `LUPT IS WALKING THIS CONNECTION`

---

# 16. 럽트가 너무 캐릭터화되면 안 되는 이유

이번 벤치마크의 장점은 **연결 자체가 살아 있다는 것**이다.

따라서 V1에서:
- 큰 얼굴
- 큰 몸
- 마스코트 전신
- 화면 중앙에 서서 설명만 하는 캐릭터

로 만들면 benchmark의 장점을 잃는다.

이번 럽트는:

**“경로 안에서 움직이는 살아 있는 Junction”**

이어야 한다.

향후 제품 오너가 승인하면:
- 표정
- 말투
- 작은 형태 변화
- 기존 럽트 세계관과 결합

을 V2에서 추가한다.

---

# 17. LoveTree 제품 역할

이 화면을 기본 홈으로 만들지 않는다.

## 후보 역할
`My Tree → Other Views → Living Connection`

또는

`Tree Edit → Connection Layout`

로 들어가는 고급 보기.

하지만 사용자에게는 전문 node editor처럼 보여서는 안 된다.

첫 사용자는:
- Moment를 잡아 옮긴다.
- 럽트를 끌어본다.
- 선이 예쁘게 정리된다.
- 선을 누르면 감정 경로를 재생한다.

정도만 알아도 사용할 수 있어야 한다.

---

# 18. 10초 사용성 기준

처음 들어온 사용자가 설명서를 읽지 않고 10초 안에 다음을 이해해야 한다.

1. 카드들이 내 Moment다.
2. 선은 Connection이다.
3. 럽트는 Connection 위에 산다.
4. Moment를 움직일 수 있다.
5. 럽트를 움직이면 여러 길이 같이 움직인다.
6. 선을 누르면 그 길을 따라갈 수 있다.

이 중 4개 이하만 이해되면 HOLD.

---

# 19. Desktop / Mobile

## Desktop
- Full interaction
- Moment drag
- LUPT drag
- Pan/zoom optional
- Path click

## Mobile
- 1-finger Moment/LUPT drag
- Tap Connection
- pinch zoom 또는 최소 `+ / -` zoom
- 카드가 화면 밖으로 영구 이탈하지 않도록 clamp

모바일에서 hover 전용 기능 금지.

---

# 20. 성능

초기 V1 기준:
- Moment 8
- Connection 12
- bundle 3
- LUPT 1

에서 60fps에 가까운 체감 유지.

`pointermove`에서 DOM 전체 layout을 반복 강제하지 않는다.

가능하면:
- anchor cache
- requestAnimationFrame
- transform 기반 node drag
- path update batching

을 사용.

---

# 21. 접근성 / 안전

- `prefers-reduced-motion` 대응
- 키보드로 Moment 선택 가능
- 선택된 Connection에 시각적 구분
- 색만으로 관계를 구분하지 말고 label/line style 보조
- 기본 공개범위는 private라는 LoveTree 원칙을 훼손하지 않는다.

---

# 22. V1에서 하지 말 것

- 새로운 연예인 얼굴 생성
- 50개 이상의 Moment
- 실제 백엔드
- 실제 AI 영상 분석
- 럽트 3D 캐릭터 제작
- 복잡한 챗봇 기능
- 상점/결제
- Universe 전체 IA
- Blender 스타일 복제
- 단순 정적 mockup

V1은 **한 가지를 정확하게 증명**한다.

> 여러 Connection이 하나의 감정 trunk로 아름답게 묶이고,
> 럽트를 끌면 그 전체 구조가 살아 움직이며 다시 정리된다.

---

# 23. 결과물 폴더

새 폴더에서 작업한다.

권장:

`55_LUPT_LIVING_CONNECTION_ROUTER_V1/`

구성:

```text
55_LUPT_LIVING_CONNECTION_ROUTER_V1/
├─ 00_README.md
├─ 01_BENCHMARK_ANALYSIS.md
├─ 02_INTERACTION_SPEC.md
├─ 03_HTML/
│  ├─ lupt-living-connection-router-v1.html
│  └─ assets/
├─ 04_QA/
│  ├─ desktop-check.md
│  └─ mobile-check.md
└─ 05_REVIEW/
   ├─ execution.mp4
   └─ contact-sheet.jpg
```

기존 파일 덮어쓰기 금지.

---

# 24. 반드시 제출할 실행영상

20~35초 정도의 실제 브라우저 녹화.

다음 순서를 한 번에 보여라.

1. 초기 bundle
2. Moment drag
3. bundle live reflow
4. LUPT drag
5. 여러 선이 같이 따라오는 장면
6. Connection click
7. LUPT path travel
8. arrival reaction
9. `+ MOMENT`
10. 새 경로 합류

설명용 합성영상이 아니라 **실제 HTML 브라우저 실행 녹화**여야 한다.

---

# 25. QA — HARD FAIL

다음 중 하나라도 발생하면 PASS 보고 금지.

- Connection endpoint가 카드에서 떨어짐
- 드래그 중 선이 사라짐
- 여러 선이 한 줄로 완전히 겹쳐 identity 상실
- 럽트를 드래그해도 bundle이 실시간으로 안 따라옴
- 새 Moment 추가 후 route가 깨짐
- 선택한 선이 아닌 다른 선을 럽트가 탐
- broken image
- dead button
- mobile drag 불능
- desktop horizontal overflow
- console error
- `WALK THIS PATH`가 실제 path geometry를 따라가지 않음
- 실행영상이 실제 HTML 녹화가 아님

---

# 26. 제품 오너 검토 포인트

작업 완료 후 다음 질문에 답해서 보고한다.

### A. Benchmark Fidelity
**원본 영상에서 여러 케이블을 묶어 junction으로 옮기는 느낌이 실제로 살아 있는가?**

### B. LoveTree Semantics
**이것이 단순 node editor가 아니라 Moment와 감정 Connection이라는 것이 보이는가?**

### C. LUPT Identity
**럽트가 말풍선 마스코트가 아니라 Connection 안에서 실제 일을 하는 존재로 느껴지는가?**

### D. Motion Quality
**Moment와 LUPT를 움직여도 connection geometry가 끊김 없이 따라오는가?**

### E. Replay
**사용자가 한 경로를 다시 걸어 첫 감정을 재생할 수 있는가?**

---

# 27. 성공 기준

이번 결과는 아래 문장이 성립해야 PASS 후보가 된다.

> “벤치마크에서 케이블을 손으로 정리하던 쾌감이  
> LoveTree에서는 내가 빠져들었던 감정 경로를  
> 럽트와 함께 직접 정리하고 다시 걷는 경험으로 바뀌었다.”

---

# 28. 마지막 명령

## DO NOT MAKE A NODE-EDITOR MOCKUP.
## MAKE THE CONNECTIONS ACTUALLY ROUTE.
## MAKE LUPT LIVE ON THE PATH.
## DRAG LUPT → THE WHOLE EMOTIONAL BUNDLE MUST MOVE.
## CLICK A CONNECTION → LUPT MUST WALK THE REAL PATH.
## KEEP MOMENT → CONNECTION → NEXT MOMENT SEMANTICS VISIBLE.
## BUILD THE REAL HTML FIRST.

