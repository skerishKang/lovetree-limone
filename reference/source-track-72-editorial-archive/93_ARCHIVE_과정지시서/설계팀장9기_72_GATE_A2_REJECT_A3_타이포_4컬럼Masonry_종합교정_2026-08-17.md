# 설계팀장9기 — Track 72 GATE A2 판정 / GATE A3 Reference-Faithful Editorial Masonry 종합교정 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**정본 위치:**  
`H:\내 드라이브\[26]\[[지피티 작업]]\[01_러브트리]\03_디자인채택본\72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`

**현재 판정:** `GATE A2 = REJECT / MEDIA VOCABULARY PASS / REFERENCE COMPOSITION + TYPOGRAPHY REFINEMENT REQUIRED`  
**다음 단계:** `GATE A3 — REFERENCE-FAITHFUL EDITORIAL MASONRY STATIC CORRECTION`  
**GATE B/C:** 계속 금지  
**이 문서가 Track 72의 최신 MASTER다.**

---

# 0. 총평

A2는 A1보다 분명히 좋아졌다.

특히 다음은 A2에서 **통과**로 본다.

- 얼굴 close-up 중심 구성 폐기
- 실제 MP4 4개 사용
- 전신/Scene 2개 사용
- Object 2개 사용
- LoveTree 자체 Visual 2개 사용
- DOM Memo / Connection 사용
- 서로 다른 원본 비율 보존
- 실제 영상의 curated paused frame 사용
- 신규 이미지 생성 없이 기존 Drive 자산 활용
- 큰 manifesto 제거
- content first 방향으로 복귀

따라서 **A2의 자산 selection 방향은 유지한다.**

그러나 Reference와 나란히 보면 아직 다음 차이가 크다.

1. Reference는 **4열 중심의 자연스러운 Masonry Gallery**인데 후보는 **12-column puzzle/dashboard grid**처럼 보인다.
2. Reference는 tile width가 비교적 안정적이고 **높이/aspect ratio가 달라지는 방식**이 핵심인데, 후보는 width까지 지나치게 잘게 쪼개져 일부 tile이 너무 좁다.
3. Reference는 하나하나가 “작품 카드”처럼 보이지만 후보는 여러 surface가 **UI widget**처럼 보인다.
4. Reference의 카드들은 soft rounded rectangle 계열인데 후보는 radius 3px로 지나치게 각져 있다.
5. Reference는 tile 내부 색감이 blue / black / white / neon / illustration / object 등 매우 다양하지만 후보는 LoveTree neutral/pale 계열 비중이 아직 높다.
6. 한국어 Memo / Connection에 **Georgia, serif**가 사용되어 새 제품오너 기준과 충돌한다.
7. Reference는 UI가 매우 작고 조용한데 후보는 sidebar/top filter가 아직 “제품 대시보드” 느낌이 조금 강하다.

따라서 A2는 아직 GATE A PASS가 아니다.

---

# 1. 공통 타이포그래피 정책 — 즉시 LOCK

## 1-1. 한국어 명조체 전면 금지

앞으로 LoveTree 디자인 산출물에서:

> **한국어 텍스트에 명조/Serif 계열 사용 금지**

현재 A2 HTML의 다음은 즉시 수정한다.

```css
.note blockquote {
  font-family: Georgia, serif;
}

.connection strong {
  font-family: Georgia, serif;
}
```

위 두 규칙에서 serif를 제거한다.

### 한국어 권장 Stack

우선순위:

```css
font-family:
  Pretendard,
  "Noto Sans KR",
  SUIT,
  "Apple SD Gothic Neo",
  "Malgun Gothic",
  Arial,
  sans-serif;
```

로컬에서 Pretendard가 없을 경우에도
한국어가 serif로 fallback되지 않게 한다.

---

## 1-2. Track 72에서는 영문도 기본 Sans

이번 Reference 자체가 modern design archive이므로
Track 72에서는 영문 장식 serif도 기본적으로 사용하지 않는다.

권장:

```css
font-family:
  Inter,
  Pretendard,
  Arial,
  Helvetica,
  sans-serif;
```

LoveTree 워드마크도 별도 공식 로고 asset이 없다면
임의 serif logo를 만들지 말고 **굵은 sans wordmark**로 유지한다.

---

## 1-3. Typography Scale

Reference처럼 텍스트는 content를 방해하지 않을 정도로 작고 조용해야 한다.

### Sidebar Brand
- 20~24px
- 700~800

### Sidebar Item
- 11~13px

### Top Filter
- 10~12px

### Tile Micro Metadata
- 8~10px

### Memo
- 14~18px
- 500~700
- 한국어 Sans

### Connection
- 13~16px
- 500~700
- 한국어 Sans

### Large editorial headline
이번 Track에서는 원칙적으로 금지.
Archive가 주인공이다.

---

# 2. GATE A2의 가장 큰 구조 문제 — 12-column Puzzle Grid

현재 HTML은:

```css
grid-template-columns: repeat(12, minmax(0,1fr));
grid-auto-rows: 21px;
```

를 사용하고
일부 tile을 1 col / 2 col / 4 col / 5 col로 세밀하게 쪼갠다.

이 때문에 Reference보다:

- puzzle board
- dashboard
- magazine composition prototype

처럼 보인다.

Reference의 핵심은 오히려:

> **안정적인 4-column masonry + 서로 다른 높이**

에 가깝다.

---

# 3. A3 기본 Grid — 4 COLUMN MASONRY 우선

Desktop 1920×1080 Reference 기준:

## Sidebar
대략 220~260px.

## Main
나머지 영역.

## Main Archive
기본 **4 columns**.

권장:

```css
grid-template-columns: repeat(4, minmax(0,1fr));
gap: 12px ~ 18px;
```

또는 실제 masonry/column layout 사용 가능.

### 기본 원칙

대부분의 item은:

`1 column width`

를 차지한다.

차이는 **height / aspect ratio**에서 만든다.

---

# 4. Width Span은 예외적으로만 사용

사용자가 말한 “비율마다 크기를 다르게”는 유지한다.

다만 모든 것을 자유 span으로 만들지 않는다.

## 기본
1-column tile.

## Feature
정말 중요한 영상/Turning Point만:
`2-column span`

허용.

### 비율

첫 viewport 기준:

- 1-column tile: 8~12개
- 2-column Feature: 최대 1~2개

3-column / 4-column Hero는 첫 화면에서 금지.

Reference처럼 계속 작품을 발견하는 흐름이 우선이다.

---

# 5. Ratio는 “폭”보다 “높이”로 보여라

Reference에서 가장 강한 차이는:

- square
- portrait
- landscape
- tall
- short

가 각 column 안에서 다른 높이로 이어지는 것이다.

따라서:

## Landscape Video
1-column width + 16:9 / 4:3 height.

## Portrait
1-column width + 4:5 / 3:4 / 9:16.

## Square Object
1-column width + 1:1.

## UI / Website
1-column 또는 Feature면 2-column.

## Memo
1-column, content에 따라 medium/tall.

## Connection
1-column 또는 얇은 horizontal 2-column.

---

# 6. 첫 Viewport 밀도

Reference의 첫 화면에는 여러 종류의 타일이 동시에 보인다.

A3 기준:

**첫 viewport에서 최소 12개, 권장 14~18개의 tile 일부/전체가 보이게 한다.**

현재 A2는 surface count 12개지만
몇 개가 지나치게 크게 자리잡아 Reference의 “끊임없는 발견감”은 약하다.

A3에서는:

- tile width를 안정화
- portrait 하나가 화면 높이 대부분을 먹지 않게
- 2-column Feature 남발 금지
- 다음 row가 아래에서 일부 보이게

조정한다.

---

# 7. 첫 Viewport Media Mix — A2 방향 유지

A2에서 확보한 이종 미디어 mix는 유지한다.

첫 viewport 최소:

- Actual Video: **4**
- Full Body / Scene: **2**
- Object / Artifact: **2**
- LoveTree Product / Graphic: **2**
- Memo / Connection: **2**
- Face close-up: **0~2**

이 비율은 PASS 방향이다.

---

# 8. 하지만 Visual Color Mix를 더 강하게

Reference를 보면 인접 card의 색이 자주 바뀐다.

예:

- blue
- black
- white
- neon
- line drawing
- object
- green illustration
- grayscale

A3에서도 첫 viewport에서 다음을 의도적으로 섞는다.

### Dark visual
최소 2개.

### Strong saturated visual
최소 2개.

### White/light UI visual
최소 2개.

### Neutral/object
최소 2개.

한 화면이 beige / ivory / pink / gray만 반복되면 FAIL.

---

# 9. 기존 Video Frame도 재검토

A2의 video source 선택은 유지할 수 있다.

그러나 최종 selected currentTime은
Reference 대비 “서로 다른 색/구조”를 만드는지를 다시 본다.

검토:

- Track 65 @ 69.77s
- Track 67 @ 11.40s
- Track 52 @ 8.36s
- Track 59 @ 11.01s

4개가 서로 비슷한 white/neutral interface처럼 보인다면
같은 MP4 안에서 frame만 다시 고른다.

**영상 source를 바꾸기 전에 frame curation부터 다시 한다.**

---

# 10. Card Corner — Reference에 맞춰 수정

A2 현재:

```css
border-radius: 3px;
```

이는 Reference보다 지나치게 각져 있다.

Reference card는 전반적으로 soft rounded rectangle이다.

A3 권장:

- media card radius: `8~12px`
- small object card: `10~14px`
- top filter pill은 계속 full pill
- Memo/Connection은 필요에 따라 8~12px 또는 borderless

단:

모든 tile에 shadow를 넣지 않는다.

Reference 느낌은:

> rounded + clean

이지

> floating cards with shadow

가 아니다.

---

# 11. Card Background

Reference에서는:

- 이미지 full bleed
- white card 안에 object
- dark card
- light UI screenshot

이 자연스럽게 섞인다.

A3도 다음 3개 surface family를 사용한다.

### Full Bleed
영상/사진.

### Object Stage
사물 PNG + generous negative space.

### Document / UI
white/light panel.

### Text
Memo/Connection.

각 타입이 분명히 다르게 보여야 한다.

---

# 12. Object Tile

Crystal / Petal Runner 방향은 유지.

다만 현재 Object가 작은 아이콘처럼 보이면 안 된다.

Reference의 blue app icon / illustration처럼:

- tile 전체 안에서 object가 충분히 큼
- negative space는 있지만 존재감이 강함
- 중앙 정렬만 반복하지 않음

Object마다:
- scale
- offset
- background
를 다르게 한다.

---

# 13. Full Body Tile

전신 자산 사용은 A2에서 좋은 방향이다.

A3에서는 전신 이미지가:

- 증명사진
- fashion lookbook

처럼 보이지 않도록 한다.

무대/댄스/행동감이 보이는 crop을 사용한다.

원본 인물 전체는 유지하되
tile 안에서 figure scale을 조정해
주변 object/video와 rhythm을 맞춘다.

---

# 14. Memo / Connection — Typography 재설계

현재 한국어 serif는 전부 제거한다.

## Memo 예

```text
MOMENT NOTE

그 장면이 계속 생각나서
다음 무대를 찾아봤다.

설렘 → 궁금함
```

폰트:
Pretendard / Noto Sans KR.

### Memo surface
- background white / soft gray / pale neutral
- 10~12px label
- 15~17px main
- excessive emotional script style 금지

---

## Connection 예

```text
CONNECTION

한 장면을 저장한 뒤,
이전 무대까지 거슬러 올라갔다.

호감 → 확신
```

Sans.

Connection은 “감성 편지”가 아니라
**Archive 안의 경로 데이터**처럼 보여야 한다.

---

# 15. Sidebar — Reference Fidelity 강화

현재 Sidebar는 큰 방향은 좋다.

다만 Reference는 더 조용하다.

A3에서는:

### 유지
- LoveTree
- Tree identity
- View
- meta

### 축소
- 긴 설명
- 중복 navigation
- bottom promotional copy

현재:

`A visual archive of moments. Different media keep their own shape...`

같은 내부 설명은 제품 화면에서 제거.

Reference처럼 sidebar 하단은:
- sign in / info / small status
- 또는 아주 짧은 product meta

정도로만 둔다.

---

# 16. Top Filter — Reference와 더 가깝게

현재 pill 구조는 방향이 맞다.

A3에서는:

- height 약 30~34px
- label 10~12px
- active black
- inactive very light gray
- gap 5~8px

Reference처럼 상단을 꽉 채우지 않고
좌측부터 조용히 이어지게 한다.

`Curated ↓` 같은 sort도 유지 가능.

---

# 17. Top Strip 높이 축소

현재 72px은 Reference보다 조금 두껍다.

A3 권장:

`54~62px`

첫 콘텐츠가 더 빨리 시작되게 한다.

---

# 18. Main Canvas Padding

Reference main은 sidebar 옆에서 비교적 빠르게 content가 시작된다.

A3:

- horizontal padding 16~24px
- top wall padding 10~18px

현재보다 조금 더 compact.

목표:

첫 viewport에서 card count를 늘리는 것.

---

# 19. Caption 정책

Reference 대부분은 card 자체가 주인공이고
caption은 매우 작거나 hover/secondary다.

A3에서:

- 모든 tile 아래 caption 강제 금지
- video는 micro play/duration
- image는 필요할 때만 title
- object는 tiny source/type
- Memo/Connection 자체가 caption 역할

Metadata가 card보다 눈에 띄면 FAIL.

---

# 20. 한국어 UI Copy

한국어를 사용할 경우 지나치게 감성 문장으로 길게 쓰지 않는다.

권장:

- 모든 순간
- 영상
- 사진
- 사물
- 메모
- 연결
- 첫 순간
- 전환점
- 최근순

짧고 기능적인 한국어 Sans UI.

영문과 혼용해도 되나
한 block 안에서 불필요하게 언어를 섞지 않는다.

---

# 21. A3 Layout 추천 예시

정확히 복사하지 않아도 된다.

```text
SIDEBAR | [VIDEO 16:9] [OBJECT 1:1] [FULL BODY 4:5] [UI 4:3]
        | [VIDEO 4:3 ] [MEMO      ] [OBJECT 1:1   ] [VIDEO 16:9]
        | [TREE 3:4  ] [VIDEO 16:9] [DANCE 4:5    ] [CONNECTION ]
        | [OBJECT ...] [UI ...    ] [VIDEO ...    ] [GRAPHIC ...]
```

필요하면 Feature Video 하나만:

```text
[ FEATURE VIDEO 2-COL ] [OBJECT] [PORTRAIT]
```

허용.

**전체 board는 4-column masonry rhythm을 유지한다.**

---

# 22. A2에서 유지할 Asset Ledger

A2 Asset Ledger 체계는 잘했다.

A3에도 그대로 이어간다.

추가 필드:

- `Visual Tone`
  - dark
  - saturated
  - light
  - neutral

- `First View Order`

를 기록한다.

---

# 23. GATE A3에서는 여전히 기능 금지

금지:

- filter actual behavior
- autoplay
- hover playback
- detail viewer
- lazy loading architecture
- scroll restoration
- responsive completion
- fancy animation

단:

실제 `<video>` element + curated paused currentTime은 유지.

---

# 24. GATE A3 제출물

필수:

1. `72_V1_GATE_A3_REFERENCE_COMPARISON.png`
2. `72_V1_GATE_A3_CANDIDATE_SCREEN.png`
3. `72_V1_GATE_A3.html`
4. `72_V1_GATE_A3_NOTES.md`
5. `72_V1_GATE_A3_ASSET_LEDGER.md`

---

# 25. GATE A3 PASS 기준

## PASS 1 — Typeface
한국어 serif/명조 사용 0건.

## PASS 2 — Reference Masonry
Reference처럼 4-column 기반의 자연스러운 vertical masonry로 읽힌다.

## PASS 3 — Width Discipline
대부분 1-column, Feature만 제한적으로 2-column.

## PASS 4 — Ratio Variety
높이/aspect ratio 차이가 즉시 보인다.

## PASS 5 — Heterogeneous Media
video / object / full-body / UI / LoveTree / text가 첫 화면에 함께 존재.

## PASS 6 — Color Variety
dark / saturated / light / neutral visual이 함께 보인다.

## PASS 7 — Density
첫 viewport에서 최소 12개 이상의 visual surface가 보인다.

## PASS 8 — Not Dashboard
tile이 widget grid가 아니라 creative archive처럼 보인다.

## PASS 9 — Reference Recognition
Reference와 나란히 놓았을 때:

> “같은 Editorial Inspiration Archive 형식을 LoveTree content로 바꾼 화면”

이라는 인상이 먼저 온다.

---

# 26. 판정 기록

`GATE A1 = REJECT`

`GATE A2 = REJECT`

단 A2에서:

- `MEDIA VOCABULARY = PASS`
- `REAL VIDEO USE = PASS`
- `FACE DOMINANCE REMOVAL = PASS`
- `ASSET CURATION DIRECTION = PASS`

남은 문제:

- `KOREAN TYPOGRAPHY = FAIL`
- `REFERENCE MASONRY STRUCTURE = FAIL`
- `COLUMN WIDTH DISCIPLINE = FAIL`
- `CARD SHAPE FIDELITY = FAIL`
- `REFERENCE DENSITY/RHYTHM = CONDITIONAL FAIL`

따라서 A3에서는 자산을 다시 처음부터 고르지 않는다.

**A2의 좋은 이종미디어 자산을 유지하고, Typography + 4-column Masonry + card shape + density + visual tone만 종합 교정한다.**

GATE A3 승인 전 GATE B/C로 넘어가지 않는다.
