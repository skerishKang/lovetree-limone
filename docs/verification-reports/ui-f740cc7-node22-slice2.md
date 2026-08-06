# UI 브랜치 PR #40 (Slice 2) 검증 보고서 (컴3)

- **대상**: `feat/moment-ui-connectivity` 델타 `d016ad2..f740cc7`
  - previous verified head: `d016ad2a55a1d4ec537448ce321e2d275cef864c` (기검증)
  - target head: `f740cc7c29fe8ff7831ac9b8e83643e6cf52e189`
- **검증 worktree**: `../lovetree-wt-verify-ui-f740cc7` (detached HEAD)
- **환경**: Node.js v22.23.1 (nvm), `npm ci` 실시
- **델타 구성**: `ca4ddde`(shared data layer, view switcher, moment detail modal) + `f740cc7`(docs/스크린샷)

**marker: `LOVETREE_MOMENT_UI_SLICE2_VERIFICATION_FINDINGS`**

---

## 1. 검증 파이프라인 (Node 22.23.1)

| 단계 | 명령 | 결과 |
|---|---|---|
| 의존성 설치 | `npm ci` | 성공 (423 패키지) |
| lint | `npm run lint` | **0 errors / 66 warnings** (d016ad2 대비 +2) |
| typecheck | `npm run typecheck` | **exit 0, 0 오류** |
| build | `npm run build` | **성공** |
| test | `npm test` | 551 테스트, **516 pass / 35 fail** (d016ad2 520/31 대비 **신규 실패 4건**) |

### 신규 실패 4건 (F6) — 스테일 소스-패턴 테스트
| 테스트 | 파일 | 원인 |
|---|---|---|
| `V1 routes unchanged: tree detail page exists` | v2-routing.test.mjs | page.tsx에서 `/apiFetch/` 패턴 단언 — fetch가 `lib/use-tree-moments.ts`로 이동 |
| `real tree routes exist and use the App Router shape` | tree-integration-ui.test.mjs | page.tsx의 API URL 패턴 단언 — 훅으로 이동 |
| `tree detail loads real records and exposes owner-only memory mutation controls` | tree-integration-ui.test.mjs | page.tsx 인라인 CRUD 코드 패턴 단언 — 훅으로 이동 |
| `first moment stores the selected local date and redirects to the real tree` | tree-integration-ui.test.mjs | `router.push(\`/trees/${currentTreeId}\`)` 정확 매칭 — `?highlight=${data.id}` 추가로 불일치 |

- 이 4건은 **소스 파일 문자열을 grep하는 취약한 테스트**로, 리팩터(로직 훅 이동 + 하이라이트 쿼리 추가)에 미갱신. **기능적으로는 정상** (경로·데이터 로드·소유자 컨트롤 모두 유지, 오히려 훅 공유로 개선).
- 나머지 31건은 d016ad2/main과 동일한 V4 레거시 브라우저 사전 실패.
- 신규 변경 파일 lint 경고: `<img>` 4건 + `app/trees/[id]/page.tsx:4` 미사용 `Link` import 1건 (모두 비차단).

## 2. 소스 검토 (d016ad2..f740cc7 델타)

| 체크 항목 | 결과 |
|---|---|
| **useTreeMoments 공통 상태** | ✓ `lib/use-tree-moments.ts` — tree/moments/canonicalMoments + 3개 파생 뷰(tree/timeline/album), loading/error/isOwner/selectedMoment/highlight를 단일 훅으로 관리 |
| **MomentDetailModal** | ✓ 상세(출처/날짜/제목/메모/썸네일/태그/출처링크/부모) + 수정 폼 + 삭제(`window.confirm`), 소유자 전용 버튼, 오류 표시(`role=alert`), Escape/백드롭/× 닫기, `aria-modal`/`aria-labelledby` |
| **create/update/delete 호출** | ✓ 훅 → `POST /api/trees/:id/memories`, `PUT /api/memories/:id`, `DELETE /api/memories/:id` (apiFetch, clientKey 포함) |
| **Tree/Timeline/Album 동일 Moment ID** | ✓ 3개 페이지 모두 같은 훅의 `canonicalMoments`에서 파생 — 동일 ID, 동일 소스 |
| **변경 후 공통 목록 반영** | ✓ create=append, update=map, delete=filter — 훅의 `setMoments` 하나로 3개 뷰 동시 반영 |
| **선택 및 highlight 정리** | ✓ 선택/닫기(`selectMoment(null)`), 삭제 시 선택 해제, 생성 시 highlight 설정 + `?highlight=` 쿼리 반영. **주의**: `clearHighlight`는 노출만 되고 호출처 없음 → 하이라이트 영구 유지 (경미, W2) |
| **로딩/빈 상태/API 오류** | ✓ 3개 페이지 모두 로딩/빈 상태/오류+재시도 UI 보유 |
| **mock 제품 데이터 없음** | ✓ 신규 파일 전부 API fetch 기반, mock/하드코딩 제품 데이터 없음 |
| 홈 페이지 | ✓ `router.push(\`/trees/:id?highlight=${data.id}\`)` — 첫 순간 생성 후 하이라이트로 연결 (기존: 파라미터 없음) |

## 3. 브라우저 검증 (playwright chromium + API 라우트 모킹, `vinext start` 서버)

| 항목 | 결과 |
|---|---|
| Moment 선택 → 상세 모달 열기/닫기 (×/백드롭/**Escape**) | ✓ 통과 |
| 비소유자 읽기 전용 (수정/삭제 버튼 숨김, 상세 필드 표시, mutation 호출 0건) | ✓ 통과 |
| Tree → Timeline → Album 내비게이션 / 새로고침 / 뒤로가기 | ✓ 통과 |
| 뷰포트 1536×960 / 390×844 / 320×720 × 3페이지 | ✓ 수평 overflow 없음 |
| console/hydration 오류 | ✓ 0건 |
| `?highlight=` 쿼리 하이라이트 적용 | ✓ 통과 |

### NOT_EXECUTABLE_WITHOUT_PREVIEW_DB
- **수정 저장 / 삭제 확인 / 생성 저장의 성공 플로우**(PUT/DELETE/POST 후 실제 영속·목록 반영)는 브라우저에서 소유자 인증(Firebase)과 실제 DB가 없어 **실행 불가**. 비소유자에서는 소유자 전용 컨트롤이 정상적으로 숨겨지는 것(올바른 읽기 전용)을 확인. API 호출 경로·페이로드는 소스 검토로 검증(훅 → 정확한 method/endpoint).
- 소스 레벨 검증으로 대체: `useTreeMoments`의 createMoment/updateMoment/deleteMoment가 정확한 엔드포인트·메서드·페이로드로 apiFetch 호출, 목록 갱신 로직(append/map/filter)은 브랜치의 stateful 백엔드 테스트(`pr39-backend-targeted.test.mjs`)와 정합.

## 4. 발견 사항

- **F6 (신규 회귀, 비차단)**: 소스-패턴 테스트 4건이 `ca4ddde` 리팩터로 실패. 코드 동작은 정상이나 PR head의 `npm test`가 green하지 않음. 테스트를 훅 구조에 맞게 갱신 필요.
- **W1 (경미)**: `clearHighlight` 미사용 — 하이라이트가 닫히지 않음.
- **W2 (경미)**: `app/trees/[id]/page.tsx`의 미사용 `Link` import.
- **W3 (경미)**: 신규 페이지 `<img>` 4건 (next/image 권장, lint 경고).

## 5. 결론

- Slice 2(공유 데이터 레이어, 뷰 스위처, 상세 모달, 크로스뷰 수정/삭제)는 **소스 계약 충족**: 공통 훅 기반 동일 Moment ID, 변경 후 공통 목록 반영, 선택/하이라이트 처리, 로딩/빈/오류 상태, mock 데이터 없음.
- Node 22에서 lint/typecheck/build 통과, 브라우저 검증 5/5.
- **BLOCKER 없음.** 다만 PR head `npm test`에 **신규 실패 4건(F6)** 존재 → PASS 아님.
- 저장 성공 검증은 **NOT_EXECUTABLE_WITHOUT_PREVIEW_DB** (Firebase 인증 + preview DB 필요).

**결과 표식: `LOVETREE_MOMENT_UI_SLICE2_VERIFICATION_FINDINGS`**
