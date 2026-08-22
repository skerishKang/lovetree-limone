# MVP Production Smoke — 2026-08-21 (mobile deep verification)

- Lane: kilo-4 pure verification (zero code changes)
- Refs: #344 (MVP 차기 웨이브 결정 패키지)
- Target: `https://lovetree-limone.charliekant.workers.dev` (Production Worker `lovetree-limone`)
- Method: headless Chromium (Playwright 1.55), mobile emulation 390x844 @2x DPR,
  touch enabled, iOS Safari UA. Console `error`/`warning`, `pageerror`,
  `requestfailed` all captured. Overflow measured as
  `max(documentElement.scrollWidth, body.scrollWidth) - documentElement.clientWidth`.
- Raw machine output: `report.json` retained in worker workspace
  (`/tmp/kilo/prod-smoke-20260821/`).

## ① Mobile 390x844 route captures

| Route | HTTP | overflowX | Visual review |
| --- | --- | --- | --- |
| `/v4/entry` | 200 | **0 px** | 정상 — LOVETREE 헤더 + ENTER MY TREE pill, SEED 스테이지("A feeling begins."), PLAY THE BLOOM, 하단 SEED/FEELING/MOMENTS/BLOOM 진행 레일, V4 화면 보기 칩. 깨짐·클리핑 없음. |
| `/v4/trees/demo/graph` | 200 | **0 px** | 정상 — 에디터 툴바(← 성장 트리 / 연결 모드 / 자동 정리 / −92%＋ / 영상 보기), 자유 연결 그래프 본문, 순간 카드+연결 곡선 렌더. 툴바 2행 wrap은 정상 반응형 동작. |

Evidence: `entry-390x844.png`, `journey-editor-390x844.png` (this directory).

## ② Full journey click rehearsal (진입 → ENTER MY TREE → 에디터)

| Step | Result |
| --- | --- |
| open `/v4/entry` | OK — no redirect, landing renders |
| enumerate CTAs | OK — MOMENTS / BLOSSOM / INVITATION / **ENTER MY TREE**(`lt55-pill primary`) / PLAY THE BLOOM / V4 화면 보기 |
| click ENTER MY TREE | OK — 즉시 `/v4/trees/demo/graph`로 네비게이션, 모달 없음 |
| editor reached | OK — "자유 연결 그래프 · NODE GRAPH PROTOTYPE · DRAG · CONNECT · INSPECT", 컨트롤 21개, 줌 92% 표시 |

**Journey verdict: PASS** — 익명 사용자 기준 전체 동선이 클릭만으로 에디터까지 도달.
참고: 그래프 본문은 canvas가 아니라 DOM 노드 + SVG 곡선으로 렌더됨(`hasCanvas=false`는 결함 아님, 구현 특성).

## Console scan

- `pageerror`: **0**
- `requestfailed`: **0**
- console error: **0**
- console warning: **4** — 전부 동일 패턴:

> Firebase: "The current domain is not authorized for OAuth operations. This will prevent signInWithPopup, signInWithRedirect, linkWithPopup and linkWithRedirect."

`/v4/entry`, `/v4/trees/demo/graph` 각 2회. **Advisory finding**: Production 도메인
(`lovetree-limone.charliekant.workers.dev`)이 Firebase Authentication authorized
domains에 등록되어 있지 않음. 현재 동선(익명 demo)에는 영향 없지만, 소셜/팝업 계열
로그인을 이 도메인에서 쓰는 순간 실패합니다. MVP 선언 전에 Firebase 콘솔에서
authorized domain 추가 권장 (코드 변경 불요, 콘솔 설정 작업).

## Verdict

- Mobile rendering: PASS (overflow 0, breakage none)
- Journey rehearsal: PASS (entry → ENTER MY TREE → editor)
- Console: PASS with 1 advisory (Firebase OAuth domain authorization)

MVP 선언 전 블로커로 보이는 항목은 없음. 유일한 실행 항목은 위 Firebase
authorized domain 등록(운영 설정).
