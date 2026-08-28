# DREAM MEMORY · Cinematic Grammar Map v1

**목표:** `Moment → Save → Connection → Next Moment → Tree`를 기능 설명보다 먼저 **감정적 경험으로 이해**시키는 38초 인터랙티브 홈페이지 Hero 후보.

| Scene | 시간 | 제품 의미 | 화면 문법 | UI 체감 |
|---|---:|---|---|---:|
| 01 First Moment | 0–3.2s | 마음이 처음 움직인 순간 | 자연광 portrait, 느린 push, 문장은 0.75s 뒤 등장 | 5% |
| 02 Memory Breath | 3.2–6.3s | 감정이 가라앉아 기억이 됨 | 커튼, 창빛, 물결, 잎 그림자. 인물/UI 없음 | 0% |
| 03 Person Reveal | 6.3–10.0s | 그 사람이 더 선명해짐 | 유리·반사·foreground masking, slow push | 5% |
| 04 Detail | 10.0–13.0s | 왜 못 잊었는지 | 눈/머리카락/옷깃 등 감정적 detail crop | 5% |
| 05 Save | 13.0–16.5s | 핵심 행동: Moment 저장 | 작은 translucent pill + tactile pulse + memory pocket | 22% |
| 06 Connection | 16.5–20.2s | 저장 뒤 다음 탐색 원인이 생김 | 두 portrait 경계에서 빛이 새고 시선 방향으로 이어짐 | 12% |
| 07 Follow | 20.2–23.5s | 다음 Moment로 이동 | horizon/road가 휘어지는 spatial warp | 8% |
| 08 Memory Field | 23.5–28.5s | 여러 Moment가 한 사람의 기억에 존재 | 서로 다른 크기/각도의 floating physical frames | 5% |
| 09 Tree Emerges | 28.5–33.5s | 연결이 쌓인 결과가 Tree | Moment 사이 organic light-thread가 순차 생성 → 마지막에 MY TREE | 10% |
| 10 End | 33.5–38.0s | 브랜드 회수 | warm ivory, 단순 LOVETREE + FOLLOW THE MOMENT | 5% |

## Motion Rhythm
`Impact → Breath → Intimacy → Discovery → Connection → Expansion`

V1은 장면 길이를 3.0~5.0초 사이로 다르게 두고, 장면 내부에서 짧은 micro-cut/detail 변화만 사용한다. 이는 ‘빠르게 움직이면 멋있다’가 아니라 기억의 밀도와 호흡을 구분하기 위한 것이다.

## Mobile Redesign
- 16:9 화면의 단순 축소가 아니라 portrait crop을 다시 지정한다.
- Detail은 3열에서 세로 3단으로 전환한다.
- Connection은 좌우 split에서 상하 split으로 바뀐다.
- Memory Field의 사진 위치/크기를 재배치한다.
- Save UI는 하단 full-width pill로 이동한다.

## Reduced Motion
`prefers-reduced-motion: reduce`에서는 자동 재생을 시작하지 않고, grain animation과 scene transition을 끈다. 사용자가 PLAY를 눌러도 이동은 가능하되 시각 변형은 최소화한다.
