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
  | "lineage-intake"
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
  route?: string;
  status: DesignCandidateStatus;
  origin: DesignCandidateOrigin;
  kind: DesignVariantKind;
  lineageId?: string;
  revisionId?: string;
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

export const LINEAGE_INTAKE_CANDIDATES: readonly DesignCandidate[] = [
  {
    id: "lineage:48-01-v1-cinematic-baseline",
    label: "48 V1 First Cinematic Baseline",
    scenarioId: "cinematic-brand",
    status: "mapped",
    origin: "lineage-intake",
    kind: "experience",
    lineageId: "lt-48-neon-pilot",
    revisionId: "48-01",
    sourceFile: "01_V1_최초시네마틱_원형_바로보기.html",
    role: "48 Neon Pilot 계보의 최초 시네마틱 원형이자 현재 fallback/비교 기준 Variant",
    preserve: [
      "aggressive cinematic rhythm",
      "unpredictable visual shock",
      "V1 baseline composition and motion",
    ],
    notes: "48 추가 revision 제작은 중단됐습니다. 01 V1을 실행 가능한 기준 원본으로 보존하되 아직 저장소 React route로 포팅하지 않습니다.",
  },
  {
    id: "lineage:52-v3-reference-earth-orbit",
    label: "52 V3 Reference Earth Orbit",
    scenarioId: "relationship-retrospective",
    status: "mapped",
    origin: "lineage-intake",
    kind: "experience",
    lineageId: "lt-52-global-moment-orbit",
    revisionId: "52-v3-reference-earth-orbit",
    sourceFile: "lovetree-52-v3-reference-earth-orbit.html",
    role: "Earth를 중심으로 Moment node와 luminous Connection arc를 탐색하는 reference-first 3D orbit 후보",
    preserve: [
      "Earth spatial anchor",
      "slow orbit/yaw/dolly camera",
      "front/back arc occlusion",
      "moving connection pulse",
      "surface Moment node activation",
      "desktop drag / mobile swipe",
    ],
    notes: "Drive 실행 원본은 존재하지만 아직 저장소 React route로 포팅하지 않았습니다. 원본 충실도 분석 후 route를 부여합니다.",
  },
  {
    id: "lineage:57-v2-reactive-character-lubt",
    label: "57 V2 Reactive Character + Lubt",
    scenarioId: "people-archive",
    route: "/design-lab/lineages/57/v2",
    status: "implemented",
    origin: "lineage-intake",
    kind: "experience",
    lineageId: "lt-57-living-character-world",
    revisionId: "57-v2-reactive-character-lubt",
    sourceFile: "07_LoveTree_Living_Character_World_V2/index.html + living-world-v2.css + living-world-v2.js",
    role: "Person/Subject representation의 감정 반응과 Lubt Memory Guide의 문맥 응답을 검토하는 V1-base + V2-overlay native candidate",
    preserve: [
      "V1 three-column character / stage / Emotion Engine composition",
      "four original source subject characters and twelve expression states",
      "hover/single/double/hold character reaction controller",
      "Lubt contextual response and draggable auto-return companion",
      "SAY/Enter → TALK → Lubt reply chain",
      "source-labelled SECRET MOMENT as non-canonical review copy",
    ],
    notes: "PARTIAL IMPLEMENT. SOURCE DELTA mobile parity/accessibility/reduced-motion hardening is explicit. SAVE is non-persistent. Visual source-fidelity remains blocked by EXACT_CHARACTER_ASSET_TRANSFER_HOLD until 54/54 exact binaries land.",
  },
] as const;

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
  ...LINEAGE_INTAKE_CANDIDATES,
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
    if (candidate.route && !candidate.route.startsWith("/")) {
      problems.push(`route must start with '/': ${candidate.id} -> ${candidate.route}`);
    }
    if (candidate.status === "implemented" && !candidate.route) {
      problems.push(`implemented candidate must have a route: ${candidate.id}`);
    }
    if ((candidate.origin === "sibling-html" || candidate.origin === "lineage-intake") && !candidate.sourceFile) {
      problems.push(`source-backed candidate must include sourceFile: ${candidate.id}`);
    }
    if ((candidate.lineageId && !candidate.revisionId) || (!candidate.lineageId && candidate.revisionId)) {
      problems.push(`lineageId and revisionId must be supplied together: ${candidate.id}`);
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
