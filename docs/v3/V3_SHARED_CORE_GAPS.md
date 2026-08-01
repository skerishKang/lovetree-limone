# V3 Shared Core Gaps

V3 Phase 1은 정적 fixture 프리뷰입니다. 아래 항목들은 향후 공통
auth/API/DB 스키마에 반영이 필요한 **후속 요구사항**입니다. 이번 단계에서는
이 파일에 기록만 하고 공통 파일을 수정하지 않습니다.

## 1. 공통 스키마 확장 (Phase 2+)

### trees (V3PreviewTree 반영)

- `subjectType`: `"person" | "work" | "travel" | "study" | "relationship" | "other"`
- `subjectName`: 사람/주제 이름
- 커버 이미지/앨범 컬러 (앨범 카드에 필요)
- `status`: `"draft" | "active" | "archived"`

### memories (V3PreviewMemory 반영)

- `parentId`: 부모 순간 연결 (트리 연결 구조)
- `relationType` / `relationLabel`: "왜 다음 순간으로 이어졌는가" (댓글 따라감,
  팬의 추천, 다른 모습 궁금, 같은 작품·무대, 직접 검색, 직접 입력)
- `sourceTitle`, `sourceName`, `thumbnailUrl`
- `startSeconds` / `endSeconds`: 기억 구간 (타임드 재생)
- `primaryEmotion` + `emotionTags`: 자유 태그 + 프리셋
- `memoVisibility`: `"private" | "tree" | "public"`

### connections (신규)

- `sourceMemoryId`, `targetMemoryId`, `relationType`, `relationLabel`,
  `bridgeMemo`, `createdAt`

## 2. 커뮤니티 기능 (서버 CRUD 전환)

- 좋아요: `likes` → per-user like 저장
- 저장(찜): `favorites` → per-user saved trees
- 댓글: 커뮤니티 트리 상세의 reactions
- 정렬: 인기순/최신순/조회순/순간 수순 서버 구현

## 3. 미디어

- YouTube oEmbed(제목/썸네일) 조회 API
- 타임드 재생(시작/끝 시점) 검증
- 스토리/앨범 보기의 실제 미디어 표시

## 4. 캔버스 상태 영속

- 트리 노드 위치(x/y) 저장 (배치 편집 결과를 서버에 저장)
- 연결 지도 레이아웃/필터 상태 저장

## 5. 마일스톤

- 감정 분류(8색) 기준과 총 순간 수(300 등)를 서버 데이터로 계산
- 축하/회고 모드의 통계(감정별 개수, 연결 수)

## 6. 인증

- V3는 공통 Firebase auth를 사용 (변경 없음, Phase 2에서 연결)
- V3 전용 라우트 가드 필요 시 공통 인증 재사용

## 7. V3 전용 Worker

- 아직 생성·배포하지 않음
- Phase 2에서 V3 API 라우트를 기존 Worker 패턴으로 추가할 때는
  V2 Worker(`wrangler-v2.jsonc`)와 분리 필요
