# 설계팀장9기 — Track 72 GATE A3 PASS / GATE B Scroll·Filter·Responsive 구현지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**판정:** `GATE A3 = PASS`  
**다음 단계:** `GATE B — SCROLL / FILTER / RESPONSIVE / STABLE MASONRY`  
**GATE C:** 아직 금지

---

# 0. GATE A3 판정

A3는 정지 화면 기준 PASS한다.

Reference 대비 다음 핵심 조건을 충족했다.

- 한국어 Serif/명조 0건
- 4-column 기반의 안정적인 editorial masonry
- 실제 영상/전신/사물/LoveTree visual/텍스트가 섞인 heterogeneous archive
- tile width discipline 개선
- rounded clean card surface
- dark / saturated / light / neutral visual mix
- sidebar/top strip의 위계 축소
- landing page보다 archive가 먼저 보이는 첫 인상
- face-heavy portfolio 인상 제거

따라서 정지 composition Gate는 닫는다.

A3 파일은 수정하지 않고 PASS evidence로 보존한다.

---

# 1. GATE B 목표

GATE B의 목표는 새로운 디자인을 만드는 것이 아니다.

A3에서 승인한 visual composition을 유지한 채:

1. 실제 vertical scroll
2. stable masonry continuation
3. filter
4. responsive
5. lazy loading
6. scroll position preservation

을 구현한다.

**GATE B에서는 detail viewer/video hover playback을 아직 구현하지 않는다.**

---

# 2. A3 Visual LOCK

아래는 함부로 변경하지 않는다.

- white editorial canvas
- 4-column desktop rhythm
- 한국어 Sans-only
- tile radius 약 10px
- heterogeneous media mix
- sidebar visual hierarchy
- top filter visual hierarchy
- 실제 video / object / full-body / LoveTree / text surface mix
- A3 first viewport composition family

기능 구현 때문에 다시 dashboard처럼 변하면 FAIL.

---

# 3. 전체 Archive 길이

GATE B에서는 12개 first-view만 보여주고 끝내지 않는다.

최소:

**36 Moment 전체를 실제 scroll 가능한 archive로 구현**

한다.

가능하면 현재 MASTER의 36개 Moment를 모두 구성한다.

동일 자산 반복으로 숫자만 채우지 않는다.

---

# 4. Masonry 안정성

필수:

- reload 때 위치가 random하게 바뀌지 않음
- 동일 data는 동일 order / 동일 layout
- 이미지 로딩 후 큰 layout jump 없음
- video metadata loading 후 height jump 없음

권장:

- aspect-ratio metadata 선반영
- CSS Grid / deterministic masonry
- 또는 안정된 masonry engine

---

# 5. Vertical Scroll

주 탐색은 native vertical scroll이다.

필수:

- scroll-jacking 금지
- 강제 section snap 금지
- horizontal drag 금지
- wheel hijacking 금지

Reference처럼 자연스럽게 아래로 계속 탐색한다.

---

# 6. Filter

최소 실제 동작:

- All
- Video
- Photo / Scene
- Object
- Memo
- Connection

필터 선택 시:

- matching tile만 남김
- 원본 aspect ratio 유지
- 4-column masonry로 안정적으로 재배치
- 페이지 전체 reload 금지

---

# 7. Filter Transition

절제한다.

허용:

- opacity 120~220ms
- translateY 4~10px
- gentle reposition

금지:

- 튕김
- card flying
- 3D rotation
- excessive GSAP showcase

---

# 8. Filter 후 Scroll 처리

필터 전 사용자가 깊은 위치에 있다면
필터 결과가 짧아져 scroll overflow가 깨질 수 있다.

안전하게:

- 현재 viewport와 가장 가까운 valid position으로 clamp
- 갑자기 blank area에 남지 않음

All로 복귀했을 때
가능하면 이전 All scroll position 복구.

---

# 9. Responsive

## Desktop ≥ 1440
4 columns.

## Small Desktop / Tablet Landscape
3 columns.

## Tablet Portrait
2 columns.

## Mobile
2 columns 기본.

단:

- Feature media는 필요 시 full width
- 너무 좁은 memo는 full width 허용
- 9:16 portrait는 half width 가능

---

# 10. Mobile Sidebar

Desktop sticky sidebar를 그대로 줄이지 않는다.

Mobile에서는:

- compact top bar
- LoveTree
- tree title
- filter/menu button

형태로 축약.

sidebar는 drawer 또는 sheet로 전환 가능.

---

# 11. Mobile 한국어 Typography

한국어 명조 금지 계속 적용.

모바일에서 font가 너무 작아지지 않게:

- body metadata 최소 10~11px
- memo 14px 이상
- navigation 12px 이상 권장

---

# 12. Lazy Loading

36 Moment 전체를 처음부터 heavy load하지 않는다.

Image:
- `loading="lazy"` 적극 사용

Video:
- poster 우선
- `preload="metadata"` 또는 필요하면 `none`
- viewport 밖 actual media decoding 최소화

GATE B에서는 autoplay 금지.

---

# 13. Actual Video 상태

A3의 video source는 유지.

GATE B에서도:

- poster/paused 상태
- actual video src 보존
- play 없음

GATE C에서 hover preview와 viewer를 붙인다.

---

# 14. Accessibility 기본 Gate

GATE B에서 최소:

- tile에 의미 있는 `aria-label`
- filter button 실제 `<button>`
- keyboard focus visible
- sidebar/mobile menu keyboard 접근
- `prefers-reduced-motion`에서 transition 최소화

---

# 15. Scroll Position Preservation

필수 QA.

사용자가 archive 중간/하단에 있다가:

- viewport resize
- orientation change
- filter switching
- mobile/desktop breakpoint

상황에서도 비정상적으로 맨 위로 튀지 않게 한다.

특히 filter → All 복귀 시 이전 위치 복원을 검증한다.

---

# 16. GATE B에서 금지

아직 하지 말 것:

- hover video preview
- click detail viewer
- exact video timestamp seek/play
- previous/next Connection viewer
- ESC close viewer
- external source open
- fancy 3D motion

이것들은 GATE C.

---

# 17. GATE B 제출물

필수:

1. `72_V1_GATE_B.html`
2. `72_V1_GATE_B_DESKTOP_SCROLL.mp4`
3. `72_V1_GATE_B_FILTER.mp4`
4. `72_V1_GATE_B_MOBILE.mp4`
5. `72_V1_GATE_B_QA.md`

추가:

- desktop 1920×1080 screenshot
- tablet screenshot
- mobile screenshot

---

# 18. QA 필수 시나리오

## Desktop
- initial load
- 36 Moment scroll
- bottom까지 도달
- All → Video
- Video → Object
- Object → All
- previous All scroll restoration

## Tablet
- 3/2-column 전환
- overflow 없음

## Mobile
- 2-column
- full-width feature
- navigation 접근
- filter 접근
- horizontal overflow 0

---

# 19. GATE B PASS 기준

### PASS 1
A3 visual family가 기능 추가 후에도 유지된다.

### PASS 2
36 Moment 전체가 안정적으로 scroll된다.

### PASS 3
filter가 실제 동작한다.

### PASS 4
필터해도 native ratio가 유지된다.

### PASS 5
Desktop 4 / Tablet 3~2 / Mobile 2 column이 자연스럽다.

### PASS 6
layout jump가 눈에 띄지 않는다.

### PASS 7
scroll position preservation이 동작한다.

### PASS 8
horizontal overflow가 없다.

### PASS 9
한국어 serif/명조 0건 유지.

---

# 20. 판정 기록

- `GATE A1 = REJECT`
- `GATE A2 = REJECT`
- `GATE A3 = PASS`
- `GATE B = AUTHORIZED`
- `GATE C = NOT AUTHORIZED`

A3의 정지 visual을 기준선으로 보존하고,
GATE B는 **사용 가능한 Archive로 만드는 단계**에만 집중한다.
