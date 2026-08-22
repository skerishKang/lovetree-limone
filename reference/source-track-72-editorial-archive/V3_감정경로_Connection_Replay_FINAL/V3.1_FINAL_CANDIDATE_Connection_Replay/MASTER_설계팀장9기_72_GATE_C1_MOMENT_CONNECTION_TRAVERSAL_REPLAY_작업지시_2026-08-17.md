# 설계팀장9기 — Track 72 GATE C C1 MOMENT · CONNECTION TRAVERSAL · REPLAY 작업지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**선행 판정:** `GATE B1 = PASS`  
**현재 단계:** `GATE C = AUTHORIZED`  
**작업 폴더:** `06_GATE_C\C1_MOMENT_CONNECTION_TRAVERSAL_REPLAY_후보`

**이 문서가 Track 72 GATE C의 최신 MASTER다.**

---

# 0. GATE C의 목적

GATE B1에서 다음은 이미 해결됐다.

- 36 Moment Archive
- media fitting
- live video
- photo/object/video/memo/connection basic viewer
- filter
- responsive
- scroll preservation

GATE C에서 같은 기능을 다시 만들지 않는다.

이번 단계의 목적은:

> **Archive에서 한 Moment를 열었을 때, 그 순간이 왜 다음 순간으로 이어졌는지를 따라가며 LoveTree의 감정 경로를 실제로 걸을 수 있게 만드는 것**

이다.

LoveTree의 핵심은 콘텐츠 목록이 아니라:

- Moment
- Connection
- Replayable emotional path

다.

따라서 GATE C에서는 viewer를 **감정 경로 탐색기**로 확장한다.

---

# 1. 구조 원칙

## Archive Order와 Connection을 분리

`이전/다음 카드`와 `감정적으로 연결된 다음 Moment`는 같은 개념이 아니다.

### Archive Order
- 최근순/기록순
- 단순 목록 위치

### Connection
- “왜 이 Moment 다음에 저 Moment를 찾아갔는가”
- 감정의 인과관계

GATE C UI에서 둘을 혼동하지 않는다.

---

# 2. Moment Detail Viewer 유지·확장

B1 Common Viewer를 유지한다.

새 modal 시스템을 다시 만들지 않는다.

viewer 안에 아래 Layer를 추가한다.

## A. Moment Identity
- Moment title
- date
- emotion
- type
- source
- optional saved note

## B. Media
- video / image / object / memo
- B1의 fitting/playback 그대로

## C. Connection Area
- 이전 감정
- 다음 감정
- “왜 연결됐는지” relation sentence
- 연결된 이전 Moment
- 연결된 다음 Moment

## D. Replay Entry
- `처음부터 다시 걷기`
- 또는 현재 Moment가 path root가 아니면 `이 경로 처음부터 보기`

---

# 3. Connection CTA

viewer 하단에 일반적인:

`Previous / Next`

만 두지 않는다.

LoveTree connection CTA는 다음처럼 의미를 보여준다.

예:

```text
호감 → 궁금함

그 표정이 계속 생각나서
다른 무대를 찾아봤다.

다음 Moment 보기 →
```

또는:

```text
궁금함 → 확신

이 인터뷰 이후
다른 무대를 계속 찾아보기 시작했다.

연결된 순간으로 →
```

Connection 설명이 반드시 있어야 한다.

---

# 4. Previous / Next Archive는 보조

단순 Archive 순서 이동도 필요하면 둘 수 있다.

하지만 시각 위계:

1. **Connected Moment**
2. Archive Previous / Next

순이다.

사용자가 “다음 카드”가 아니라
“다음 감정 원인”을 따라가게 한다.

---

# 5. C1에서는 1개의 대표 Emotional Path를 완성

36개 모든 Moment를 억지로 완전 graph로 만들지 않는다.

이번 Gate에서는 실제 품질을 검증하기 위해:

**최소 6 Moment, 권장 8~10 Moment**

로 연결된 대표 path 1개를 만든다.

예시 구조:

```text
FIRST MOMENT
↓
설렘
↓
궁금함
↓
더 찾아봄
↓
호감
↓
Turning Point
↓
확신
↓
팬이 된 순간
```

실제 현재 36 Moment의 기존 metadata를 활용한다.

새 감정 서사를 근거 없이 과도하게 발명하지 않는다.

---

# 6. Connection 데이터 모델 — Prototype 수준

별도 backend/DB를 만들지 않는다.

현재 static prototype data에 최소 필드만 추가한다.

예:

```js
{
  id: "m14",
  emotion: "설렘",
  connectedFrom: null,
  connectedTo: "m16",
  connectionReason: "표정이 계속 생각나서 다른 무대를 찾아봤다.",
  pathId: "path-first-fan",
  pathOrder: 1
}
```

필수 필드:

- `emotion`
- `connectedFrom`
- `connectedTo`
- `connectionReason`
- `pathId`
- `pathOrder`

Prototype 이상 architecture 확정 금지.

---

# 7. Connection 이동 동작

`연결된 순간으로 →` 클릭 시:

- viewer를 닫고 Archive에서 해당 카드까지 scroll하는 방식이 아니라
- **viewer 안에서 다음 Moment를 교체해서 이어서 감상**

한다.

즉:

```text
Moment A
→ Connection
→ Moment B
→ Connection
→ Moment C
```

가 끊기지 않는다.

---

# 8. Video 상태

Connection 이동 중 video는:

- 현재 viewer video pause
- 다음 Moment가 video면 해당 source 준비
- viewer 안에서 정상 playback

한다.

Archive inline video와 viewer video가 동시에 같은 source로 중복 재생되어 혼란스럽지 않게 한다.

viewer open 중에는 viewer 관련 video를 우선한다.

---

# 9. Transition

화려한 3D transition 금지.

Reference의 editorial 성격을 유지한다.

허용:

- opacity 160~260ms
- subtle translate 6~14px
- media crossfade
- Connection reason 잠깐 강조

금지:

- card flying
- 3D rotation
- particle explosion
- cinematic scene replacement
- 과도한 GSAP showcase

---

# 10. Connection Reason Reveal

다음 Moment로 즉시 튀지 않게 한다.

권장 흐름:

```text
Moment A
↓
Connection CTA
↓
reason 0.5~1.2s 읽을 수 있음
↓
Moment B
```

사용자가 “왜 다음으로 갔는지”를 인지하게 한다.

단 강제 긴 대기시간 금지.

---

# 11. Replay — “처음부터 다시 걷기”

대표 path의 어느 Moment viewer에서도:

`처음부터 다시 걷기`

CTA 제공.

클릭:

- path root Moment로 이동
- viewer mode를 `REPLAY`로 변경
- path order 기준으로 연결된 Moment를 이어감

---

# 12. Replay Mode UI

Replay mode는 일반 viewer와 아주 조금만 다르게 보인다.

예:

```text
REPLAY
02 / 08

설렘 → 궁금함
```

필수:
- 현재 path step
- total step
- emotion transition
- exit replay

금지:
- 게임 HUD
- progress bar 과잉 디자인
- Tree 전체를 작은 graph로 억지 표시

---

# 13. Replay Navigation

Desktop:
- Connection CTA
- 키보드 `→` 다음 Connected Moment
- `←` 이전 Connected Moment
- `Esc` Replay 종료/Viewer 닫기

Mobile:
- CTA tap 우선
- 좌우 swipe는 선택적 허용

Swipe를 넣더라도 CTA를 없애지 않는다.

---

# 14. Replay와 Archive Scroll

Replay 시작 전 Archive scrollY를 저장한다.

Replay 종료:

- 원래 filter 상태
- 원래 scrollY
- 원래 trigger card 위치

로 복구한다.

B1의 scroll preservation을 회귀시키지 않는다.

---

# 15. Filter와 Connection

사용자가 현재 `Object` filter 상태에서 viewer를 열었더라도,
Connection next Moment가 Video라고 해서 traversal을 막지 않는다.

Viewer traversal은 filter를 넘어갈 수 있다.

하지만 Replay 종료 후 Archive는 원래 filter로 복원한다.

---

# 16. DO_NOT_USE Media Moment

`m28 / m30 / m31` 같은 Moment는 media source만 제외되었지 Moment 자체는 존재한다.

Path에 포함된다면:
- metadata
- memo
- connection reason
- date/emotion

으로 viewer를 구성할 수 있다.

broken/partial media를 다시 노출하지 않는다.

---

# 17. Source와 Moment 구분

GATE C에서 특히 중요하다.

Moment = 사용자의 감정이 움직인 기록.

Source = 그 Moment를 만든 외부/내부 콘텐츠.

Viewer에서 Source가 보이더라도
Moment보다 위계가 높아지지 않는다.

---

# 18. Path Copy

좋은 카피:

- `이 순간 뒤에 무엇을 찾아봤나요?`
- `이 장면이 다음 탐색을 만들었습니다.`
- `호감 → 궁금함`
- `이 경로 처음부터 보기`
- `연결된 순간으로`
- `처음부터 다시 걷기`

피해야 할 카피:

- `추천 콘텐츠`
- `Next Content`
- `Related Post`
- `More Like This`
- `자동 추천`

Track72는 콘텐츠 추천 wall이 아니다.

---

# 19. Korean Typography

한국어 명조/Serif = 0.

Connection reason, Replay UI, metadata 모두 Sans-only.

---

# 20. First View와 Archive Design LOCK

GATE C 때문에 Archive 자체를 다시 디자인하지 않는다.

LOCK:
- A3.5 first-view 12
- B1 fitting
- 4/3/2 column
- visible video autoplay
- filter
- colors
- sidebar
- top strip
- card radius
- overall editorial mood

GATE C 작업 중심은 Viewer 내부다.

---

# 21. 접근성

필수:

- Connected Moment CTA button
- keyboard arrow 동작은 focus가 input/control에 없을 때만
- focus visible
- screen reader에서 transition reason 읽을 수 있음
- Replay mode 상태 `aria-live` 또는 적절한 status 제공
- ESC 동작 일관

---

# 22. Deep Link는 이번 Gate에서 선택사항

URL hash 예:

`#moment=m14`
`#path=path-first-fan&step=3`

은 구현 가능하나 C1 PASS 필수는 아니다.

복잡한 routing을 새로 도입할 필요 없다.

---

# 23. GATE C에서 금지

- backend/DB 확정
- production routing
- 로그인/계정
- 공유/public privacy 변경
- agency official path 구현
- recommendation algorithm
- graph editor
- 3D Tree
- monetization
- 새 이미지 생성
- 자산 재큐레이션
- B1 foundation 재작성

---

# 24. C1 필수 제출물

1. `72_V1_GATE_C1.html`
2. `72_V1_GATE_C1_CONNECTION_TRAVERSAL.mp4`
3. `72_V1_GATE_C1_REPLAY.mp4`
4. `72_V1_GATE_C1_MOBILE.mp4`
5. `72_V1_GATE_C1_PATH_LEDGER.md`
6. `72_V1_GATE_C1_QA.md`

---

# 25. PATH LEDGER

대표 path에 대해:

| order | Moment ID | emotion | connected from | connection reason | connected to |
|---|---|---|---|---|---|

필수.

Path 최소 6, 권장 8~10 Moment.

---

# 26. QA — Connection

- Connected CTA exists = PASS
- relation sentence readable = PASS
- correct next Moment = PASS
- correct previous connected Moment = PASS
- Archive order와 Connection UI 구분 = PASS
- viewer 안에서 traversal = PASS

---

# 27. QA — Replay

- Replay root 진입 = PASS
- step count = PASS
- path order 정확 = PASS
- emotion transition 표시 = PASS
- next/previous = PASS
- exit = PASS
- Archive original scroll/filter 복원 = PASS

---

# 28. QA — Regression

B1 회귀 0건:

- 36 Moment 유지
- first-view 12 lock
- visible video autoplay
- Photo/Object viewer
- Memo viewer
- Connection base viewer
- media fit
- crop 0
- mobile 2-column
- horizontal overflow 0
- Korean serif 0

---

# 29. GATE C1 PASS 기준

사용자가 한 Moment를 열었을 때:

> “이게 다음 콘텐츠구나”

가 아니라

> **“아, 이 순간 때문에 다음 순간을 찾아간 거구나.”**

라고 이해돼야 한다.

그리고:

> **“처음부터 다시 걷기”**

를 통해 그 감정 경로를 연속적으로 재생할 수 있어야 한다.

이 두 가지가 GATE C의 핵심이다.

---

# 30. 상태

```text
GATE B1 = PASS

GATE C = AUTHORIZED
GATE C1 = REQUIRED

GATE D / 이후 단계 = NOT AUTHORIZED
```

C1 승인 전 다음 확장으로 넘어가지 않는다.
