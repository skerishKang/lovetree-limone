# 설계팀장9기 — Track 72 GATE B REJECT / B1 미디어비율·누끼검수·스크롤재생·클릭열기 긴급교정 지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**정본 위치:**  
`H:\내 드라이브\[26]\[[지피티 작업]]\[01_러브트리]\03_디자인채택본\72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`

**현재 판정:**  
`GATE B = REJECT`  
`SCROLL / FILTER / RESPONSIVE / LOCK FOUNDATION = PASS`  
`MEDIA FIT / ALPHA QUALITY / LIVE VIDEO / BASIC OPEN INTERACTION = FAIL`  
`GATE C = HOLD`

**B1 작업 폴더:**  
`05_GATE_B\B1_미디어비율_누끼검수_스크롤재생_클릭열기_긴급교정`

**이 문서가 Track 72 GATE B 교정의 최신 MASTER다.**

---

# 0. 제품오너 최신 지시 — 최우선

제품오너가 실제 Gate B 화면을 확인한 결과 다음 문제가 확인됐다.

1. 일부 세로 인물/누끼가 카드 비율과 맞지 않아 **하체만 보이거나 상체/머리가 잘린다.**
2. 일부 누끼는 알파 품질 또는 원본 여백 때문에 **화면에서 이상하게 보인다.**
3. Reference는 스크롤 중 영상 타일이 **실제로 재생**되는데 현재 Gate B는 poster 상태로 멈춰 있다.
4. 사진을 클릭하면 **큰 원본 사진이 열려야 한다.**
5. 메모를 클릭하면 **전체 메모가 열려야 한다.**
6. 영상 타일을 클릭하면 **큰 영상 viewer가 열려야 한다.**
7. 사용자가 원본 자산을 직접 삭제해야만 “안 쓰는 자산”이 되는 구조는 금지한다.

위 지시가 기존 “Gate C에서 viewer를 넣는다”는 과거 범위보다 우선한다.

따라서 **Basic Open Interaction과 Inline Live Video를 B1에서 먼저 구현**한다.

---

# 1. 기존 GATE B 판정 정정

기존 Gate B는 아래 기술 항목은 통과했다.

- 36 Moment
- vertical scroll
- filter
- Desktop 4열 / 1200 3열 / Mobile 2열
- lazy loading
- scroll restoration
- horizontal overflow 0
- A3.5 first-view asset lock
- 한국어 Sans-only

이 foundation은 유지한다.

그러나 최신 제품오너 기준에서 다음이 FAIL이다.

- `VIDEO AUTOPLAY WHILE VISIBLE = FAIL`
- `PHOTO CLICK OPEN = FAIL`
- `VIDEO CLICK VIEWER = FAIL`
- `MEMO CLICK OPEN = FAIL`
- `ASSET FIT QUALITY = FAIL`
- `CUTOUT QUALITY AUDIT = FAIL`

따라서 **GATE B는 아직 최종 PASS가 아니다.**

---

# 2. 현재 잘리는 직접 원인

현재 HTML은 대다수 card에 숫자 `h`를 고정하고:

```css
.card img,
.card video {
  width:100%;
  height:100%;
  object-fit:cover;
}
```

를 기본으로 사용한다.

이 구조는 원본 aspect ratio와 카드 ratio가 다를 경우:

- 머리 crop
- 손/발 crop
- 상체만
- 하체만
- object 일부 잘림

을 자동으로 만든다.

Track 72의 핵심 원칙은:

> **모든 Moment가 자기 원본 비율과 성격을 유지한다**

이므로 고정 `h + cover`를 기본값으로 사용하는 현재 방식은 수정한다.

---

# 3. B1에서 고정 높이 기반 Crop 시스템 폐기

## 기존

```js
h: 205
h: 245
h: 285
h: 360
```

등을 시각 우선순위와 무관하게 자산 fitting에 사용.

## B1

각 자산은 다음 필드를 가진다.

```js
{
  naturalWidth,
  naturalHeight,
  aspectRatio,
  fitMode,
  objectPosition,
  alphaMode,
  qualityStatus
}
```

카드 높이는 가능하면:

```css
aspect-ratio: naturalWidth / naturalHeight;
height: auto;
```

기반으로 계산한다.

---

# 4. FIT MODE를 자산별로 강제 지정

모든 media asset은 아래 5개 중 하나다.

## MODE A — `NATIVE`

대상:
- 일반 사진
- 포스터
- 완성된 그래픽
- 원본 화면비가 작품 의미인 자산

원본 aspect ratio 그대로.

기본 권장.

---

## MODE B — `CONTAIN_STAGE`

대상:
- 전신 누끼
- 자동차 누끼/제품 object
- LoveBot
- sculpture
- transparent PNG
- 머리/손/발이 잘리면 안 되는 자산

필수:

```css
object-fit: contain;
```

조건:
- 충분한 breathing space
- 배경색은 asset tone에 맞춰 지정
- 잘린 신체 0건

---

## MODE C — `COVER_SAFE`

대상:
- 영상 poster
- landscape scene
- crop해도 의미 손상이 없는 scene

단:
- focal point 확인 필수
- 사람 얼굴/전신에는 기본 사용 금지

---

## MODE D — `COVER_POSITIONED`

부득이하게 crop이 필요한 portrait.

반드시 item별:

```css
object-position: 50% 20%;
```

같은 명시값 사용.

머리/눈/손/발이 의도 없이 잘리면 FAIL.

---

## MODE E — `EXCLUDE`

대상:
- 원본부터 사람 일부가 이상하게 잘려 있음
- 알파 가장자리 심한 halo
- green spill
- 검정/흰 background가 원치 않게 baked
- 몸 일부만 남은 누끼
- 해상도가 지나치게 낮음
- Reference 분위기를 명확히 떨어뜨림

EXCLUDE asset은 화면에 사용하지 않는다.

---

# 5. 원본 파일 삭제 금지

제품오너가 직접 파일을 지울 필요는 없다.

**원본 폴더의 asset을 삭제하지 않는다.**

대신 B1 안에:

`72_V1_GATE_B1_ASSET_FIT_AUDIT.md`

를 만든다.

각 자산 상태:

- `USE_NATIVE`
- `USE_CONTAIN`
- `USE_COVER_SAFE`
- `USE_POSITIONED`
- `DO_NOT_USE`

중 하나로 기록한다.

즉:

> 파일 존재 여부 ≠ 사용 승인 여부

이다.

---

# 6. 누끼 품질 검수

모든 transparent PNG는 실제 alpha 기준으로 직접 확인한다.

필수 확인:

1. 머리 전체 존재
2. 손 전체 존재
3. 발 전체 존재
4. 옷자락/머리카락 edge 깨짐 여부
5. black/white halo
6. green spill
7. 불필요한 transparent margin
8. subject가 canvas에서 지나치게 작지 않은지

---

# 7. `H_000.png` 처리

`H_000.png`는 삭제하지 않는다.

원본 자체는 전신이 있는 transparent PNG다.

다만 transparent canvas 여백이 크므로,
카드에서는 무조건 `contain`만 적용한다고 끝내지 않는다.

B1에서는:

- alpha bounding box 계산
- subject scale을 카드 안에서 더 크게
- 발/머리 100% 유지
- background는 pale blue 또는 neutral
- figure가 너무 작게 떠 있지 않도록 safe zoom

을 적용한다.

즉 **원본 삭제 문제가 아니라 rendering/fitting 문제**다.

---

# 8. 현재 continuation wall 13~36 전수 재검수

특히 아래와 같은 화면은 금지한다.

- 하체만 보이는 인물
- 목 아래만 보이는 전신
- 얼굴이 반쯤 잘린 portrait
- 원본 누끼보다 card crop이 더 강한 상태
- 남성 조각상/전신이 허리 아래만 보이는 카드

**36개 전체를 visual contact sheet로 확인한다.**

---

# 9. FIT AUDIT 제출물

B1 구현 전에 먼저:

`72_V1_GATE_B1_36_ASSET_FIT_CONTACT_SHEET.png`

를 만든다.

각 36개 타일에:

- Moment ID
- filename/source
- fitMode
- status

를 표시한다.

문제 자산에는:

`REPLACE`
또는
`DO_NOT_USE`

표시.

---

# 10. A3.5 12 Asset Lock의 최신 해석

A3.5 12 Asset Lock은 최대한 유지한다.

그러나 최신 제품오너 지시에 따라:

> **시각적으로 명백히 잘리거나 누끼 품질이 부적합하면 LOCK보다 visual correctness가 우선한다.**

순서:

1. 먼저 fitting으로 해결
2. fitting으로 해결 불가능한 경우에만 pre-approved fallback 사용
3. source 삭제 금지
4. 교체 시 Audit에 이유 기록

임의 asset recuration은 계속 금지.

---

# 11. VIDEO — Reference처럼 스크롤 중 실제 재생

이제 poster-only 금지.

모든 실제 video tile은 viewport 안에 들어오면:

- muted
- playsinline
- loop
- 실제 `play()`

한다.

---

# 12. Inline Video Auto-Play 규칙

권장:

```js
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const v = entry.target;

    if (entry.intersectionRatio >= 0.30) {
      v.play().catch(() => {});
    }

    if (entry.intersectionRatio <= 0.08) {
      v.pause();
    }
  });
}, {
  threshold: [0, .08, .30, .6, 1]
});
```

정확한 수치는 시각 검수로 조정 가능.

핵심:

> **화면에 보이는 영상은 움직이고 있어야 한다.**

---

# 13. Scroll 중 영상 동작

사용자가 계속 아래로 스크롤할 때:

- visible video는 계속 재생
- scroll 때문에 매번 0초로 reset 금지
- 일부 가려졌다 다시 보이면 이전 currentTime에서 resume
- filter로 완전히 숨겨지면 pause
- 다시 표시되면 resume 또는 deterministic re-entry

---

# 14. 동시에 여러 Video 재생 허용

Reference처럼 같은 viewport 안에 영상이 여러 개 있으면
**보이는 video는 동시에 muted playback 가능**하다.

한 영상이 재생하면 다른 visible video를 강제로 pause하는 방식 금지.

단:
- viewport 밖은 pause
- decoding 과부하 방지

---

# 15. Video HTML 기본

```html
<video
  muted
  playsinline
  loop
  preload="metadata"
  poster="..."
></video>
```

`preload="none"` 고정은 폐기.

---

# 16. Video Tile 클릭

영상 tile 전체를 clickable하게 한다.

클릭:

> Inline video → large viewer

Viewer:

- 같은 source
- 현재 inline currentTime 전달
- 즉시 재생
- controls 제공
- 기본 muted 유지 가능
- 사용자 unmute 가능
- 원본 aspect ratio 유지
- `object-fit: contain`

---

# 17. Photo / Image 클릭

모든 photo / object / graphic tile 클릭 시
large viewer를 연다.

필수:

- 전체 원본 보임
- `object-fit: contain`
- 원본 aspect ratio
- background dark 또는 neutral
- crop 0
- X close
- ESC close
- backdrop click close

---

# 18. Memo 클릭

Memo tile 클릭:

> Archive card → readable Memo Detail

Detail에는:

- full memo
- date
- emotion
- type
- optional source
- optional Connection

을 보여준다.

작은 카드에서 글자를 억지로 전부 읽게 하지 않는다.

---

# 19. Connection 클릭

Connection tile도 클릭 가능하게 한다.

Detail:

- emotion before
- emotion after
- relation sentence
- previous Moment
- next Moment

단 advanced graph/navigation는 아직 GATE C.

---

# 20. Object 클릭

LoveBot / car / crystal / LoveTree sculpture도
large object viewer로 연다.

transparent PNG이면:
- checkerboard 금지
- curated neutral background
- contain
- 충분히 큰 scale

---

# 21. 공통 Viewer

B1에서 Basic Viewer 1개를 공통 컴포넌트로 만든다.

유형:

- video
- image
- object
- memo
- connection

각 type에 따라 content만 바꾼다.

별도의 제각각 modal 5개 생성 금지.

---

# 22. Viewer UX

필수:

- card click
- viewer open
- close button
- ESC
- backdrop click
- focus trap
- close 후 원래 card에 focus return
- scroll position 그대로 유지
- body background scroll lock
- viewer 닫은 뒤 Archive가 맨 위로 이동하지 않음

---

# 23. 기본 Viewer는 GATE B1로 당긴다

과거 지시에서는:

- detail viewer
- click media open

을 GATE C로 분리했다.

하지만 최신 제품오너가:

- 사진 클릭 → 사진 열기
- 메모 클릭 → 메모 열기
- 영상 클릭 → 영상 열기

를 Archive의 기본 동작으로 명시했다.

따라서 **Basic Viewer는 B1 필수**다.

GATE C는 이후:

- exact timestamp
- previous/next route
- Connection traversal
- cinematic transition
- richer playback

등 고급 interaction으로 재정의한다.

---

# 24. VIDEO는 사진 poster로 속이면 안 됨

`m17`, `m20`처럼 type이 VIDEO인데
실제 `src`가 WebP/JPG poster뿐인 항목은
B1에서 실제 video source가 없으면 두 가지 중 하나다.

1. 실제 MP4 연결
2. type을 PHOTO/SCENE으로 정정

**정지 이미지인데 VIDEO badge만 붙이는 것 금지.**

---

# 25. B1에서 실제 Video Source Audit

모든 type=`video` item에 대해:

- actual mp4 path
- poster
- duration
- currentTime
- autoplay visible
- click viewer

가 존재하는지 확인한다.

---

# 26. Typography

한국어 명조 금지 유지.

viewer / memo / connection에서도:

- Pretendard
- Noto Sans KR
- SUIT
- Apple SD Gothic Neo
- Malgun Gothic
- sans-serif

만.

---

# 27. Mobile

모바일에서도:

- visible video muted autoplay
- tap → viewer
- image contain
- memo readable
- horizontal overflow 0

을 유지한다.

---

# 28. Reduced Motion

`prefers-reduced-motion`은 UI transition을 줄인다.

하지만 **사용자가 저장한 실제 video content 자체를 정지 poster로 강제 대체하지 않는다.**

필요하면 별도 `Pause videos` control을 둘 수 있으나,
이번 B1 필수는 아니다.

---

# 29. B1 제출물

필수:

1. `72_V1_GATE_B1.html`
2. `72_V1_GATE_B1_36_ASSET_FIT_CONTACT_SHEET.png`
3. `72_V1_GATE_B1_ASSET_FIT_AUDIT.md`
4. `72_V1_GATE_B1_LIVE_VIDEO_SCROLL.mp4`
5. `72_V1_GATE_B1_MEDIA_CLICK_VIEWER.mp4`
6. `72_V1_GATE_B1_MEMO_CLICK.mp4`
7. `72_V1_GATE_B1_MOBILE.mp4`
8. `72_V1_GATE_B1_QA.md`

---

# 30. QA — Crop / Fit

36개 전체:

- unintended head crop = 0
- unintended hand crop = 0
- unintended foot crop = 0
- lower-body-only accidental tile = 0
- broken alpha = 0
- green spill used = 0
- bad halo used = 0

---

# 31. QA — Video

- visible actual MP4 playback = PASS
- offscreen pause = PASS
- re-entry resume = PASS
- multiple visible muted videos = PASS
- filter hidden video pause = PASS
- no constant restart at 0 = PASS

---

# 32. QA — Click

## Photo
- click open = PASS
- full image contain = PASS
- ESC = PASS

## Video
- click open = PASS
- currentTime handoff = PASS
- controls = PASS

## Memo
- click open = PASS
- full text readable = PASS

## Connection
- click open = PASS

---

# 33. QA — Scroll Preservation

Viewer:

- open at scroll Y
- close
- exact same Y / same card vicinity

필수.

---

# 34. 현재 Gate 상태

```text
A3 STRUCTURE = PASS
A3.5 ASSET CURATION = PASS

GATE B FOUNDATION:
- Scroll = PASS
- Filter = PASS
- Responsive = PASS
- First View Lock = PASS

GATE B FINAL = REJECT

B1 REQUIRED:
- Media Fit
- Cutout Audit
- Visible Video Autoplay
- Photo Open
- Video Viewer
- Memo Open
- Connection Open

GATE C = HOLD
```

---

# 35. 최종 지시

이번 수정의 핵심은:

> **Masonry에 그냥 파일을 넣는 것이 아니라, 각 파일에 맞는 비율로 제대로 보여주고, 살아 있는 영상은 실제로 재생하며, 클릭하면 그 Moment를 제대로 열어보게 만드는 것.**

제품오너가 원본 파일을 직접 삭제할 필요는 없다.

디자인팀이:

- 사용할 것
- contain할 것
- cover할 것
- object-position 조정할 것
- 제외할 것

을 명확히 관리한다.

**잘린 인물 / 이상한 누끼 / 멈춘 영상 / 클릭 안 되는 카드 상태로는 Track 72 GATE B PASS 불가.**
