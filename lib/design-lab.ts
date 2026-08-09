import {
  V4_SOURCE_MANIFEST,
  type V4SourceEntry,
} from "../app/components/v4/v4-source-manifest";

export type ProductFamilyId = "legacy" | "next";

export type DesignScenarioId =
  | "historical-baseline"
  | "entry-onboarding"
  | "tree-workspace"
  | "relationship-retrospective"
  | "people-archive"
  | "community"
  | "growth-milestones"
  | "cinematic-brand";

export type DesignCandidateStatus =
  | "received"
  | "mapped"
  | "implemented"
  | "validated"
  | "shortlisted"
  | "selected"
  | "superseded";

export type DesignCandidateOrigin =
  | "sibling-html"
  | "historical-route"
  | "integrated-experience";

export type DesignVariantKind = "screen" | "mechanic" | "experience" | "historical";

export interface ProductFamily {
  id: ProductFamilyId;
  label: string;
  route: string;
  description: string;
}

export interface DesignScenario {
  id: DesignScenarioId;
  label: string;
  description: string;
  order: number;
}

export interface DesignCandidate {
  id: string;
  label: string;
  scenarioId: DesignScenarioId;
  route: string;
  status: DesignCandidateStatus;
  origin: DesignCandidateOrigin;
  kind: DesignVariantKind;
  sourceFile?: string;
  role?: string;
  preserve?: readonly string[];
  notes?: string;
}

export const PRODUCT_FAMILIES: readonly ProductFamily[] = [
  {
    id: "legacy",
    label: "Legacy LoveTree",
    route: "/legacy",
    description: "처음 구현한 LoveTree. 기능·UX 비교를 위한 기준 제품으로 그대로 보존합니다.",
  },
  {
    id: "next",
    label: "Next LoveTree",
    route: "/v4",
    description: "새로운 디자인 후보를 공통 Auth·API·DB·Tree·Moment 기능 위에서 검증하고 조합하는 차세대 제품입니다.",
  },
] as const;

export const DESIGN_SCENARIOS: readonly DesignScenario[] = [
  {
    id: "historical-baseline",
    label: "Historical Baselines",
    description: "V2/V3 등 개발 과정의 비교 기준. 별도 제품군으로 취급하지 않고 참고용으로 보존합니다.",
    order: 0,
  },
  {
    id: "entry-onboarding",
    label: "Entry / Onboarding",
    description: "첫 진입, 트리 이름, 첫 발견, 감정 기록, 다음 순간 연결까지의 후보 경험입니다.",
    order: 10,
  },
  {
    id: "tree-workspace",
    label: "Tree Workspace / Lifecycle",
    description: "일상 성장 작업공간, 추가, 휴식, 복귀, 공개 상태를 다루는 후보입니다.",
    order: 20,
  },
  {
    id: "relationship-retrospective",
    label: "Graph / Timeline / Retrospective",
    description: "관계 그래프, 지도, 성운, 타임라인, 대규모 회고를 비교합니다.",
    order: 30,
  },
  {
    id: "people-archive",
    label: "People / Archive",
    description: "사람별 앨범과 Motion, Orbit, Accordion, Folding, Bookshelf 계열 후보입니다.",
    order: 40,
  },
  {
    id: "community",
    label: "Community",
    description: "공개 트리 검색, 비교, 미리보기, 전체 트리 탐색 후보입니다.",
    order: 50,
  },
  {
    id: "growth-milestones",
    label: "Milestones / 300+ Growth",
    description: "300번째 순간, Aurora, Canopy, Bloom, 300+ 자유 성장과 시즌 아카이브 후보입니다.",
    order: 60,
  },
  {
    id: "cinematic-brand",
    label: "Cinematic / Brand",
    description: "브랜드 필름과 시네마틱 진입 경험을 비교하는 독립 후보 영역입니다.",
    order: 70,
  },
] as const;

function scenarioForArea(area: V4SourceEntry["area"]): DesignScenarioId {
  switch (area) {
    case "onboarding":
      return "entry-onboarding";
    case "workspace":
    case "lifecycle":
      return "tree-workspace";
    case "graph":
      return "relationship-retrospective";
    case "people":
    case "archive":
      return "people-archive";
    case "community":
      return "community";
    case "milestone":
      return "growth-milestones";
  }
}

function candidateKind(entry: V4SourceEntry): DesignVariantKind {
  if (entry.id === "growing-tree-v5-draggable-notes") return "mechanic";
  if (entry.area === "archive" || entry.area === "milestone") return "experience";
  return "screen";
}

export const SIBLING_SOURCE_CANDIDATES: readonly DesignCandidate[] = V4_SOURCE_MANIFEST.map(
  (entry) => ({
    id: `source:${entry.id}`,
    label: entry.role,
    scenarioId: scenarioForArea(entry.area),
    route: entry.route,
    status: entry.status === "implemented" ? "implemented" : "mapped",
    origin: "sibling-html",
    kind: candidateKind(entry),
    sourceFile: entry.sourceFile,
    role: entry.role,
    preserve: entry.preserve,
  }),
);

export const HISTORICAL_CANDIDATES: readonly DesignCandidate[] = [
  {
    id: "historical:v2",
    label: "V2 visual / interaction baseline",
    scenarioId: "historical-baseline",
    route: "/v2",
    status: "implemented",
    origin: "historical-route",
    kind: "historical",
    notes: "비교용 기술 스냅샷입니다. 제품군은 Legacy/Next 두 개만 유지합니다.",
  },
  {
    id: "historical:v3",
    label: "V3 storyboard / shell baseline",
    scenarioId: "historical-baseline",
    route: "/v3",
    status: "implemented",
    origin: "historical-route",
    kind: "historical",
    notes: "비교용 기술 스냅샷입니다. 최종 선택 전까지 삭제하지 않습니다.",
  },
] as const;

export const INTEGRATED_EXPERIENCE_CANDIDATES: readonly DesignCandidate[] = [
  {
    id: "experience:v4-cinematic",
    label: "V4 Cinematic / International",
    scenarioId: "cinematic-brand",
    route: "/v4/cinematic",
    status: "implemented",
    origin: "integrated-experience",
    kind: "experience",
    notes: "현재 통합된 시네마틱 후보. 다른 시네마틱 디자인이 오면 같은 시나리오에 Variant로 추가합니다.",
  },
] as const;

export const DESIGN_CANDIDATES: readonly DesignCandidate[] = [
  ...HISTORICAL_CANDIDATES,
  ...SIBLING_SOURCE_CANDIDATES,
  ...INTEGRATED_EXPERIENCE_CANDIDATES,
];

export function validateDesignCandidateRegistry(
  candidates: readonly DesignCandidate[] = DESIGN_CANDIDATES,
): readonly string[] {
  const problems: string[] = [];
  const scenarioIds = new Set(DESIGN_SCENARIOS.map((scenario) => scenario.id));
  const ids = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate.id.trim()) problems.push("candidate id must not be empty");
    if (ids.has(candidate.id)) problems.push(`duplicate candidate id: ${candidate.id}`);
    ids.add(candidate.id);

    if (!scenarioIds.has(candidate.scenarioId)) {
      problems.push(`unknown scenario '${candidate.scenarioId}' for ${candidate.id}`);
    }
    if (!candidate.route.startsWith("/")) {
      problems.push(`route must start with '/': ${candidate.id} -> ${candidate.route}`);
    }
    if (candidate.origin === "sibling-html" && !candidate.sourceFile) {
      problems.push(`sibling HTML candidate must include sourceFile: ${candidate.id}`);
    }
  }

  return problems;
}

export function registerDesignCandidate(
  candidate: DesignCandidate,
  current: readonly DesignCandidate[] = DESIGN_CANDIDATES,
): readonly DesignCandidate[] {
  const next = [...current, candidate];
  const problems = validateDesignCandidateRegistry(next);
  if (problems.length > 0) {
    throw new Error(`invalid design candidate registry: ${problems.join("; ")}`);
  }
  return next;
}

export function candidatesByScenario(
  candidates: readonly DesignCandidate[] = DESIGN_CANDIDATES,
): ReadonlyMap<DesignScenarioId, readonly DesignCandidate[]> {
  const grouped = new Map<DesignScenarioId, DesignCandidate[]>();
  for (const scenario of DESIGN_SCENARIOS) grouped.set(scenario.id, []);
  for (const candidate of candidates) grouped.get(candidate.scenarioId)?.push(candidate);
  return grouped;
}
