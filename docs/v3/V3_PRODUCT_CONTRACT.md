# V3 Product Contract

## 1. Status

V3는 **V1/V2의 대체가 아니라 별도의 세 번째 제품 후보**입니다.

- V1: `/` 의 기존 LoveTree 홈 + API 연동 제품
- V2: `/v2/**` 의 기능 업그레이드 제품 (별도 작업자 병렬 진행 중)
- V3: `/v3/**` 의 "사랑 연혁" 제품 후보 (이 브랜치에서 진행)

V1과 V2는 보존됩니다. V3는 V1/V2의 외형 복제본이 아닙니다.

## 2. Canonical 문서 참조

V3는 저장소의 제품 권위 문서를 따른다. 이 계약이 충돌하면 아래 문서가 우선한다.

- `docs/product/LOVETREE_PRODUCT_SPEC.md` — 제품 헌법 (Moment/Connection 모델, 기본 공개 범위 등)
- `docs/product/PRODUCT_DOCUMENT_HIERARCHY.md` — 문서 계층
- `docs/v3/V3_HTML_TSX_INTEGRATION_ANALYSIS.md` — 16개 HTML 분석·공식 배치 근거

특히 헌법의 핵심 결정을 준수한다.

- 감정 모델: `primaryEmotion` + `emotionTags[]` — 태그는 **감정 상태만** 담는다 (탐색 계기·관계 이유는 `relationType`/`relationLabel`/`relationMemo`)
- 관계 모델: `parentId` + `relationType` + 선택 설명 (상세: `V3_SHARED_CORE_GAPS.md`)
- 기본 공개 범위: `private`, 사용자가 명시적으로 `unlisted`/`public` 선택
- `recordDate`(기록 날짜)와 `startSeconds`/`endSeconds`(영상 내 시점) 분리

## 3. 핵심 제품 문장

> 한 순간을 발견하고, 그때의 마음을 남기고,
> 왜 다음 순간으로 이어졌는지를 연결해
> 시간이 쌓인 나만의 사랑 연혁을 만드는 서비스.

## 4. 기본 시각 언어

- 따뜻한 종이 질감 (paper texture)
- 식물·가지·꽃의 성장 은유
- 장면 카드 (scene cards)
- 감정 태그 (emotion tags)
- 연결 관계 (relations)
- 연혁과 기록 (chronicle & records)
- 여백이 있는 감성적 레이아웃

다크 우주·입자·성운 UI는 **다음 용도에만** 사용합니다.

- 대규모 트리 보기
- 마일스톤
- 축하·회고 모드

기본 랜딩과 기본 작업공간은 다크 우주형 UI로 만들지 않습니다.

## 4. 이번 단계 범위 (V3 Phase 1)

- V3 제품계약 확정
- V3 전용 경로와 컴포넌트 구조 생성
- 16개 HTML의 디자인·인터랙션을 하나의 정적 제품 흐름으로 통합
- fixture 기반 화면 연결
- V3 전용 테스트
- Draft PR 생성

**하지 않는 일 (이번 단계):**

- 공통 인증·API·DB·schema 수정
- 실제 서버 CRUD 연결
- V1/V2 파일 수정
- Worker/Cloudflare 배포
- migration 생성

## 5. Canonical V3 사용자 여정

필수 여정:

```text
/v3
→ 첫 순간 심기
→ /v3/trees/new
→ source
→ heart
→ connect
→ /v3/trees/demo
```

보조 여정:

```text
/v3
→ 공개 정원
→ /v3/community
→ 공개 트리 선택
→ /v3/community/trees/demo
```

내 정원:

```text
/v3/my-trees
→ 사람/주제 앨범 선택
→ /v3/subjects/demo
→ 관련 트리 선택
→ /v3/trees/demo
```

마일스톤:

```text
/v3/trees/demo
→ 성장 기록
→ /v3/trees/demo/celebrate/300
→ 테마 선택
→ 일반 트리로 복귀
```

브라우저 뒤로가기와 직접 URL 접근도 동작해야 합니다.

## 6. V3 공식 경로

| 경로 | 화면 |
| --- | --- |
| `/v3` | 랜딩 |
| `/v3/trees/new` | 첫 순간 심기 (트리 시작) |
| `/v3/trees/demo/onboarding/source` | 첫 순간 발견 |
| `/v3/trees/demo/onboarding/heart` | 마음 남기기 |
| `/v3/trees/demo/onboarding/connect` | 다음 순간 연결 |
| `/v3/trees/demo` | V3 기본 작업공간 |
| `/v3/my-trees` | 내 정원 |
| `/v3/subjects/demo` | 사람·주제 앨범 |
| `/v3/community` | 커뮤니티 |
| `/v3/community/trees/demo` | 공개 트리 (읽기 전용) |
| `/v3/trees/demo/celebrate/300` | 마일스톤 (300 순간) |

## 7. Fixture와 실제 데이터의 경계

- 현재 단계는 `demo` fixture를 사용합니다.
- 실제 API ID인 것처럼 위장하지 않습니다.
- 화면에 `V3 예시 데이터` / `V3 제품 미리보기` 를 명확히 표시합니다.
- fixture는 localStorage나 서버 원본이 아닙니다.
- fixture를 실제 사용자 데이터처럼 표시하지 않습니다.
- 실존 인물 개인정보를 사용하지 않습니다.

## 8. 향후 auth/API/DB 연결점

Phase 2 이후 공통 schema/API에 반영이 필요한 항목:

- `V3PreviewTree` → 공통 `trees` 확장 (subjectType, subjectName, cover, 등)
- `V3PreviewMemory` → 공통 `memories` 확장 (parentId, relationType, relationLabel,
  sourceTitle, thumbnailUrl, startSeconds, endSeconds, primaryEmotion, emotionTags,
  memoVisibility)
- 연결 관계(`relationType`)는 first-class 데이터로 저장
- 감정 태그는 enum이 아닌 자유 태그 + 프리셋
- 커뮤니티 좋아요·저장·댓글은 서버 CRUD로 전환

상세 항목: `docs/v3/V3_SHARED_CORE_GAPS.md`

## 9. 보호 범위 (V2 작업과 충돌 방지)

- `/` 라우트 수정 금지
- `/v2/**` 수정 금지
- `lib/`, `db/`, `drizzle/`, `server/api/`, `worker/` 수정 금지
- `package.json`, `package-lock.json` 수정 금지
- `wrangler.jsonc`, `wrangler-v2.jsonc` 수정 금지
- sample branch merge 금지
- main 직접 수정 금지
- main merge 금지

## 10. V3 Worker

V3 전용 Worker는 **아직 생성·배포하지 않습니다.** V3는 정적 fixture
프리뷰 단계입니다.
