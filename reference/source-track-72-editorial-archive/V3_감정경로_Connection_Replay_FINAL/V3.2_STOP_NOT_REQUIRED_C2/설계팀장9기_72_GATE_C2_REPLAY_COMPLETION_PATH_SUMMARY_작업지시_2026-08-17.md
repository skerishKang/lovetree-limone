# 설계팀장9기 — Track 72 GATE C2 REPLAY COMPLETION · PATH SUMMARY 작업지시

**작성일:** 2026-08-17  
**작성자:** 설계팀장 9기  
**수신:** LoveTree 디자인팀장  
**Track:** `72_러브트리_에디토리얼모먼트아카이브_디스커버리월_V1`  
**선행 판정:** `GATE C1 = PASS`  
**작업 폴더:** `06_GATE_C\C2_REPLAY_COMPLETION_PATH_SUMMARY_후보`  
**Drive Folder ID:** `1yvH5RnsVl-j9bhpuLy-7hibOX_-Zvwa_`

**이 문서가 Track 72 GATE C2의 최신 MASTER다.**

---

# 0. C2 목적

C1에서 이미 다음이 증명됐다.

- Moment Detail
- Connection reason
- Connected Moment traversal
- 8-Moment Replay
- Archive order와 감정 인과 분리
- Replay 종료 후 Archive 복귀

C2에서는 새로운 탐색 시스템을 만들지 않는다.

이번 목표는:

> **감정 경로를 끝까지 걸은 사용자가 “어디서 시작해서 어떻게 마음이 변했는지”를 한 번에 회고하고, 다시 걷거나 Archive로 안전하게 돌아갈 수 있게 하는 것**

이다.

---

# 1. C2는 Replay 종료 경험이다

현재 C1은 마지막 `m35`에 도달한 뒤 Replay를 종료할 수 있다.

C2에서는 마지막 Moment 이후 즉시 Archive로 튕기지 않고,
짧은 **PATH COMPLETION SUMMARY**를 제공한다.

사용자는:

```text
m14 FIRST MOMENT
↓
...
↓
m35 확신
↓
PATH SUMMARY
↓
다시 걷기 / Archive로 돌아가기
```

흐름을 경험한다.

---

# 2. Completion은 시스템 업적이 아니다

이번 Completion은:

- 시즌 완성
- 트리 완성
- 입덕 등급 확정
- 마일스톤 달성
- 보상

이 아니다.

오직:

> **이 대표 감정 경로를 끝까지 감상했다**

는 감상 완료 상태다.

`완전히 팬이 되었습니다` 같은 시스템 판정 문구 금지.

---

# 3. Summary에 보여줄 정보

대표 path `path-first-fan` 기준:

## 필수

- 경로 제목
- `8 MOMENTS`
- 시작 Moment
- 마지막 Moment
- 시작 감정
- 마지막 감정
- 주요 Turning Point
- 전체 감정 흐름

현재 prototype 기준:

```text
처음
m14 · 설렘

Turning Point
m33 · 확신

마지막
m35 · 확신
```

Turning Point 표시는 기존 metadata/Path Ledger 근거를 사용한다.

---

# 4. 감정 흐름 표현

허용:

```text
설렘
→ 궁금함
→ 궁금함
→ 궁금함
→ 놀람
→ 호감
→ 확신
→ 확신
```

또는 editorial한 세로 목록.

금지:

- 게임 skill tree
- 복잡한 graph
- radar chart
- score gauge
- 입덕 점수
- 자동 분석 그래프

이번 C2는 회고용 Summary다.

---

# 5. 8 Moment Summary Strip

각 8 Moment를 작게 보여줄 수 있다.

필수 조건:

- Moment identity가 유지됨
- 순서 `01~08`
- emotion 표시
- 과도한 썸네일 장식 금지

클릭 동작은 선택적.

클릭을 구현한다면:
- 해당 Moment detail로 이동
- Replay 상태를 임의로 깨뜨리지 않음

C2 PASS 필수는 아니다.

---

# 6. 가장 중요한 CTA 두 개

Summary의 주 CTA:

## A. `이 경로 다시 걷기`
- root `m14`
- `REPLAY 01 / 08`
- C1 Replay 재사용

## B. `Archive로 돌아가기`
- C1 이전의 original filter
- original scrollY
- original trigger vicinity
- original focus

복원.

---

# 7. CTA 위계

권장:

1. `이 경로 다시 걷기`
2. `Archive로 돌아가기`

단 사용자가 빠져나가기 어렵게 만들지 않는다.

Close / ESC도 항상 가능.

---

# 8. Replay 종료의 두 가지 의미 구분

사용자가:

### A. 중간에 Replay 종료
→ 즉시 기존 C1 방식으로 Archive 복귀.

### B. 마지막 Moment까지 완주
→ C2 Path Summary 표시.

둘을 혼동하지 않는다.

---

# 9. Summary에서 보여줄 Connection Copy

최소한으로 보여준다.

예:

```text
처음엔 한 장면이 계속 생각났고,
몇 번의 궁금함을 지나
호감과 확신으로 이어졌습니다.
```

단 이 문장을 새로운 사실처럼 자동 생성하지 않는다.

현재 8개 emotion/path metadata에서 직접 요약 가능한 범위만 사용.

과도한 감정 서사 발명 금지.

---

# 10. Source보다 Moment를 우선

Summary에서:
- YouTube
- 영상 제목
- 플랫폼

을 주인공으로 만들지 않는다.

우선순위:

1. Moment
2. Emotion
3. Connection
4. Source

이다.

---

# 11. C1 Viewer를 재사용

새 modal 시스템 금지.

C1 Common Viewer / Replay state를 유지하고
`completion summary` view state만 추가한다.

예:

```js
viewerMode:
  "detail"
  | "replay"
  | "path-summary"
```

Prototype 수준.

실제 canonical state 계약 확정 금지.

---

# 12. URL / Routing 금지

C2에서는:
- 새 route
- deep-link system
- query parameter architecture

를 만들지 않는다.

현재 single prototype 안에서만 검증한다.

---

# 13. 공개/파생 기능 금지

현재 Archive는 Private context다.

따라서 C2에서 다음 버튼을 만들지 않는다.

- 공유하기
- 공개하기
- 링크 복사
- 다른 사람에게 보내기
- 내 첫 순간으로 심기
- 파생 트리 만들기

LoveTree 원전에서 `내 첫 순간으로 심기`는 공개된 A의 경로를 B가 감상한 뒤 생기는 파생 흐름이다.

공개 범위와 privacy 정책을 확정하기 전에 C2에 섞지 않는다.

---

# 14. Pause / Rest도 이번 Gate에서 제외

`나무 아래 잠시 쉬기`는 별도 상태/여정이다.

C2 Summary에 억지로 넣지 않는다.

---

# 15. Visual Direction

A3.5/B1/C1의 editorial visual 유지.

Summary:

- white/ivory surface
- black typography
- soft neutral dividers
- 현재 accent color 정도만 사용
- Korean Sans-only

금지:
- fireworks
- confetti
- trophy
- badge explosion
- purple fantasy finale
- 마일스톤 축하 연출

이번 화면은 **조용한 회고**다.

---

# 16. Desktop Layout

권장:

```text
[ PATH COMPLETE ]

처음의 설렘에서
확신까지

8 MOMENTS

01 설렘
02 궁금함
03 궁금함
04 궁금함
05 놀람
06 호감
07 확신
08 확신

First Moment        Turning Point        Last Moment

[ 이 경로 다시 걷기 ]
[ Archive로 돌아가기 ]
```

정확한 카피/배치는 디자인팀 조정 가능.

---

# 17. Mobile

390×844 기준:

- horizontal overflow 0
- 8단계가 가로 스크롤 필수 구조가 되지 않게 함
- 세로 stack 또는 2-column summary 허용
- CTA 44px 이상 touch target 권장
- close / back 항상 접근 가능

---

# 18. Accessibility

필수:

- Summary 진입 시 heading 또는 status announce
- `이 경로 다시 걷기` button
- `Archive로 돌아가기` button
- focus가 Summary의 논리적 시작점으로 이동
- ESC 동작 일관
- Replay restart 후 focus/state 꼬임 없음
- reduced-motion 대응

---

# 19. Archive 복귀 회귀금지

C2 때문에 아래가 깨지면 FAIL.

- original scrollY
- original filter
- original focus
- visible-video IO
- 36 Moment
- First View 12
- media fit
- responsive columns

---

# 20. B1/C1 FOUNDATION LOCK

C2에서 수정하지 않는다.

- `ITEMS` 36
- `LOCK_COLS`
- B1 card fitting
- B1 video IO
- B1 filter
- C1 path 8 Moment
- C1 connection reasons
- C1 connected traversal
- C1 Archive order separation

---

# 21. 제출물

필수 5종:

1. `72_V1_GATE_C2.html`
2. `72_V1_GATE_C2_PATH_COMPLETION.mp4`
3. `72_V1_GATE_C2_RESTART_AND_RETURN.mp4`
4. `72_V1_GATE_C2_MOBILE.mp4`
5. `72_V1_GATE_C2_QA.md`

---

# 22. QA — Completion

- final `m35` 도달 = PASS
- Summary 자동/명시 진입 = PASS
- path length = 8
- start = m14
- end = m35
- first emotion = 설렘
- final emotion = 확신
- turning point metadata 근거 = PASS

---

# 23. QA — Restart

Summary에서:

`이 경로 다시 걷기`

→ m14  
→ REPLAY 01 / 08

PASS.

기존 Replay 엔진을 새로 작성하지 않는다.

---

# 24. QA — Return

Summary에서:

`Archive로 돌아가기`

→ original filter  
→ original scrollY  
→ original trigger context

복원.

delta가 눈에 띄지 않아야 한다.

---

# 25. QA — Early Exit

Replay 3/8 등 중간에 종료하면
Summary가 뜨지 않고 Archive로 복귀해야 한다.

---

# 26. PASS 기준

사용자가 경로 마지막에 도달했을 때:

> **“이 사람이 어떤 콘텐츠를 봤다”**

가 아니라:

> **“처음의 설렘이 어떤 감정 경로를 거쳐 확신으로 변했는지 다시 보였다.”**

라고 느낄 수 있어야 한다.

그리고 다음 행동이 명확해야 한다.

- 다시 걷기
- Archive 복귀

---

# 27. 다음 단계는 아직 열지 않는다

C2 PASS 후에도 즉시 공개/Derive를 구현하지 않는다.

다음 단계 후보는 별도 판단한다.

공개/파생으로 이동하려면 최소:
- visibility
- private memo
- emotion visibility
- source attribution
- derivation provenance

정책이 먼저 필요하다.

---

# 28. 상태

```text
GATE C1 = PASS

GATE C2 = AUTHORIZED

PUBLIC / SHARE / DERIVE = HOLD
GATE D = HOLD
```
