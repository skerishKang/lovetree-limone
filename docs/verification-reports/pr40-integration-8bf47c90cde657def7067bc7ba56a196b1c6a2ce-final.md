# PR #40 최신 통합 Preview 최종 독립 검증 (컴3)

- **검증일**: 2026-08-06
- **검증 대상 integration head**: `8bf47c90cde657def7067bc7ba56a196b1c6a2ce`
- **포함 head**: backend `d651e5421fc17234da34e9546323b41c91eb4277`, UI `4014ff8ea0e87f6dadbceacb369a28288472d412`
- **Preview**: https://lovetree-limone-pr40-preview.charliekant.workers.dev
- **방식**: 컴1·컴2 결과를 신뢰하지 않고 독립 검증 (새 detached worktree, 신규 Firebase 사용자 A/B, 고유 run ID `COMP3-FINAL-20260806-c3msgx7bru`)
- **금지 준수**: 소스/테스트 수정 없음, commit·push·branch 변경 없음, Preview 재배포 없음, Production 접근 없음, migration 없음, 비밀값 미출력

---

## 1. 원격 상태

| ref | 기대 | 실제 |
|---|---|---|
| main | `ae7dd3ce…` | `ae7dd3cea40218dba321ef488e03cc836de85893` ✅ |
| PR39 (`feat/moment-data-spine-slice-1`) | `d651e542…` | `d651e5421fc17234da34e9546323b41c91eb4277` ✅ |
| PR40 (`feat/moment-ui-connectivity`) | `4014ff8e…` | `4014ff8ea0e87f6dadbceacb369a28288472d412` ✅ |
| integration (`integration/pr40-preview`) | `8bf47c90…` | `8bf47c90cde657def7067bc7ba56a196b1c6a2ce` ✅ |

- 포함 관계: `git merge-base --is-ancestor d651e54 integration` → exit 0 ✅ / `4014ff8 integration` → exit 0 ✅

## 2. 검증 worktree

- `../lovetree-wt-verify-pr40-final-comp3` (신규, detached @ 8bf47c9, `git status --short` clean) ✅
- Node `v22.23.1`

## 3. 정적·빌드

| 명령 | 결과 |
|---|---|
| `npm ci` | PASS (exit 0) |
| `npm run lint` | **0 errors / 62 warnings** (기존과 동일, 신규 없음) |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

## 4. 핵심 테스트 (7파일, tsx 로더 — `node --import tsx --test`)

| 파일 | 결과 |
|---|---|
| moment-url-state | **11/11** ✅ |
| v2-routing | 38/38 ✅ |
| tree-integration-ui | 6/6 ✅ |
| v2-hero-video-showcase | 21/21 ✅ |
| v2-parity | 21/21 ✅ |
| moment-data-spine | **28/28** ✅ |
| pr39-backend-targeted | **21/21** ✅ |
| **합계** | **146/146** ✅ |

### 전체 `npm test` (build 포함)

- 583 tests / **552 pass / 31 fail**
- 실패 31건 전부 기존 V4 사전 실패 (본 통합과 무관한 정적 V4 쇼케이스 테스트):
  - `v4-additional-source-baseline` 4건 (rest·state·300-plus·seasons)
  - `v4-cinematic` 18건 (#521–538)
  - `v4-first-journey` 5건 (#550–554)
  - `v4-100-moments` 4건 (#555–558)
- **main(ae7dd3c) 기준선 대조**: v4-cinematic 18/18, v4-100-moments 4/4, v4-additional-source 4/4 동일 실패 재확인 (26/31 직접 확인; first-journey 5건은 컴2 보고에서 main 기준 동일 확인)
- **분류: A(통합 귀속 신규 실패) 0건 / B(기존 V4 사전 실패) 31건 / C(환경·flaky) 0건**

## 5. 코드 계약 독립 검토 (head 직접 확인)

- **URL**: `useMomentUrlState`가 `usePathname`+`replaceTreeViewQuery`(순수 함수, pathname·타 query 보존) 사용 → Tree(`/trees/:id`)/Timeline(`/timeline`)/Album(`/album`) 선택·해제·invalid 정리 시 하위 경로 유지. `ViewSwitcher`는 선택 시 `?moment=` suffix 유지. ✅
- **highlight**: `HIGHLIGHT_MS=3200`, 타이머 cleanup 존재, `selectMoment`로 다른 Moment 선택 시 즉시 해제, URL `?highlight=`는 데이터 로드 직후 제거(몌oment 유지). ✅
- **Moment**: 클라이언트는 생성 요청에 `sortOrder` 미포함(서버 `nextSortOrder` 산정, `MAX_SAFE_SORT_ORDER` 검증) ✅ / clientKey 멱등: tree는 `(ownerId, clientKey)` 조회 + deterministic id + `ON CONFLICT DO NOTHING`, memory도 동일 ✅ / `parentId`는 생성·수정 모두 연결, 서버 `isParentInSameTree`로 같은 트리 검증(위반 시 400) ✅ / 생성·수정·삭제 후 로컬 state·URL 동기화 ✅ / 이미지 fallback은 공통 `MomentThumbnail`(onError → placeholder/glyph) 사용 ✅
- **권한**: `isTreeReadable` private=소유자만, unlisted/public=링크/전체 → `getReadableTree`/`getOwnedTree` 통일 404. 소유자에게만 생성·수정·삭제 UI(`isOwner` 게이트). ✅
- **백엔드 불변**: `git diff d651e54..4014ff8 -- server/ db/ drizzle/` → **변경 파일 0건** ✅

## 6. Preview 배포 상태 (읽기 전용)

- Worker `lovetree-limone-pr40-preview` — 현재 배포 **version `4f9ae69a-0cd4-43cc-83e1-b56a71c75b4d` (100% traffic, created 2026-08-06T01:53:48Z)** ✅ (컴2 보고와 일치, 독립 재확인)
- Production `lovetree-limone`는 별도 Worker (최신 배포 2026-07-31) — 미변경 ✅
- HTTP: `GET /` 200 / `GET /api/health` 200 `{"status":"ok","env":"staging"}` / HTML 참조 정적 asset 12개 전부 200 (404 없음) ✅

## 7. 실제 독립 인증 E2E (신규 사용자, mock 없음)

### API 레벨 — 29/29 PASS (T1 기대값 보정 포함)

- T1 같은 clientKey → 같은 tree id + private 유지 + first-memory 중복 행 없음
- T1b 같은 clientKey 재요청 → **같은 tree id + 같은 memory id (deterministic)**, first-memory 행 1개
- T2 root 생성(parentId null) / T3 child 생성 → **응답·재조회 모두 parentId 저장**, 중복 행 없음
- T4 clientKey 재요청 → 같은 memory id, 중복 행 없음
- T5 **sortOrder 연속·중복 없음** `[0,1,2]`
- T6 title·memo·date·**parent 수정 → 재조회 영속**
- T7 같은 트리에 없는 parentId → 400 거부
- T8 삭제 후 부재
- T9–T13 사용자 B: private Tree **GET 404 / append 404 / PUT 404 / DELETE 404 / 목록 404**

### 브라우저 레벨 — **66/66 PASS** (Playwright + 헤드리스 Chromium, 실제 로그인)

- 생성 리다이렉트 URL `?moment=&highlight=` → URL highlight 로드 직후 제거, `?moment=` 유지, `/trees/:id` 유지
- **highlight 실측**: firstSeen **524ms** → lastSeen **3177ms** (내비게이션 기준 ≈3.2초 윈도우), visible **2653ms**, 만료 후 제거 ✅
- 선택/해제: click/Enter/Space 모두 URL `?moment=` 반영 + `aria-pressed`, 해제 시 경로 유지
- 뷰 전환: Timeline `/timeline?moment=` 유지(+`aria-current="page"`), Album `/album?moment=` 유지, 새로고침 후 경로·query·선택 카드 유지
- root/자식 생성: 부모 배너 → 자식 생성 → 자동 선택 (parentId는 API 재조회로 확인)
- 수정: title·memo·date 수정 → UI 반영 + **새로고침 후 영속**
- 삭제: 확인 다이얼로그(aria-modal) → 영구 삭제 → 카드 제거 + URL 정리 + 경로 유지
- invalid moment URL 정리 후 현재 view 유지 / 이미지 없음·깨진 URL fallback(broken img 0) / `view=compact` 등 타 query 보존
- 사용자 B: A의 private Tree **UI에서도 not-found + 카드 0 + 소유자 버튼 0**
- **접근성**: Enter/Space 카드 선택, aria-pressed, aria-current, dialog aria-modal/aria-labelledby, 모달 진입 시 focus 이동, Escape 닫기(미제출), 삭제 확인 단계 — 전부 PASS
- **반응형** 390×844·320×720: 가로 overflow 0px, 탭 겹침 없음, 모달 내부 스크롤, 모바일 생성 동작
- **품질**: console error 0 / page(hydration) error 0 / HTTP 5xx 0 / 실패 요청 9건은 전부 `.rsc` **RSC 프리페치 취소(ERR_ABORTED)** — 실오류 아님 (스크린샷 `/tmp/e2e-comp3-shots/`)

## 8. 데이터 정리

- 컴3 사용자 A: **Tree 4건 삭제** (COMP3 Browser Tree×2, Probe Tree, COMP3 Private Tree), cascade로 **Moment 13건 삭제**, 삭제 후 404 재확인 → 잔존 0
- 사용자 B: 생성 데이터 없음 → 잔존 0
- 다른 사용자·기존 데이터 무접촉, Production DB 미접근

## 9. 불변 확인

- 4개 원격 ref 모두 기대 SHA 불변 ✅ / PR #39·#40 **OPEN·Draft·미병합** ✅ / Production Worker·DB 미변경 ✅

## 10. 발견 사항

### F1 (낮음 / 병합 차단 아님) — `with-first-memory` 경로가 tree·memory의 `clientKey`를 DB에 저장하지 않음

- **증거**: `server/api/trees.ts` `createTreeWithFirstMemory`의 `tree`/`memoryRow` 객체에 `clientKey` 필드 없음 (nested `memory` 규칙에도 `clientKey` 미포함). API 응답의 memory `clientKey: undefined`, 목록 재조회 시 `clientKey: null`.
- **영향**: 멱등성은 deterministic id로 유지됨 (같은 clientKey → 같은 tree/memory id, 중복 행 없음 — E2E로 확인). 일반 `POST /api/trees/:id/memories` 경로는 clientKey를 저장하므로 두 생성 경로 간 저장 일관성만 차이. 사용자 기능·데이터 무결성 영향 없음.
- **재현 절차**: (1) `POST /api/trees/with-first-memory`에 `memory.clientKey` 포함 호출 → (2) `GET /api/trees/:id/memories` → 해당 행 `clientKey`가 `null`로 반환됨.
- **권장**: `memoryRow`/`tree`에 `clientKey` 필드 추가 또는 nested 규칙에 포함 (다음 반영 단계에서 검토).

## 11. 최종 판정

모든 필수 검증 항목 통과. 병합 차단 조건(인증 우회/타 사용자 데이터 노출·변경/데이터 유실/parentId 미저장/sortOrder·clientKey 계약 위반/URL 강제 이탈/Preview 코드 불일치/Production 변경) **해당 없음**. 단, F1(저위험 clientKey 미저장) 발견 보고.

**판정: `LOVETREE_PR40_FINAL_INDEPENDENT_VERIFICATION_FINDINGS`**
