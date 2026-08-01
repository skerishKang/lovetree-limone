# V3 Route ↔ Component Map

## 1. 경로 목록

| 경로 | 파일 | 컴포넌트 | 단계 |
| --- | --- | --- | --- |
| `/v3` | `app/v3/page.tsx` | `V3Landing` | 랜딩 |
| `/v3/trees/new` | `app/v3/trees/new/page.tsx` | `V3TreeSeedForm` | 트리 시작 |
| `/v3/trees/demo/onboarding/source` | `app/v3/trees/demo/onboarding/source/page.tsx` | `V3SourceStep` | 첫 순간 발견 |
| `/v3/trees/demo/onboarding/heart` | `app/v3/trees/demo/onboarding/heart/page.tsx` | `V3HeartStep` | 마음 남기기 |
| `/v3/trees/demo/onboarding/connect` | `app/v3/trees/demo/onboarding/connect/page.tsx` | `V3ConnectStep` | 다음 순간 연결 |
| `/v3/trees/demo` | `app/v3/trees/demo/page.tsx` | `V3TreeWorkspace` | 기본 작업공간 |
| `/v3/my-trees` | `app/v3/my-trees/page.tsx` | `V3MyGarden` | 내 정원 |
| `/v3/subjects/demo` | `app/v3/subjects/demo/page.tsx` | `V3SubjectAlbums` | 사람·주제 앨범 |
| `/v3/community` | `app/v3/community/page.tsx` | `V3Community` | 커뮤니티 |
| `/v3/community/trees/demo` | `app/v3/community/trees/demo/page.tsx` | `V3PublicTree` | 공개 트리 (읽기 전용) |
| `/v3/trees/demo/celebrate/300` | `app/v3/trees/demo/celebrate/300/page.tsx` | `V3Milestone` | 마일스톤 |

## 2. 공통 구조

- 모든 V3 페이지는 `V3Shell`(브랜드 탑바 + V3 제품 미리보기 배지 + 푸터)로 감쌉니다.
- `V3PreviewBadge`는 `V3 예시 데이터` 라벨을 화면에 표시합니다.
- CSS는 `app/styles/v3/**`에서 `v3-` prefix로만 작성하며 `.v3-shell` 아래로 scope합니다.
- 타입은 `app/components/v3/v3-types.ts`(V3 Preview 전용), fixture는
  `app/components/v3/fixtures/` 에 둡니다.

## 3. 온보딩 상태 전이

`/v3/trees/new` → source → heart → connect → `/v3/trees/demo`

- 각 단계는 훅(React state)으로 임시 온보딩 상태를 유지하며, 이후 실제 API 연결 시
  서버 세션으로 대체합니다. 상태는 local에서 페이지 간 이동 시 이전 단계로 되돌아갈 수
  있습니다.

## 4. 컴포넌트 트리

```text
V3Shell
├── V3Header (탑바, V3 내비게이션)
├── V3PreviewBadge (V3 예시 데이터)
├── V3Landing
│   └── V3TreeSeedForm (첫 순간 심기)
├── V3SourceStep → V3HeartStep → V3ConnectStep
├── V3TreeWorkspace
│   ├── V3WorkspaceSidebar (날짜/감정/출처 필터, 마음 다이어리)
│   ├── V3GrowthTree (중앙 트리, 배치 편집 토글 시 드래그)
│   └── V3MomentInspector (선택 순간 상세)
│   ├── V3MomentComposer (새 순간 추가)
│   ├── V3FullscreenDrawer (전체화면 추가 드로어)
│   └── 보기 모드: V3TimelineView / V3DiaryView / V3StoryView / V3AlbumView /
│                  V3ConnectionMap / V3NebulaView
├── V3MyGarden → V3SubjectAlbums → V3ShelfView(선택형)
├── V3Community → V3CommunityPreview → V3PublicTree
└── V3Milestone
    ├── V3FinaleTheme (완성 트리)
    ├── V3AuroraTheme (오로라 하트)
    ├── V3CanopyTheme (무지개 수관)
    └── V3BloomTheme (마음꽃)
```

## 5. 보호 경로 (이번 단계 변경 금지)

- `/` (app/page.tsx)
- `/v2/**`
- `lib/**`, `db/**`, `drizzle/**`, `server/api/**`, `worker/**`
- `package.json`, `package-lock.json`, `wrangler*.jsonc`
