export type V4SourceStatus = "planned" | "implemented";

export interface V4SourceEntry {
  id: string;
  sourceFile: string;
  area:
    | "onboarding"
    | "workspace"
    | "lifecycle"
    | "graph"
    | "people"
    | "archive"
    | "community"
    | "milestone";
  route: string;
  role: string;
  preserve: readonly string[];
  status: V4SourceStatus;
  separatelySupplied?: boolean;
}

export const V4_SOURCE_MANIFEST: readonly V4SourceEntry[] = [
  {
    id: "complete-manga-refinement",
    sourceFile: "lovetree-complete-manga-refinement(4).html",
    area: "onboarding",
    route: "/v4",
    role: "랜딩·트리 이름·첫 발견",
    preserve: ["따뜻한 종이·식물 랜딩", "첫 순간 심기 CTA", "트리 이름 모달", "입력 옆 첫 순간 미리보기", "ESC·배경 클릭 닫기"],
    status: "implemented",
  },
  {
    id: "step2-emotion-refined",
    sourceFile: "lovetree-step2-emotion-refined(6).html",
    area: "onboarding",
    route: "/v4/trees/demo/onboarding/emotion",
    role: "정확한 영상 시점과 감정 기록",
    preserve: ["4단계 여정 표시", "연결된 영상 카드", "-5/+5초", "감정 칩·직접 입력", "140자 메모", "공개 여부", "성공 카드"],
    status: "implemented",
  },
  {
    id: "step3-connect-next-video",
    sourceFile: "lovetree-step3-connect-next-video(6).html",
    area: "onboarding",
    route: "/v4/trees/demo/onboarding/connect",
    role: "두 순간의 감정 인과 연결",
    preserve: ["두 순간 연결 보드", "가지 SVG", "관계 이유 칩", "다음 카드 실시간 미리보기", "연결 성공 상태"],
    status: "implemented",
  },
  {
    id: "growing-tree-v5-draggable-notes",
    sourceFile: "lovetree-growing-tree-v5-draggable-notes(4).html",
    area: "workspace",
    route: "/v4/trees/demo",
    role: "드래그·다이어리·가지 기능 원형",
    preserve: ["트리·다이어리 동기화", "노트 드래그", "삭제", "팬·줌·맞춤", "관계 선택"],
    status: "implemented",
  },
  {
    id: "growing-tree-v6-fullscreen-add",
    sourceFile: "lovetree-growing-tree-v6-fullscreen-add(4).html",
    area: "workspace",
    route: "/v4/trees/demo",
    role: "공식 3열 일상 성장 작업공간",
    preserve: ["3열 구조", "전체화면", "전체화면 추가 드로어", "같은 입력 폼 재사용", "v5 드래그 기능"],
    status: "implemented",
  },
  {
    id: "rest-return-flow-v2-simple",
    sourceFile: "lovetree-rest-return-flow-v2-simple(3).html",
    area: "lifecycle",
    route: "/v4/trees/demo/rest",
    role: "삭제하지 않고 쉬기·돌아오기",
    preserve: ["active/resting 전환", "기존 기록 보존", "휴식 메모", "복귀 메모", "조용해지는 시각 상태"],
    status: "implemented",
  },
  {
    id: "tree-pause-issue-state-v1",
    sourceFile: "lovetree-tree-pause-issue-state-v1(2).html",
    area: "lifecycle",
    route: "/v4/trees/demo/state",
    role: "이슈 순간·트리 상태·공개 범위 분리",
    preserve: ["상태와 공개 범위 분리", "개인 메모 비공개", "이슈 순간 보존", "휴식은 삭제가 아님"],
    status: "implemented",
  },
  {
    id: "community-discovery-v2",
    sourceFile: "lovetree-community-discovery-v2(5).html",
    area: "community",
    route: "/v4/community",
    role: "공개 트리 검색·필터·상세 탐색",
    preserve: ["검색·감정 필터·정렬", "빠른 비교", "큰 미리보기", "전체 트리 오버레이", "팬·줌"],
    status: "implemented",
  },
  {
    id: "node-graph-prototype",
    sourceFile: "lovetree-node-graph-prototype(6).html",
    area: "graph",
    route: "/v4/trees/demo/graph",
    role: "고급 연결 그래프 편집",
    preserve: ["노드 드래그", "연결 핸들", "시작·종료 시점", "미니맵", "팬·줌", "영상 모달"],
    status: "implemented",
  },
  {
    id: "obsidian-graph1",
    sourceFile: "lovetree-obsidian-graph1(4).html",
    area: "graph",
    route: "/v4/trees/demo/map",
    role: "검색·필터 중심 관계 지도",
    preserve: ["감정 필터", "검색", "연결 모드", "레이아웃 전환", "검사 패널"],
    status: "implemented",
  },
  {
    id: "love-nebula",
    sourceFile: "lovetree-love-nebula(4).html",
    area: "graph",
    route: "/v4/trees/demo/nebula",
    role: "대규모 감정 성운 조망",
    preserve: ["100·300·1000 밀도", "감정 클러스터", "성운·꽃망울·나선", "선택 상세", "팬·줌"],
    status: "implemented",
  },
  {
    id: "juyeon-timeline",
    sourceFile: "lovetree-juyeon-timeline(4).html",
    area: "graph",
    route: "/v4/trees/demo/timeline",
    role: "날짜 중심 연혁",
    preserve: ["날짜 챕터", "연혁 트리", "날짜 띠", "영상 그래프", "상세 패널 동기화"],
    status: "implemented",
  },
  {
    id: "person-albums",
    sourceFile: "lovetree-person-albums(4).html",
    area: "people",
    route: "/v4/subjects",
    role: "사람·대상별 앨범 라이브러리",
    preserve: ["검색", "사람 필터", "요약 통계", "사람 카드", "선택 트리", "앨범 복귀"],
    status: "implemented",
  },
  {
    id: "motion-archive",
    sourceFile: "lovetree-motion-archive-v5-video-click-autoplay(3).html",
    area: "archive",
    route: "/v4/subjects/demo/motion",
    role: "네 가지 모션 아카이브",
    preserve: ["물결 리본", "마음 궤도", "비닐 케이스", "사선 흐름", "클릭 재생 상세", "이전·다음 동기화"],
    status: "implemented",
    separatelySupplied: true,
  },
  {
    id: "liquid-orbit-video-gallery",
    sourceFile: "lovetree-liquid-orbit-video-gallery(2).html",
    area: "archive",
    route: "/v4/subjects/demo/orbit",
    role: "3D 액체 궤도 영상 갤러리",
    preserve: ["wave·orbit·free·diagonal", "드래그·휠·키보드", "액체 확산", "비닐 케이스 개봉", "영상·메모 결합"],
    status: "implemented",
    separatelySupplied: true,
  },
  {
    id: "accordion-album-archive",
    sourceFile: "lovetree-accordion-album-archive-v3-fixed(3).html",
    area: "archive",
    route: "/v4/subjects/demo/accordion",
    role: "접히는 아코디언 앨범",
    preserve: ["3D 서가", "앨범 열기", "아코디언 목록", "영상 뷰어", "상·하 플레이어 동기화"],
    status: "implemented",
    separatelySupplied: true,
  },
  {
    id: "folding-person-archive",
    sourceFile: "lovetree-folding-person-archive(3).html",
    area: "archive",
    route: "/v4/subjects/demo/folding",
    role: "사람별 책을 펼치는 몰입 앨범",
    preserve: ["사람 서가", "표지 폭발·접힘", "트랙 선택", "비디오 페이지", "메모 페이지", "영상 종료 처리"],
    status: "implemented",
    separatelySupplied: true,
  },
  {
    id: "300-moments-finale",
    sourceFile: "lovetree-300-moments-finale(4).html",
    area: "milestone",
    route: "/v4/trees/demo/celebrate/300",
    role: "300번째 순간 완성 축하",
    preserve: ["트리·심장·마음꽃·기억은하", "성장 재생", "순간 팝오버", "완료 모달", "300번째 심기"],
    status: "implemented",
  },
  {
    id: "aurora-particle-heart",
    sourceFile: "lovetree-aurora-particle-heart(4).html",
    area: "milestone",
    route: "/v4/trees/demo/celebrate/aurora",
    role: "오로라 입자 심장",
    preserve: ["하트·궤도·꽃·은하", "에너지 슬라이더", "팔레트", "입자 폭발"],
    status: "implemented",
  },
  {
    id: "rainbow-memory-canopy",
    sourceFile: "lovetree-rainbow-memory-canopy(4).html",
    area: "milestone",
    route: "/v4/trees/demo/celebrate/canopy",
    role: "무지개 기억 수관",
    preserve: ["범주별 포커스", "성장 재생", "진행 탐색", "팬·줌", "다시 자라기"],
    status: "implemented",
  },
  {
    id: "purple-bloom-graph",
    sourceFile: "lovetree-purple-bloom-graph(4).html",
    area: "milestone",
    route: "/v4/trees/demo/celebrate/bloom",
    role: "보랏빛 마음꽃",
    preserve: ["꽃잎 선택", "상세 패널", "진행 재생", "개화 버튼", "맞춤"],
    status: "implemented",
  },
  {
    id: "growing-tree-300-plus-freegraph",
    sourceFile: "lovetree-growing-tree-300-plus-v2-freegraph(1).html",
    area: "milestone",
    route: "/v4/trees/demo/growth/300-plus",
    role: "300개 이후 자유 성장",
    preserve: ["301+ 실제 연결", "자유 드래그", "미니맵", "전체화면 추가", "500·750·1000 표시"],
    status: "implemented",
  },
  {
    id: "growing-tree-season-archive",
    sourceFile: "lovetree-growing-tree-season-archive-v3(1).html",
    area: "milestone",
    route: "/v4/trees/demo/seasons",
    role: "한 트리·여러 시즌 아카이브",
    preserve: ["시즌 1 보호", "보관은 종료가 아님", "301+ 계속 성장", "다음 시즌 이름·날짜·문장·테마", "대표 기억 연결"],
    status: "implemented",
  },
  {
    id: "first-journey-unified-v1",
    sourceFile: "lovetree-first-journey-unified-v1.html",
    area: "onboarding",
    route: "/v4/journey",
    role: "첫 발견부터 연결·성장까지 통합 여정",
    preserve: ["4단계 통합 내비게이션", "영상·시점·감정·메모·공개 여부", "두 순간 가지 연결·실시간 미리보기", "성장 보드", "3개 storage key 구조"],
    status: "implemented",
  },
] as const;

export const V4_SEPARATELY_SUPPLIED_SOURCES = V4_SOURCE_MANIFEST.filter(
  (source) => source.separatelySupplied,
);

export const V4_IMPLEMENTED_SOURCE_COUNT = V4_SOURCE_MANIFEST.filter(
  (source) => source.status === "implemented",
).length;
