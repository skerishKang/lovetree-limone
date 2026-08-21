# Legacy 표면 아카이브 제안서 (Issue #293)

> **문서 상태: 제안서 (PROPOSAL — NOT APPROVED)**
>
> 이 문서는 `app/v2`, `app/v3`, `app/legacy` 제품 라우트 표면의 아카이브(보존 후 제거)를 **제안**하는 문서이다.
> **실행 금지.** 본 문서의 작성은 어떤 파일도 삭제·수정하지 않았으며, 실제 이행은 별도 승인 Lane에서
> 명시적 product-owner/design-lead 승인을 받은 후에만 시작한다.
> 측정 기준 커밋: `d2aa254d4580808f342e2260849dacade05e8ff9` (origin/main, 2026-08-21 기준)

---

## 0. 요약

| 항목 | 내용 |
| --- | --- |
| 대상 | `app/v2/**`, `app/v3/**`, `app/legacy/**` 라우트 + 전이 의존인 `app/components/v2|v3`, `app/styles/v2|v3` |
| 규모 | 93 files, 411,890 bytes (~402 KiB) — 전체 pack(76.39 MiB)의 약 0.5% |
| 빌드 의존 | **없음.** 현재 제품 코드(v4, gateway, lib, server, worker)는 이 경로를 import하지 않음 |
| 테스트 의존 | **있음.** 19개 테스트 파일이 소스 파일 존재를 전제로 함 (제거 시 즉시 RED) |
| 런타임 참조 | Gateway `/`·`/gateway` 페이지와 Design Lab 탐색기가 `/legacy`, `/v2`, `/v3` 링크 렌더링 |
| public/js·css 잔재 | **없음.** LoveBud 정적 페이지 잔재는 `840cf86f`에서 이미 완전 제거됨 (index/tracked 모두 0) |
| 핵심 저해상 요소 | 코드 내 보존 지시 존재: v3 후보 노트 "최종 선택 전까지 삭제하지 않습니다", Legacy 제품군 "그대로 보존합니다" |
| 권고 | 아카이브 브랜치 태그 보존 → 단일 제거 PR → 레지스트리·테스트 동시 정리 → 롤백은 revert 1회로 설계 |

---

## 1. 현황 계측

### 1.1 표면별 파일 수·크기 (git-tracked, commit `d2aa254d`)

| 경로 | Files | Bytes | 최종 변경 | 성격 |
| --- | ---: | ---: | --- | --- |
| `app/v2` | 4 | 1,401 | 2026-08-01 (`1edb1abc`) | 얇은 라우트 wrapper (AuthProvider + V2 컴포넌트 조립) |
| `app/v3` | 13 | 5,077 | 2026-08-02 (`cd8f7dae`) | 라우트 페이지 (V3Shell + V3 컴포넌트 조립) |
| `app/legacy` | 3 | 19,791 | 2026-08-09 (`7ecb6d18`) | 자체 완결 랜딩 1개 + 재-export shim 2개 |
| `app/components/v2` | 14 | 77,876 | 2026-08-01 (`e143e8bd`) | V2 화면 구현 (라우트 외 참조 없음) |
| `app/components/v3` | 42 | 202,532 | 2026-08-02 (`09b75b01`) | V3 화면 구현 + fixtures/state/validation (라우트 외 참조 없음) |
| `app/styles/v2` | 6 | 39,145 | 2026-08-01 (`e143e8bd`) | V2 CSS |
| `app/styles/v3` | 11 | 66,068 | 2026-08-02 (`cd8f7dae`) | V3 CSS |
| **합계** | **93** | **411,890** | | |
| `public/js` | 0 | — | `840cf86f` 제거됨 | 잔재 없음 (working tree·index 모두 부재 확인) |
| `public/css` | 0 | — | `840cf86f` 제거됨 | 잔재 없음 |

모든 표면은 2026-08-01~09 사이 마지막으로 변경된 후 약 2주 이상 동결 상태다.
`app/legacy/page.tsx`(19.7 KB)가 단일 최대 파일이며, 나머지 라우트는 전부 소형 조립 파일이다.

### 1.2 의존 계층 (import 그래프)

```
[현재 제품: app/(root), app/v4, app/my-trees, app/trees, app/gateway]
        │  ← 절대 import 없음 (역방향 의존 ZERO)
        ▼
lib/auth · lib/api · lib/tree-types        ← 공유 (아카이브 대상 아님)
app/components/EmailAuthForm.tsx           ← 공유 (v4·현재 표면이 사용, 아카이브 대상 아님)
app/styles/email-auth.css                  ← 공유 (동일)
        ▲
        │ (아래만 위 공유자산을 import)
app/v2/*  ──→ app/components/v2/* ──→ (자기완결: v2-hero-video-data 등 내부 참조만)
app/v3/*  ──→ app/components/v3/* ──→ (자기완결: v3-types/fixtures/archive-state/validation 내부 참조만)
app/legacy/page.tsx ──→ shim(app/legacy/components, app/legacy/styles) ──→ 공유 EmailAuthForm
```

핵심 판정:

- **순방향(표면 → 공유자산) 의존만 존재**, 역방향(현재 제품 → 표면) import는 전수 검색 결과 0건.
- `app/components/v2`, `app/components/v3`, `app/styles/v2`, `app/styles/v3`는 해당 라우트에서만 참조되므로
  라우트만 제거하면 고아(orphan)가 되므로 **함께 아카이브 범위에 포함**한다.
- 반대로 `app/components/EmailAuthForm.tsx`와 `app/styles/email-auth.css`는 현재 표면
  (`app/my-trees`, `app/trees/[id]/*`, `app/v4/*`)이 직접 사용 중이므로 **범위에서 제외**해야 한다.
  함께 지우면 현재 제품이 깨진다.

### 1.3 런타임 라우트 문자열 참조 (코드)

| 위치 | 참조 | 제거 시 영향 |
| --- | --- | --- |
| `lib/design-lab.ts:65-78` (`PRODUCT_FAMILIES`) | legacy 제품군 `route: "/legacy"` | Gateway 카드 링크 404화 |
| `lib/design-lab.ts:257-278` (`HISTORICAL_CANDIDATES`) | `historical:v2 → /v2`, `historical:v3 → /v3` (status: implemented) | Design Lab 탐색기 링크 404화 + 레지스트리 검증 실패 |
| `app/components/product/ProductGateway.tsx:26` | `<Link href={legacy.route}>` — `/` 및 `/gateway`에서 렌더링 | 프로덕션 진입 페이지에 죽은 카드 노출 |
| `app/components/product/DesignVariantExplorer.tsx:169-170` | implemented 후보 route를 `<Link>`로 렌더링 | `/v2`, `/v3` dead link |
| `next.config.ts` | rewrites/redirects 없음 | 영향 없음 |
| `worker/`, `server/api/` | 제품 라우트 참조 없음 (문자열 매치 0건) | 영향 없음 |
| `.github/workflows/` | `/v2`,`/v3`,`/legacy` 제품 라우트 참조 0건 | 영향 없음 |
| `qa/*.mjs` 브라우저 QA | design-lab lineage 라우트만 참조, 제품 라우트 0건 | 영향 없음 |

### 1.4 테스트 의존 (제거 시 RED가 되는 파일)

`npm test`는 `tests/*.test.mjs` 전체(148 files)를 실행한다. 아래 19개가 레거시 표면 파일을 전제로 한다.

**(a) 하드 모듈 import — 제거 시 모듈 해석 실패 (4개)**

| 테스트 | 의존 |
| --- | --- |
| `tests/v3-motion-archive-shared.test.mjs` | `import ... from "../app/components/v3/fixtures/v3-fixtures.ts"`, `"../app/components/v3/v3-archive-state.ts"` |
| `tests/v3-motion-archive-state.test.mjs` | `import { ... } from "../app/components/v3/v3-archive-state.ts"` (+ `/v3/subjects/demo` 라우트 문자열 로직) |
| `tests/v3-motion-archive-viewer.test.mjs` | `import { ... } from "../app/components/v3/v3-archive-state.ts"` |
| `tests/v3-validation-behavior.test.mjs` | `await import("../app/components/v3/v3-validation.ts")` |

**(b) readFile 소스 계약 단언 — 파일 부재 시 assert 실패 (14개)**

`tests/browse-ui.test.mjs`, `tests/email-auth.test.mjs`, `tests/email-auth-cta.test.mjs`,
`tests/rendered-html.test.mjs`, `tests/tree-integration-ui.test.mjs` (→ `app/legacy/page.tsx`),
`tests/v2-routing.test.mjs`, `tests/v2-parity.test.mjs`, `tests/v2-hero-video-showcase.test.mjs` (→ `components/v2/*`),
`tests/v3-css-isolation.test.mjs` (→ `app/styles/v3/*`), `tests/v3-fix-regression.test.mjs`,
`tests/v3-motion-archive-a11y.test.mjs`, `tests/v3-motion-archive-contract.test.mjs`,
`tests/v3-preview-data-contract.test.mjs`, `tests/v3-route-contract.test.mjs` (→ `app/v3/*` 라우트 파일 목록)

**(c) 레지스트리 계약 (1개)**

- `tests/design-lab-registry.test.mjs`: (1) `app/legacy/page.tsx` 존재 필수 단언,
  (2) "implemented Design Lab route resolves to an app page" — `/v2`, `/v3` 엔트리가 페이지 해석을 강제.
  라우트 제거 후 레지스트리를 손대지 않으면 이 테스트가 RED.

**(d) 영향 없음 확인**

- `tests/v4-bookshelf-four-source-faithful.test.mjs`의 `components/v3` 등은 **부정 단언**
  (v4가 v2/v3를 import하지 않음을 검사)이므로 제거되어도 GREEN 유지.
- `tests/design-intake-drive-observer-security-closure.test.mjs`의 `drive/v3`는 Google Drive API URL로 무관.

### 1.5 문서 참조 (전수 조사)

`docs/` 내 11개 파일이 `/v2`, `/v3`, `app/v2`, `app/v3` 등을 언급:
`docs/V2_FUNCTIONAL_INTEGRATION.md`, `docs/V2_V1_FEATURE_PARITY_AUDIT.md`,
`docs/product/LOVE_TREE_PRODUCT_FAMILIES_AND_VARIANTS_20260809.md`, `docs/product/PRODUCT_DOCUMENT_HIERARCHY.md`,
`docs/v3/*` (5개), `docs/v4/V4_IMPLEMENTATION_COMPLETE_PENDING_LOCAL_VALIDATION.md`, `docs/v4/V4_SOURCE_FAITHFUL_IMPLEMENTATION.md`.

- 이들은 역사 기록/감사 문서이며, 링크 로테 가능성은 있으나 빌드·테스트에 영향 없음.
- 아카이브 이행 시 각 문서 머리에 "라우트는 archive 브랜치로 이관됨" 각주 추가를 권장(필수 아님).

### 1.6 거버넌스: 코드 내 보존 지시 (중요)

아카이브는 단순 기술 판단이 아니라 **기존 명시적 결정의 변경**이다. 현재 코드에는 다음 보존 지시가 있다:

- `lib/design-lab.ts` `PRODUCT_FAMILIES` legacy: "기능·UX 비교를 위한 기준 제품으로 **그대로 보존합니다**."
- `lib/design-lab.ts` `HISTORICAL_CANDIDATES` historical:v3 notes: "**최종 선택 전까지 삭제하지 않습니다.**"
- AGENTS.md: "`/v2/**`와 `/v3/**`는 역사 비교 표면", "V4/Next가 현재 구현 권위".

따라서 본 제안의 선행 조건은 **product-owner/design-lead의 보존 지시 철회 승인**이다.
승인 없이는 어떤 단계도 실행하지 않는다.

---

## 2. 이관 시나리오 (승인 후 실행)

원칙: git 히스토리가 곧 아카이브다. 별도 백업 포맷을 만들지 않고,
**읽기 전용 아카이브 브랜치(또는 태그) 1개 + 단일 제거 PR + 단일 revert로 롤백 가능한 구조**를 유지한다.

### Phase A — 아카이브 브랜치 생성 (무위험, 가역)

```bash
# 1. 제거 직전 main 커밋에서 아카이브 브랜치 생성
git fetch origin && git checkout -b archive/legacy-surfaces-v2-v3 origin/main
git push origin archive/legacy-surfaces-v2-v3

# 2. 불변 마커 태그 (선택이지만 권장)
git tag archive/legacy-surfaces-v2-v3-<YYYYMMDD> archive/legacy-surfaces-v2-v3
git push origin archive/legacy-surfaces-v2-v3-<YYYYMMDD>
```

- 아카이브 브랜치는 **영구 보존, 어떤 변경도 금지**하며 README 1줄만 허용(별도 PR).
- 브랜치명·태그명을 이 문서에 기록해 두어 조회 경로를 고정한다.

### Phase B — 제거 PR (단일 PR, 원자적)

하나의 PR에 다음을 **반드시 함께** 넣는다. 분리하면 중간 상태에서 CI가 깨진다.

1. **파일 제거** (93 files):
   `app/v2/`, `app/v3/`, `app/legacy/`, `app/components/v2/`, `app/components/v3/`,
   `app/styles/v2/`, `app/styles/v3/`
   - ⚠️ **제외**: `app/components/EmailAuthForm.tsx`, `app/styles/email-auth.css` (현재 제품 사용 중)
2. **레지스트리 정리** (`lib/design-lab.ts`):
   - `HISTORICAL_CANDIDATES`의 `historical:v2`, `historical:v3` 엔트리를 `status: "archived"` 처리 또는 제거하고
     notes에 `archive/legacy-surfaces-v2-v3` 브랜치 경로를 남긴다. (status 값을 유지하는 경우
     `validateDesignCandidateRegistry`의 implemented-route 강제와 충돌하지 않도록 status 어휘 확장 필요)
   - `PRODUCT_FAMILIES` legacy 항목 처리: 제거 또는 `route`를 null-safe로. Gateway 카드 렌더링 분기 확인.
   - `ProductGateway.tsx`, `DesignVariantExplorer.tsx`의 링크 렌더링이 새 상태를 올바르게 생략하는지 확인.
3. **테스트 정리 (19개)**: §1.4 (a)(b)(c)에 해당하는 테스트 파일/케이스를 같은 PR에서 제거 또는
   "아카이브됨" 스냅샷 계약으로 치환. **테스트를 skip으로 남겨두지 않는다** (죽은 skip 금지 원칙).
4. **문서 각주** (선택): §1.5 문서들에 아카이브 위치 각주.

검증 게이트 (PR 내 전부 통과 필요):

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run db:check
```

추가 수동 확인:

- `/` , `/gateway` 렌더링에서 legacy 카드 미노출 or 안전한 비활성 표기
- `/design-lab` 탐색기에서 historical 후보 표기 확인
- `/v2`, `/v3`, `/legacy` 가 404 반환 확인

### Phase C — 롤백 절차

| 상황 | 절차 | 소요 |
| --- | --- | --- |
| 병합 직후 문제 발견 | `git revert <merge-commit>` 1회 → 자동 배포 워크플로우가 재배포 | 단일 커밋 |
| 부분 롤백 필요 | 아카이브 브랜치에서 해당 디렉터리만 `git checkout archive/legacy-surfaces-v2-v3 -- app/v3` 식으로 복원 | 파일 단위 |
| 장기 복원 | 아카이브 브랜치/태그에서 신규 브랜치 생성 → 현재 main과 재통합 검토 | 별도 Lane |

- revert 시 레지스트리·테스트 정리도 함께 되돌려지므로 일관성이 자동 회복된다(단일 PR 설계의 이점).
- DB/Auth/Worker 바인딩은 이 변경과 무관하므로 데이터 롤백 고려 불필요.

---

## 3. 위험 평가 및 단계별 안전장치

### 3.1 위험 매트릭스

| # | 위험 | 심각도 | 발생 조건 | 완화 |
| --- | --- | --- | --- | --- |
| R1 | 현재 제품 렌더링 깨짐 (EmailAuthForm/email-auth.css 오삭제) | **높음** | 공유자산을 범위에 잘못 포함 | §2-B-1 제외 목록 명시 + typecheck/build/test 게이트 |
| R2 | 프로덕션 Gateway `/`·`/gateway`에 죽은 `/legacy` 링크 노출 | 중간 | 파일만 제거하고 레지스트리 미정리 | 레지스트리+컴포넌트를 같은 PR에서 정리, 수동 렌더 확인 |
| R3 | Design Lab 탐색기 dead link + 레지스트리 검증 RED | 중간 | 상동 | 상동 (tests/design-lab-registry가 자동 감지) |
| R4 | 19개 테스트 RED로 CI 정지 | 낮음(의도된 안전망) | 테스트 미정리 제거 PR | 같은 PR에서 테스트 정리 강제 |
| R5 | "최종 선택 전까지 삭제하지 않는다" 기존 결정과 충돌 | **높음(절차)** | 승인 없이 실행 | 본 문서 §1.6 — 명시적 승인 Lane 선행 |
| R6 | 역사 문서 링크 로테 | 낮음 | docs 참조 | 각주 부착(선택), 빌드 영향 없음 |
| R7 | 외부 북마크/공유 링크 404 | 낮음 | 데모 링크가 /v2·/v3·/legacy를 가리킴 | 현재 pre-user demo 단계로 외부 노출 최소; 필요 시 next.config redirect(보존 기간 합의 후) |
| R8 | 아카이브 브랜치 실수로 삭제/덮어쓰기 | 낮음 | 운영 부주의 | 불변 태그 병행 + 브랜치 보호 설정 요청 |
| R9 | 제거 후 V2/V3 소스 기반 비교 리뷰 요청 발생 | 낮음 | 디자인 리뷰 요구 | 아카이브 브랜치 checkout으로 즉시 복원 가능 (§2-C) |

### 3.2 단계별 안전장치 (Fail-closed)

1. **승인 게이트**: product-owner/design-lead가 §1.6 보존 지시 철회를 명시 승인하기 전까지 Phase A~C 전체 불허.
   승인 기록은 Issue #293 또는 후속 이슈에 남긴다.
2. **분리 원칙**: 본 제안서 PR은 문서만 포함. 제거 PR은 별도 브랜치·별도 PR로, 두 작업을 한 커밋에 섞지 않는다.
3. **원자성**: 제거 PR은 §2-B의 4개 요소(파일·레지스트리·테스트·문서각주)를 하나의 PR로. 부분 병합 금지.
4. **자동 게이트**: lint/typecheck/test/build/db:check 전부 통과 + A-track exact-head gate GREEN.
   로컬 mock/browser harness 결과를 배포 수용 결과로 표기하지 않는다.
5. **프로덕션 경로**: 병합 후 자동 `main → Production` 워크플로우(`production-auto-deploy.yml`)만 사용.
   raw wrangler 우회 금지. 배포 후 `/`, `/gateway`, `/design-lab`, `/v2`(404 확인) 수동 점검.
6. **롤백 준비**: 병합 직후 24시간은 revert 담당자·절차를 상시 준비(§2-C). 문제 발생 시 우선 revert, 분석은 후행.
7. **비대상 보호**: DB 스키마, Auth/Firebase, secrets/bindings, Worker 라우팅은 이 작업과 무계 —
   어떤 경우에도 접촉 금지.

---

## 4. 실행 권한 선언

- 이 문서는 **제안서**다. 이 문서의 존재는 어떤 제거·수정의 실행도 의미하지 않는다.
- `app/v2`, `app/v3`, `app/legacy` 및 그 전이 의존의 실제 제거는 **별도 승인 Lane**에서
  §1.6 보존 지시 철회 승인을 받은 뒤, §2 시나리오와 §3 안전장치를 그대로 적용해 진행한다.
- 본 문서 작성 시점(commit `d2aa254d`) 기준 대상 파일은 1바이트도 변경되지 않았다.

---

*작성: Issue #293 Lane (kilo10-issue293 worktree, branch `feat/293-legacy-archive-proposal`)*
*측정 환경: WSL-native ext4 workspace, node v22.23.2 / npm 10.9.8*
