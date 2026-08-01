# V3 Phase Plan

## 개요

V3는 V1/V2의 대체가 아니라 **별도의 세 번째 제품 후보**입니다. 동생이 만든 16개
HTML 프로토타입을 하나의 일관된 사랑 연혁 서비스로 연결하는 작업을 단계별로
진행합니다.

## Phase 1 (이번 작업)

| 단계 | 내용 | 산출물 |
| --- | --- | --- |
| 1. 분석 | 16개 HTML을 읽고 제품 단계·목적·입력·인터랙션·위험 정리 | `V3_HTML_INTEGRATION_AUDIT.md` |
| 2. 계약 | V3 제품 문장·시각 언어·경로·여정·보호 범위 확정 | `V3_PRODUCT_CONTRACT.md` |
| 3. 구조 | V3 전용 경로, 컴포넌트, CSS, fixture, 타입 생성 | `app/v3/**`, `app/components/v3/**`, `app/styles/v3/**` |
| 4. 통합 | 16개 HTML의 디자인·인터랙션을 정적 제품 흐름으로 연결 | 연결된 화면 전체 |
| 5. 테스트 | V3 전용 계약 테스트 추가 (기존 테스트에 자동 포함) | `tests/v3-*.test.mjs` |
| 6. 검증 | lint / typecheck / test / build / drizzle / diff check | 검증 결과 |
| 7. 배포 | Draft PR 생성 (Ready 전환·merge·배포 금지) | Draft PR |

### Phase 1 제외 사항

- 공통 인증·API·DB·schema 수정 금지
- 실제 서버 CRUD 연결 금지
- V1/V2 파일 수정 금지
- package.json/package-lock.json 수정 금지
- V3 Worker 생성·배포 금지
- sample branch merge 금지

## Phase 2 (후속, 별도 작업)

V2 병렬 작업이 main에 통합된 뒤 진행합니다.

1. V2 결과를 최신 main으로 수용
2. 공통 schema/API 확장 (`V3_SHARED_CORE_GAPS.md` 항목)
3. V3 fixture → 실제 auth/API/DB 연결
4. 커뮤니티 좋아요·저장·댓글 서버 CRUD
5. 캔버스 위치/필터 상태 영속
6. V3 전용 Worker 설정(필요 시)

## 현재 상태

- V3 branch: `feat/v3-product-foundation`
- V3 worktree: `/mnt/g/Ddrive/BatangD/task/workdiary/lovetree-limone-v3`
- 시작 SHA: `1edb1abc42005dadb72736b380474c2ad88a9a2d` (origin/main)
- V2 branch: `feat/v2-v1-feature-parity` (별도 worktree, 미접촉)

## 보호 범위 (V2 작업과 충돌 방지)

- `/` 라우트 수정 금지, `/v2/**` 수정 금지
- `lib/`, `db/`, `drizzle/`, `server/api/`, `worker/` 수정 금지
- `package.json`, `package-lock.json`, `wrangler*.jsonc` 수정 금지
- sample branch merge 금지, main 직접 수정·merge 금지
- V2 branch checkout 금지
