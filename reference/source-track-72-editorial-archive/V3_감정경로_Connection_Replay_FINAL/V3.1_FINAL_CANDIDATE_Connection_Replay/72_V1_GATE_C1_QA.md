# Track 72 — GATE C1 QA

## 상태

```text
A3 STRUCTURE = PASS
A3.5 ASSET CURATION = PASS
GATE B FOUNDATION = PASS
GATE B1 = PASS / LOCK

GATE C = AUTHORIZED
GATE C1 = IMPLEMENTED / 승인 대기
GATE D / 이후 = NOT AUTHORIZED
```

## 최신 MASTER
`MASTER_설계팀장9기_72_GATE_C1_MOMENT_CONNECTION_TRAVERSAL_REPLAY_작업지시_2026-08-17.md`

## C1 구현 범위
- B1 Common Viewer modal 재사용
- Moment Identity layer 확장
- 대표 8-Moment emotional path
- Connection reason 표시
- Connected Moment viewer-in-place traversal
- `처음부터 다시 걷기` Replay
- Replay step / emotion 표시
- Connected previous/next keyboard traversal
- Archive order 보조 UI를 Connection과 명확히 분리
- Replay 종료 시 Archive scroll/filter/focus 복귀

구현하지 않음:
- backend/DB
- routing
- graph editor
- recommendation
- 3D transition
- 새 자산 생성/재큐레이션
- B1 Archive redesign

---

# 1. B1 Foundation Regression

## Data / First View
- B1 `ITEMS` JSON과 C1 `ITEMS` JSON exact comparison: **동일 / 36 Moment**
- `LOCK_COLS` exact comparison: **동일**
- First View 12 identity: **12/12 유지**
- actual video item ID: `m01 / m07 / m11 / m13` 유지
- original MP4 relative source path 유지

## B1 foundation code
다음 구간을 B1과 C1에서 byte comparison했다.

`cardHTML → distribute → renderLocked → matchItems → render → rememberVideoTimes → IntersectionObserver → wireVideos → wireCards → setFilter`

SHA-256 양쪽 동일:

`e2aac9cd0e421cf1ca2bdbf2d60ffe96ab05cddf8681c4bee05e65647b392454`

즉 Scroll / Filter / Masonry / visible-video IO foundation은 C1에서 재작성하지 않았다.

## Typography
검색 결과 없음:
- Georgia
- Times New Roman
- Noto Serif KR
- Gowun Batang
- Batang
- 궁서

한국어 Sans-only 유지.

---

# 2. Representative Path

Path ID:
`path-first-fan`

Path length:
**8 Moment / PASS**

Order:

`m14 → m16 → m17 → m22 → m23 → m26 → m33 → m35`

세부 이유는 `72_V1_GATE_C1_PATH_LEDGER.md` 참조.

---

# 3. Connection QA

브라우저 runtime QA:

- Moment `m14` open: **PASS**
- Connection reason 표시: `이 표정이 계속 생각났다.` / **PASS**
- Connected CTA 존재: **PASS**
- `m14 → m16` viewer 안 교체: **PASS**
- modal close/reopen 없이 traversal: **PASS**
- Connection reason read delay: 약 620ms + subtle fade / **PASS**
- 화려한 3D/particle transition: **없음**

### Filter를 넘는 traversal
`Object` filter 상태에서 `m22`를 열고 Connected Moment `m23` Memo로 이동:

- traversal: **PASS**
- Archive filter remains `object`: **PASS**
- filter 때문에 연결 이동 차단: **없음**

---

# 4. Archive Order ≠ Connection QA

Viewer 오른쪽 hierarchy:

1. `CONNECTION · 감정의 다음 이유`
2. Connected Moment CTA
3. Replay
4. `ARCHIVE ORDER · 단순 목록 위치`

Archive previous/next는 secondary styling이다.
UI에 다음 설명을 명시했다.

`Archive order는 기록 목록 순서이며, 위의 Connected Moment와 같은 개념이 아닙니다.`

판정: **PASS**

---

# 5. Replay QA

브라우저 runtime 결과:

- path 중간 `m16/m26`에서 Replay CTA 제공: **PASS**
- Replay click → root `m14`: **PASS**
- Replay state: **true**
- header status: `REPLAY 01 / 08 · 설렘`: **PASS**
- total step = 08: **PASS**
- path order 기준 next traversal: **PASS**
- final `m35` 도달: Evidence MP4로 확인
- Replay exit 제공: **PASS**

### Keyboard
Replay root에서:
- `ArrowRight`: `m14 → m16` / **PASS**
- `ArrowLeft`: `m16 → m14` / **PASS**

button/video/input/control focus 상태에서는 arrow handler가 개입하지 않도록 제한했다.

---

# 6. Scroll / Filter Preservation

자동 QA 값:

- viewer open 전 Archive `scrollY`: `1331`
- Replay exit 후 `scrollY`: `1331`
- delta: **0 px / PASS**
- filter: `all → all` 유지

Object filter cross-type traversal:
- open 전/close 후 scroll delta: **0 px / PASS**
- filter: `object → object` 유지

B1 scroll preservation 회귀 없음.

---

# 7. Mobile QA

Viewport:
`390 × 844`

- Archive columns: **2 / PASS**
- horizontal overflow: **0 / PASS**
- Moment Detail media → identity → Connection 영역 세로 흐름: **PASS**
- Connected CTA tap 가능: **PASS**
- Replay CTA 노출: **PASS**
- B1 sidebar 전역 `aside` 규칙이 viewer info를 숨기지 않도록 C1 viewer의 `aside.c1Info`만 명시적으로 reset
- Archive 자체 sidebar / first-view layout는 변경하지 않음

---

# 8. Accessibility

- Connected Moment CTA = `<button>`
- Replay CTA = `<button>`
- Replay 상태 `aria-live`
- Connection reason transition screen reader announce
- 기존 B1 focus trap 유지
- X / ESC / backdrop close 유지
- close 후 trigger focus return 유지
- focus-visible 유지
- `prefers-reduced-motion`에서 C1 transition 최소화

---

# 9. Video / Media Regression

C1 대표 path는 현재 metadata 기반 8 Moment로 구성했으며 actual video Moment를 억지로 path에 삽입하지 않았다.

B1에서 승인된 actual video foundation은 변경하지 않았다.
- 4 actual MP4 source identity 유지
- `muted / loop / playsinline / preload=metadata`
- B1 IntersectionObserver code byte-identical
- B1 fitting / DO_NOT_USE 정책 유지

C1 viewer가 video Moment를 열 경우 B1과 동일하게 currentTime을 받아 controls viewer를 준비하고, viewer 우선 playback logic을 유지한다.

---

# 10. Evidence

- `72_V1_GATE_C1_CONNECTION_TRAVERSAL.mp4`
  - Archive Moment → Detail → Connection reason → connected traversal
- `72_V1_GATE_C1_REPLAY.mp4`
  - path 중간 Moment → root replay → 8-step path → exit
- `72_V1_GATE_C1_MOBILE.mp4`
  - 2-column Archive → Moment Detail → Connection → Replay entry

---

# 최종 자체 판정

- Moment Detail extension = PASS
- Connection causality hierarchy = PASS
- Archive order separation = PASS
- Connected traversal = PASS
- Replay root / step order = PASS
- Arrow connected navigation = PASS
- Scroll/filter restoration = PASS
- Mobile C1 viewer = PASS
- B1 foundation regression = 0 detected

**`GATE C1 = CANDIDATE / 제품오너·설계팀 승인 대기`**

C1 승인 전 다음 확장으로 진행하지 않는다.
