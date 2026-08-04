export interface V4LabSourceEntry {
  id: string;
  sourceFile: string;
  route: string;
  role: string;
  preserve: readonly string[];
}

export const V4_LAB_SOURCE_REGISTRY: readonly V4LabSourceEntry[] = [
  {
    id: "memory-pulse-dashboard-v1",
    sourceFile: "lovetree-memory-pulse-dashboard-v1.html",
    route: "/v4/labs/memory/pulse",
    role: "다크 테마 메모리 펄스 대시보드",
    preserve: ["벤토 카드 레이아웃", "실시간 펄스 애니메이션", "기간·소스 필터", "바 차트·월드맵·리듬 차트", "트리 카드"],
  },
  {
    id: "memory-scene-recipe-library-v1",
    sourceFile: "lovetree-memory-scene-recipe-library-v1.html",
    route: "/v4/labs/memory/recipes",
    role: "메모리 씬 레시피 라이브러리",
    preserve: ["앰버 다크 테마", "레시피 보드·검색·필터", "레시피 타일 그리드", "상세 시트 모달", "적용·저장"],
  },
  {
    id: "moment-polish-lab-v1",
    sourceFile: "lovetree-moment-polish-lab-v1.html",
    route: "/v4/labs/memory/polish-lab",
    role: "모먼트 폴리시 랩",
    preserve: ["라이트 페이퍼 테마", "12 원칙 카드 그리드", "라이브 데모 토글", "큐 스트립·진행 바", "적용 바"],
  },
  {
    id: "memory-window-composer-v2",
    sourceFile: "lovetree-memory-window-composer-v2.html",
    route: "/v4/labs/memory/window-composer",
    role: "메모리 윈도우 컴포저 v2",
    preserve: ["글래스모피즘 다크 에디터", "코너 드래그 투명 변형", "배경·모먼트 선택", "스타일 모드 독", "프리셋·툴바"],
  },
] as const;

export const V4_LAB_SOURCE_COUNT = V4_LAB_SOURCE_REGISTRY.length;
