# LoveTree V4 Additional Sources — Phase P1 Implementation

Phase P1 implements the two newly classified original HTML sources as
source-faithful React screens. This document records the implementation,
preservation, validation and remaining work.

- Branch: `feat/v4-additional-p1-journey-moments100`
- Base: `feat/v4-integrate-additional-sources` @ `cd9dd1fb3e9684040553f96f564aeaabec7632cd`
- PR #31: untouched (separate branch, still Draft)

## 1. Source → route → component

| Source | Route | Component | CSS |
|---|---|---|---|
| `[샘플]/lovetree-first-journey-unified-v1.html` | `/v4/journey` | `app/components/v4/V4FirstJourney.tsx` | `app/styles/v4/first-journey.css` |
| `[샘플]/lovetree-100-moments-season-temperature-v4.html` | `/v4/trees/demo/graph/100-moments` | `app/components/v4/V4Moments100.tsx` | `app/styles/v4/moments-100.css` |

Route pages: `app/v4/journey/page.tsx`, `app/v4/trees/demo/graph/100-moments/page.tsx`.

## 2. 원본 구조 보존 내역

### lovetree-first-journey-unified-v1 (`V4FirstJourney`)
- Unified 4단계 navigation bar (01 첫 순간 / 02 마음 남기기 / 03 다음 영상 잇기 / 04 러브트리 성장), 현재 단계 `is-active`, 완료 단계 `is-done`, 미해금 단계 `is-locked` + `aria-disabled`.
- Landing: 히어로 문구, `＋ 첫 순간 심기` CTA, 트리 이름 모달(`#name-form`), 둘러보기 영역.
- Step 1: 발견 콘텐츠 링크(`#content-url`) → 썸네일/제목 preview, 첫 순간 메모(`#discovery-note`), 발견 날짜, 성공 전환(`saved:true`, 다음 단계 unlock).
- Step 2: 연결된 영상 카드(썸네일·제목·URL·`#card-time`), 정확한 시점 조절(`#time` + `−5초/＋5초`), 감정 칩 6종 + 직접 입력(`#custom-emotion`), 메모 140자(`#memory`), 공개 여부 스위치(`#visibility`), 발견 날짜, 성공 카드(`data-testid="step2-success"`).
- Step 3: 첫 카드 ↔ 다음 카드 연결 보드(SVG 가지 `#v4j-branch-path`·잎), 다음 영상 링크/제목/시점(`#next-url`, `#next-title`, `#next-time`), 관계 이유 칩(`data-relation`), 메모(`#next-note`), 실시간 다음 카드 preview(`data-testid="next-card"`), 연결 성공 상태(`step3-success`, 경로 요약·관계 문장).
- Step 4 growth: 앞 단계에서 생성한 첫 순간·다음 영상 카드(`data-testid="growth-first"`, `growth-next`)와 성장 보드를 반영.
- 접근성: ESC로 닫히는 모달 + focus trap, `aria-current="step"`, `aria-disabled`, label 연결(`htmlFor`), `prefers-reduced-motion` 처리.

### lovetree-100-moments-season-temperature-v4 (`V4Moments100`)
- Graph workspace + 오른쪽 352px inspector, desktop 2열, mobile 하단 inspector.
- 종이 질감·점 그리드 배경·minimap·상단 툴바(보기·확대·맞춤).
- 실제 100개 노드(`moment-1`~`moment-100`) + 뿌리 노드, 대표 카드 6개(root + 1·24·50·78·100), 전체 100개 표시 토글(`data-density="all"` → 101개 `[data-moment-id]`).
- 레이아웃 5종: radial / tree / circle / grid / timeline — 각각 실제 node 좌표가 달라지는 `applyLayout`.
- Inspector 3탭(role=tab): 순간 심기 / 선택한 순간 / 온도.
- 온도 3지표: 나의 트리 결 % (`temp-creator`), 이 순간의 팬 반응 ° (`temp-moment`), 주연 전체 팬 온도 (`temp-subject`) + 태그↔색 팔레트.
- 시즌: `data-season`(undecided/season2/continuous), 시즌 1 완성 오버레이(`#completionOverlay`), 회고 재생(`#reviewOverlay`), 다음 선택 다이얼로그(`#decisionDialog`: 시즌2로 이어가기/시즌 구분 없이 계속/입덕 코스 만들기).

## 3. Interaction 보존 내역

### First Journey
- 단계 순차 잠금(unlocked: step1 항상, step2 = 첫 순간 저장, step3 = 마음 저장, growth = 연결 존재) + 직접 접근 가드(showScreen guard) + toast 안내.
- 이전·다음 이동(`goToStage`, back 버튼), 새로고침 복원(loadState → 단계/입력값 복원).
- 모달: ESC 닫기, 배경 클릭 닫기, focus trap, 트리 이름 저장 후 step1 진입.
- 감정 칩 radio(aria-checked), 직접 감정 입력 우선(`customEmotion.trim() || emotion`).

### 100 Moments
- pan(캔버스 드래그), zoom(휠/버튼 `#zoomIn`/`#zoomOut`), fit(`#fitView`), node drag, 연결선 drag(`.v4-moments-handle.out` → 새 간선 생성), node select, density 전환(대표 경로/전체 100개), layout 전환, minimap 동기화(`#miniMap`), keyboard ESC + focus trap.
- 선택 노드 인스펙터 연동(선택한 순간 탭), 온도 탭 데이터 시각화.

## 4. Storage 구조

원본 3개 key를 그대로 보존(실제 원본에서 재확인, `[샘플]`의 상수와 일치).

| Key | 구조 |
|---|---|
| `lovetree-first-journey-unified` | `{ currentScreen, treeName, firstMoment, memory, connections, step3Origin, drafts }` |
| `lovetree-step2-record` | `{ id, url, title, time, emotion, note, date, publicMemo }` |
| `lovetree-step3-connection` | `{ first, next, createdAt }` |

- 원본 key를 제거하거나 단일 key로 합치지 않음.
- 100-moments 원본은 localStorage를 사용하지 않으므로 별도 storage 없음(모두 메모리 상태).

## 5. Desktop 결과

- `/v4/journey`: 4단계 nav·landing·step1~4·growth 전부 렌더 정상, 가로 overflow 없음, console/pageerror 0.
- `/v4/trees/demo/graph/100-moments`: 100개 노드·대표 6카드·레이아웃 5종 전환·인스펙터 3탭·온도 3지표·시즌 오버레이·결정 다이얼로그 렌더 정상.
- 원본 대비 스크린샷 RMSE(ImageMagick): 100-moments 3.5~6.3%, first-journey step1/landing 10~14%, growth 25%.
  스크린샷은 `/tmp/lovetree-p1-screens/`에만 저장(커밋하지 않음).

## 6. Mobile 결과

- 320×720 / 390×844 뷰포트에서 두 route 모두 가로 overflow 없음, console/pageerror 0.
- first-journey: ≤860px nav 가로 스크롤, ≤680px/≤560px 단계 레이아웃 1열 전환.
- 100-moments: inspector 하단 배치, controls·minimap 재배치, 터치 pan/zoom/node 선택 대응.

## 7. 원본 대비 차이

- YouTube 썸네일은 원본과 동일한 `img.youtube.com` URL을 사용하되, 오프라인 환경에서는 로드 실패로 대체 스타일(그라데이션)을 보여줌(원본도 동일 동작).
- 일부 카피 문장은 동일 의미로 정리(예: growth 헤드라인·hint 문구).
- 100-moments의 데이터 수치는 원본과 동일한 6개 대표 카드·100개 노드·온도 수치 계열을 유지.

## 8. 의도적으로 변경한 항목과 근거

- `V4FirstJourney`는 단일 페이지 4스테이지를 독립 route(`/v4/journey`)로 이식: 분류 문서의 채택 방안(기존 랜딩/단계 route 교체 금지 원칙과 병행).
- 새로고침 복원은 마운트 후 setTimeout(0)으로 상태를 복원해 SSR hydration 불일치를 피함(리액트 규칙 준수).
- 100-moments는 `data-moments-dialog`/`data-hidden` 속성 기반 다이얼로그·오버레이 표시로 접근성(ESC·focus trap) 유지.
- 감정·관계 칩은 원본의 radio 선택 구조를 유지(직접 입력 우선 규칙 포함).

## 9. 테스트 결과

- 신규: `tests/v4-first-journey-source-faithful.test.mjs`, `tests/v4-moments-100-source-faithful.test.mjs` — 7개 테스트 전부 통과.
- 뷰포트: 1536×960 / 1280×800 / 768×1024 / 390×844 / 320×720.
- 검증 항목: HTTP 200, iframe 0, duplicate ID 0, 가로 overflow 0, console/pageerror 0,
  잠금 단계 접근 방지, step1~4 전체 흐름, storage 3키 저장·새로고침 복원, 모달 ESC,
  100개 노드 토글, 대표 6카드, 레이아웃 5종 위치 변화, 인스펙터 3탭, node 선택, pan/zoom/fit,
  node drag, 연결선 drag, minimap, density 전환, season overlay, decision dialog, 온도 3지표.
- 전체: `npm test` 487개 전부 통과. `npm run lint` 0 errors, `npm run typecheck` 통과,
  `npm run build` 통과, `npm run db:check` 정상.
- 기존 baseline(`tests/v4-additional-source-baseline.test.mjs`) 4개 + 기존 contract 테스트 24개 전부 통과.
- manifest: 23 → 25 source(`first-journey-unified-v1`, `100-moments-season-temperature-v4`, status `implemented`).
  관련 count 문서·테스트를 25로 일관 반영.
- 최종 통합(`feat/v4-final-integrated-candidate`): bookshelf 4종(§9 P2)을 중앙 등록하여
  manifest = implemented = registry = 29 source, unimplemented 0. dock badge·landing copy 29로 갱신.

## 10. 아직 미구현인 나머지 source

- bookshelf 4종: `lovetree-people-book-shelf-v1`, `lovetree-people-book-shelf-v2-1-true-page-motion`,
  `lovetree-people-book-shelf-v2-3d`, `lovetree-people-book-shelf-v2a-2-interaction-stable`
- 별도 감사/후속 Phase에서 처리 예정. 이번 Phase에서는 수정하지 않음.
- (기존 archive 계열 accordion/folding/liquid/motion, tree-pause도 이번 Phase 대상 아님.)

## 11. PR #31과 별도 branch

- 이번 작업은 `feat/v4-additional-p1-journey-moments100` 브랜치에서 진행.
- `base: feat/v4-integrate-additional-sources` 대상 Draft PR로 별도 관리.
- PR #31은 수정·Ready·merge하지 않음. 배포 없음.

## 12. 분류 재판정

- `docs/v4/V4_ADDITIONAL_11_SOURCE_CLASSIFICATION.md` 반영:
  - `100-moments-season-temperature-v4`: MISSING → MATCH
  - `first-journey-unified-v1`: PARTIAL_MATCH(설계) / MATCH(상호작용)
